import { createClient } from "@/utils/supabase/server"
import { DeliveryList, ClientDelivery, Product } from "./delivery-list"

interface EntregaPageProps {
    searchParams: Promise<{ date?: string }>
}

export default async function EntregaPage({ searchParams }: EntregaPageProps) {
    const supabase = await createClient()
    const { date: dateParam } = await searchParams

    // Fetch all products for reference
    const { data: allProducts } = await supabase.from('products').select('*')

    // Fetch all clients with their custom prices
    const { data: clients } = await supabase
        .from('clients')
        .select('*, client_product_prices(product_id, price)')

    if (!clients || !allProducts) {
        return <div>Erro ao carregar dados.</div>
    }

    // Determine selected date — default to today in BRT
    const todayBRT = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/').reverse().join('-')
    const selectedDate = dateParam || todayBRT

    // Get day of week (0=Sun…6=Sat) for the selected date
    // Using T12:00:00 to avoid timezone shifting the date
    const selectedDow = new Date(selectedDate + 'T12:00:00').getDay()

    // Find deliveries already made on selected date
    const { data: existingDeliveries } = await supabase
        .from('deliveries')
        .select('id')
        .eq('date', selectedDate)

    const deliveryIds = existingDeliveries?.map((d: any) => d.id) || []
    const deliveredClientIds = new Set<string>()

    if (deliveryIds.length > 0) {
        const { data: existingItems } = await supabase
            .from('delivery_items')
            .select('client_id')
            .in('delivery_id', deliveryIds)

        if (existingItems) {
            existingItems.forEach((item: any) => deliveredClientIds.add(item.client_id))
        }
    }

    // Load Schedules for the selected date's day of week
    // Same logic for both today and retroactive dates: filter by day_of_week
    const { data: rawSchedules, error: scheduleError } = await supabase
        .from('delivery_schedules')
        .select(`
            client_id,
            product_id,
            quantity,
            clients:client_id (
                id,
                name,
                razao_social,
                client_product_prices (
                    product_id,
                    price
                )
            ),
            products:product_id (
                id,
                name,
                unit,
                cost_price
            )
        `)
        .eq('day_of_week', selectedDow)

    if (scheduleError) {
        console.error("Error fetching schedules:", scheduleError)
        return <div>Erro ao carregar roteiro de entregas.</div>
    }

    // Count total scheduled clients before filtering (to distinguish "no schedule" vs "all done")
    const scheduledClientIds = new Set<string>()
    if (rawSchedules) {
        rawSchedules.forEach((s: any) => { if (s.client_id) scheduledClientIds.add(s.client_id) })
    }

    // Build the delivery list grouped by Client
    const deliveryMap = new Map<string, ClientDelivery>()

    if (rawSchedules) {
        rawSchedules.forEach((schedule: any) => {
            if (deliveredClientIds.has(schedule.client_id)) return
            if (!schedule.clients || !schedule.products) return

            if (!deliveryMap.has(schedule.client_id)) {
                deliveryMap.set(schedule.client_id, {
                    clientId: schedule.client_id,
                    clientName: schedule.clients.name || schedule.clients.razao_social || "Cliente sem nome",
                    products: []
                })
            }

            const clientGroup = deliveryMap.get(schedule.client_id)!

            let finalPrice = schedule.products.cost_price || 0
            const customPrices = schedule.clients?.client_product_prices
            if (customPrices && Array.isArray(customPrices)) {
                const customPriceRow = customPrices.find((cp: any) => cp.product_id === schedule.product_id)
                if (customPriceRow) {
                    finalPrice = customPriceRow.price
                }
            }

            clientGroup.products.push({
                id: schedule.product_id,
                name: schedule.products.name,
                quantity: schedule.quantity,
                unit: schedule.products.unit,
                price: finalPrice
            })
        })
    }

    const initialDeliveries: ClientDelivery[] = Array.from(deliveryMap.values())

    return (
        <DeliveryList
            key={selectedDate}
            initialDeliveries={initialDeliveries}
            allProducts={allProducts}
            allClients={clients}
            currentDate={selectedDate}
            scheduledCount={scheduledClientIds.size}
        />
    )
}
