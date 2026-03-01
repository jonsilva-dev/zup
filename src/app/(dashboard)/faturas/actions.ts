'use server'

import { createClient } from "@/utils/supabase/server"
import { revalidatePath, unstable_noStore as noStore } from "next/cache"

export async function getInvoices(month: string) {
    noStore()
    const supabase = await createClient()

    const [year, monthNum] = month.split('-')
    const startDate = `${month}-01`
    const endDate = new Date(parseInt(year), parseInt(monthNum), 0).toISOString().split('T')[0]

    // 2. Fetch all clients
    const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, name')
        .order('name')

    if (clientsError) throw new Error("Erro ao buscar clientes.")

    // 3. Fetch delivery items joined with deliveries for the date range
    // We get delivery_id to count distinct visits
    const { data: items, error: itemsError } = await supabase
        .from('delivery_items')
        .select(`
            client_id,
            quantity,
            unit_price,
            delivery_id,
            deliveries!inner(
                date
            )
        `)
        .gte('deliveries.date', startDate)
        .lte('deliveries.date', endDate)

    if (itemsError) {
        console.error("Error fetching delivery items:", itemsError)
        throw new Error("Erro ao buscar itens de entrega.")
    }

    // 4. Fetch existing invoice statuses
    const { data: invoiceStatuses, error: statusError } = await supabase
        .from('monthly_invoices')
        .select('client_id, status, total')
        .eq('month', month)

    if (statusError) throw new Error("Erro ao buscar status das faturas.")

    // 5. Aggregate Data
    const clientStats = new Map<string, { total: number, deliveryIds: Set<string> }>()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items.forEach((item: any) => {
        // Fallback for nulls if necessary
        const price = Number(item.unit_price) || 0
        const qty = Number(item.quantity) || 0
        const total = price * qty

        if (!clientStats.has(item.client_id)) {
            clientStats.set(item.client_id, { total: 0, deliveryIds: new Set() })
        }

        const entry = clientStats.get(item.client_id)!
        entry.total += total
        if (item.delivery_id) {
            entry.deliveryIds.add(item.delivery_id)
        }
    })

    // 6. Build Result List
    const invoices = clients.map((client: any) => {
        const stats = clientStats.get(client.id)
        const statusRecord = invoiceStatuses?.find((s: any) => s.client_id === client.id)

        // Only include if there are deliveries OR there is an existing invoice record
        if (!stats && !statusRecord) return null

        return {
            id: client.id,
            name: client.name || "Cliente sem nome",
            total: stats ? stats.total : (statusRecord?.total || 0), // Use calculated total or stored total
            deliveryCount: stats ? stats.deliveryIds.size : 0,
            status: statusRecord?.status || 'open',
            month: month
        }
    }).filter((i): i is NonNullable<typeof i> => i !== null)

    return invoices
}

// ... (Rest of the file remains unchanged, need to ensure I don't delete it? No, write_to_file overwrites. 
// I must include the rest of the functions from previous read or replace them.)
// Since I used write_to_file with overwrite=true, I MUST include the other functions.

export async function getInvoiceDetails(clientId: string, month: string) {
    noStore()
    const supabase = await createClient()

    const [year, monthNum] = month.split('-')
    const startDate = `${month}-01`
    const endDate = new Date(parseInt(year), parseInt(monthNum), 0).toISOString().split('T')[0]

    // Fetch Client
    const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single()

    if (clientError) throw new Error("Cliente não encontrado.")

    // Fetch Delivery Items for this client in this range
    // We need to aggregate by delivery to show "Total per Delivery"
    // And also aggregate by product for the summary
    const { data: items, error: itemsError } = await supabase
        .from('delivery_items')
        .select(`
            quantity,
            unit_price,
            delivery_id,
            product_id,
            products (name),
            deliveries!inner(
                id,
                date,
                deliverer_id,
                profiles:deliverer_id (name)
            )
        `)
        .eq('client_id', clientId)
        .gte('deliveries.date', startDate)
        .lte('deliveries.date', endDate)
        .order('date', { foreignTable: 'deliveries', ascending: false })

    if (itemsError) {
        console.error(itemsError)
        throw new Error("Erro ao buscar entregas.")
    }

    // Aggregate items into deliveries and product summary
    const deliveryMap = new Map<string, {
        id: string,
        date: string,
        deliverer: string,
        total: number
    }>()

    const productMap = new Map<string, {
        id: string,
        name: string,
        quantity: number,
        total: number
    }>()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items.forEach((item: any) => {
        const d = item.deliveries
        const price = Number(item.unit_price) || 0
        const qty = Number(item.quantity) || 0
        const itemTotal = price * qty

        // Delivery Aggregation
        if (!deliveryMap.has(d.id)) {
            const [year, month, day] = d.date.split('-')
            deliveryMap.set(d.id, {
                id: d.id,
                date: `${day}/${month}/${year}`,
                deliverer: d.profiles?.name || 'Desconhecido',
                total: 0
            })
        }

        const delEntry = deliveryMap.get(d.id)!
        delEntry.total += itemTotal

        // Product Aggregation
        const prodId = item.product_id
        if (prodId) {
            if (!productMap.has(prodId)) {
                productMap.set(prodId, {
                    id: prodId,
                    name: item.products?.name || 'Produto Desconhecido',
                    quantity: 0,
                    total: 0
                })
            }
            const prodEntry = productMap.get(prodId)!
            prodEntry.quantity += qty
            prodEntry.total += itemTotal
        }
    })

    const formattedDeliveries = Array.from(deliveryMap.values()).sort((a, b) => {
        // Sort by date desc
        // Date format is DD/MM/YYYY, so we convert it to YYYY-MM-DD for comparison
        const aDate = a.date.split('/').reverse().join('-')
        const bDate = b.date.split('/').reverse().join('-')
        return bDate.localeCompare(aDate)
    })

    const productSummary = Array.from(productMap.values()).sort((a, b) => a.name.localeCompare(b.name))

    // Fetch Status
    const { data: invoiceStatus } = await supabase
        .from('monthly_invoices')
        .select('status, total')
        .eq('client_id', clientId)
        .eq('month', month)
        .single()

    // Calculate previous month string for comparison
    const numYear = parseInt(year)
    const numMonth = parseInt(monthNum)
    let prevYear = numYear
    let prevMonth = numMonth - 1
    if (prevMonth === 0) {
        prevMonth = 12
        prevYear -= 1
    }
    const previousMonthStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}`

    // Fetch previous month's total from history
    // First check monthly_invoices, if not found or 0, check delivery_items directly by date
    const prevStartDate = `${previousMonthStr}-01`
    const prevEndDate = new Date(prevYear, prevMonth, 0).toISOString().split('T')[0]

    let previousTotal = 0
    const { data: prevStatus } = await supabase
        .from('monthly_invoices')
        .select('total')
        .eq('client_id', clientId)
        .eq('month', previousMonthStr)
        .single()

    if (prevStatus && prevStatus.total) {
        previousTotal = prevStatus.total
    } else {
        // Fallback to calculating from delivery_items if no saved total was found
        const { data: prevItems } = await supabase
            .from('delivery_items')
            .select(`
                quantity,
                unit_price,
                deliveries!inner(date)
            `)
            .eq('client_id', clientId)
            .gte('deliveries.date', prevStartDate)
            .lte('deliveries.date', prevEndDate)

        if (prevItems) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            previousTotal = prevItems.reduce((acc, item: any) => acc + ((Number(item.unit_price) || 0) * (Number(item.quantity) || 0)), 0)
        }
    }

    // Total for month
    const totalSales = formattedDeliveries.reduce((acc, d) => acc + d.total, 0)

    return {
        client: {
            id: client.id,
            name: client.name,
            ...client
        },
        month: month, // YYYY-MM
        status: invoiceStatus?.status || 'open',
        total: totalSales,
        previousTotal: previousTotal, // Added for comparison
        deliveries: formattedDeliveries,
        productSummary
    }
}

export async function validateInvoice(clientId: string, month: string, total: number) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('monthly_invoices')
        .upsert({
            client_id: clientId,
            month: month,
            status: 'validated',
            total: total,
            updated_at: new Date().toISOString()
        }, { onConflict: 'client_id, month' })

    if (error) {
        console.error("Error validating invoice:", error)
        throw new Error("Erro ao validar fatura.")
    }

    revalidatePath(`/faturas/${clientId}`)
    revalidatePath(`/faturas`)
}

export async function getClientInvoiceHistory(clientId: string) {
    noStore()
    const supabase = await createClient()

    const { data: invoices } = await supabase
        .from('monthly_invoices')
        .select('month, total, status')
        .eq('client_id', clientId)
        .order('month', { ascending: false })

    // Also check delivery items distinct months?
    // Let's check distinct months from delivery_items (via deliveries)
    const { data: items } = await supabase
        .from('delivery_items')
        .select(`
            deliveries!inner(
                date
            )
        `)
        .eq('client_id', clientId)

    const monthSet = new Set<string>()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items?.forEach((item: any) => {
        const m = item.deliveries.date.substring(0, 7)
        monthSet.add(m)
    })

    const history = Array.from(monthSet).map(month => {
        const inv = invoices?.find(i => i.month === month)
        return {
            month,
            total: inv?.total || 0,
            status: inv?.status || 'open',
            isCalculated: !inv?.total
        }
    })

    return history.sort((a, b) => b.month.localeCompare(a.month))
}
