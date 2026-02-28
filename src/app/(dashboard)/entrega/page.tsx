import { createClient } from "@/utils/supabase/server"
import { DeliveryList, ClientDelivery, Product } from "./delivery-list"

export default async function EntregaPage() {
    const supabase = await createClient()

    // Fetch all products for reference
    const { data: allProducts } = await supabase.from('products').select('*')

    // Fetch all clients
    const { data: clients } = await supabase.from('clients').select('*')

    if (!clients || !allProducts) {
        return <div>Erro ao carregar dados.</div>
    }

    // Get today's day of week (0 = Sunday, 1 = Monday, etc.)
    const today = new Date().getDay().toString()
    const todayStr = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/').reverse().join('-')

    // Find deliveries already made today
    const { data: todaysDeliveries } = await supabase
        .from('deliveries')
        .select('id')
        .eq('date', todayStr)

    const deliveryIds = todaysDeliveries?.map((d: any) => d.id) || []
    const deliveredClientIds = new Set<string>()

    if (deliveryIds.length > 0) {
        const { data: todayItems } = await supabase
            .from('delivery_items')
            .select('client_id')
            .in('delivery_id', deliveryIds)

        if (todayItems) {
            todayItems.forEach((item: any) => deliveredClientIds.add(item.client_id))
        }
    }

    // Load Schedules for today, along with related Client and Product and Product custom pricing
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
        .eq('day_of_week', parseInt(today))

    if (scheduleError) {
        console.error("Error fetching schedules:", scheduleError)
        return <div>Erro ao carregar roteiro de entregas.</div>
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

            // Find custom price specifically for this product
            let finalPrice = schedule.products.cost_price || 0
            const customPrices = schedule.clients?.client_product_prices
            if (customPrices && Array.isArray(customPrices)) {
                // PostgREST might return all custom prices for this client, find the matching product
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

    return <DeliveryList initialDeliveries={initialDeliveries} allProducts={allProducts} allClients={clients} />
}
