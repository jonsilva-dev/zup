'use server'

import { createClient } from "@/utils/supabase/server"

export async function getRecentDeliveries(offset: number = 0, limit: number = 10, month?: string) {
    const supabase = await createClient()

    let query = supabase
        .from('deliveries')
        .select(`
            id,
            date,
            total_sales,
            deliverer_id,
            profiles:deliverer_id (
                name
            )
        `, { count: 'exact' })

    // Filter by month if provided (YYYY-MM)
    if (month) {
        // "2026-02" -> start: "2026-02-01", end: "2026-02-28/29"
        // Easier: check if date starts with "YYYY-MM"
        // Or using gte/lte logic
        const [year, monthNum] = month.split('-')
        const startDate = `${month}-01`
        // Calculate end date by going to next month day 0
        const endDate = new Date(parseInt(year), parseInt(monthNum), 0).toISOString().split('T')[0]

        query = query.gte('date', startDate).lte('date', endDate)
    }

    const { data, error, count } = await query
        .order('date', { ascending: false })
        .order('id', { ascending: false }) // Secondary sort for deterministic order
        .range(offset, offset + limit - 1)

    if (error) {
        console.error("Error fetching recent deliveries:", error)
        throw new Error("Erro ao buscar entregas recentes.")
    }

    const deliveries = data.map((d: any) => {
        // Parse "YYYY-MM-DD" directly to avoid UTC timezone shift
        const [year, month, day] = d.date.split('-')
        const formattedDate = `${day}/${month}/${year}`

        return {
            id: d.id,
            date: formattedDate,
            deliverer: d.profiles?.name || 'Desconhecido',
            total: d.total_sales
        }
    })

    const hasMore = (count || 0) > (offset + limit)

    return {
        deliveries,
        hasMore
    }
}

export async function getDashboardStats(month?: string) {
    const supabase = await createClient()

    let query = supabase
        .from('deliveries')
        .select('date, total_sales, total_cost')
        .order('date', { ascending: true })

    if (month) {
        const [year, monthNum] = month.split('-')
        const startDate = `${month}-01`
        const endDate = new Date(parseInt(year), parseInt(monthNum), 0).toISOString().split('T')[0]
        query = query.gte('date', startDate).lte('date', endDate)
    }

    const { data: deliveries, error } = await query

    if (error) {
        console.error("Error fetching dashboard stats:", error)
        throw new Error("Erro ao buscar estatísticas.")
    }

    // Calculate Summary
    const summary = deliveries.reduce((acc, curr) => {
        return {
            costs: acc.costs + (curr.total_cost || 0),
            sales: acc.sales + (curr.total_sales || 0),
            result: acc.result + ((curr.total_sales || 0) - (curr.total_cost || 0))
        }
    }, { costs: 0, sales: 0, result: 0 })

    // Calculate Chart Data
    // If specific month: Group by Day (1, 2, ..., 31)
    // If all time (no month arg - though current usage will likely always pass month): Group by Month

    // HOWEVER, the requirement is "dashboard must reflect selected month". 
    // So distinct logic:
    // Case 1 (Month Selected): X-Axis = Days of Month.
    // Case 2 (No Month - rare/default?): Current logic (Group by Month).

    // Just to be safe, if we have a filtered month, show days.

    const chartMap = new Map<string, { sales: number, cost: number, sortKey: string }>()

    deliveries.forEach((d: any) => {
        const [year, m, day] = d.date.split('-')

        let label: string
        let sortKey: string

        if (month) {
            // Daily View: "01", "02"... or "Dia 01"
            label = day
            sortKey = day
        } else {
            // Existing Monthly View
            // Create date object with T12:00:00 to avoid timezone issues when getting month name
            const dateObj = new Date(parseInt(year), parseInt(m) - 1, parseInt(day), 12, 0, 0)
            const monthYear = dateObj.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }) // "fev/26"
            label = monthYear.charAt(0).toUpperCase() + monthYear.slice(1)
            sortKey = `${year}-${m}`
        }

        const current = chartMap.get(label) || { sales: 0, cost: 0, sortKey }

        chartMap.set(label, {
            sales: current.sales + (d.total_sales || 0),
            cost: current.cost + (d.total_cost || 0),
            sortKey
        })
    })

    // Convert Map to Array and Sort
    const chartData = Array.from(chartMap.entries())
        .map(([name, values]) => ({
            name,
            sales: values.sales,
            cost: values.cost,
            sortKey: values.sortKey
        }))
        .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
        // Remove sortKey before returning
        .map(({ sortKey, ...rest }) => rest)

    // If empty for selected month, maybe fill with at least one empty entry?
    if (chartData.length === 0 && month) {
        // Just return empty array, or maybe generic placeholders? 
        // Recharts handles empty array fine usually, but let's leave it empty to show "no data" visually
    } else if (chartData.length === 0) {
        const today = new Date()
        const monthYear = today.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
        chartData.push({
            name: monthYear.charAt(0).toUpperCase() + monthYear.slice(1),
            sales: 0,
            cost: 0
        })
    }

    return {
        summary,
        chartData
    }
}

export async function getAvailableMonths() {
    const supabase = await createClient()

    // Get min and max date
    const { data, error } = await supabase
        .from('deliveries')
        .select('date')
        .order('date', { ascending: true })

    if (error || !data || data.length === 0) {
        // Fallback to current month if no data
        const now = new Date()
        const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        return { min: current, max: current }
    }

    const minDate = data[0].date // "YYYY-MM-DD"
    const maxDate = data[data.length - 1].date

    // Extract YYYY-MM
    return {
        min: minDate.substring(0, 7),
        max: maxDate.substring(0, 7)
    }
}

export async function getCurrentUser() {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
        return null
    }

    // Fetch profile for name
    const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single()

    return {
        ...user,
        name: profile?.name || user.email // Fallback to email if name is missing
    }
}
