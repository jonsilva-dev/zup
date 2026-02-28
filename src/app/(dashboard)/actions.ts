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
        .order('created_at', { ascending: false, nullsFirst: false }) // Secondary sort: newest first for same day
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

    // 1. Fetch Deliveries for Summary
    let summaryQuery = supabase
        .from('deliveries')
        .select('date, total_sales, total_cost')

    if (month) {
        const [year, monthNum] = month.split('-')
        const startDate = `${month}-01`
        const endDate = new Date(parseInt(year), parseInt(monthNum), 0).toISOString().split('T')[0]
        summaryQuery = summaryQuery.gte('date', startDate).lte('date', endDate)
    }

    const { data: deliveries, error: deliveriesError } = await summaryQuery

    if (deliveriesError) {
        console.error("Error fetching dashboard summary stats:", deliveriesError)
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

    // 2. Fetch Delivery Items for Chart (Revenue by Client)
    let itemsQuery = supabase
        .from('delivery_items')
        .select(`
            quantity,
            unit_price,
            deliveries!inner ( date ),
            clients ( name, razao_social )
        `)

    if (month) {
        const [year, monthNum] = month.split('-')
        const startDate = `${month}-01`
        const endDate = new Date(parseInt(year), parseInt(monthNum), 0).toISOString().split('T')[0]
        itemsQuery = itemsQuery.gte('deliveries.date', startDate).lte('deliveries.date', endDate)
    }

    const { data: items, error: itemsError } = await itemsQuery

    if (itemsError) {
        console.error("Error fetching dashboard chart stats:", itemsError)
        throw new Error("Erro ao buscar dados do gráfico.")
    }

    const chartMap = new Map<string, number>()

    items?.forEach((item: any) => {
        const clientName = item.clients?.name || item.clients?.razao_social || "Desconhecido"
        const revenue = (item.quantity || 0) * (item.unit_price || 0)

        const current = chartMap.get(clientName) || 0
        chartMap.set(clientName, current + revenue)
    })

    // Convert Map to Array, sort by revenue descending
    const chartData = Array.from(chartMap.entries())
        .map(([name, value]) => ({
            name,
            value
        }))
        .sort((a, b) => b.value - a.value)

    // Do not group small clients into "Outros" - keep one slice per client
    // (Requested by user)

    if (chartData.length === 0) {
        chartData.push({
            name: "Sem dados",
            value: 1 // Provide a small value so the donut renders a generic gray circle if we want, or handle in UI
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
