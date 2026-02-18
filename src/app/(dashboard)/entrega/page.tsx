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

    // Filter clients and build delivery list
    const initialDeliveries: ClientDelivery[] = clients
        .filter(client => {
            // Check if client has a schedule for today
            return client.delivery_schedule && client.delivery_schedule[today]
        })
        .map(client => {
            const daysSchedule = client.delivery_schedule[today]
            const productIds = Object.keys(daysSchedule)

            const deliveryProducts = productIds.map(pid => {
                const product = allProducts.find(p => p.id === pid)
                const qty = daysSchedule[pid]

                // Determine price: Custom > Base
                // custom_prices is Record<string, number> where key is product id
                let price = 0
                if (product) {
                    price = product.price
                }

                // Check for custom price
                if (client.custom_prices) {
                    // The custom_prices structure might be an array or object depending on how we saved it
                    // Based on 'novo/form.tsx', it sends:
                    // products: selectedProducts.map(pid => ({ id, price }))
                    // So in DB it's likely a JSONB array of objects {id, price}
                    // OR it could be the Record if we changed it.
                    // looking at actions.ts: custom_prices: data.products -> which corresponds to the array version.

                    if (Array.isArray(client.custom_prices)) {
                        const custom = client.custom_prices.find((cp: any) => cp.id === pid)
                        if (custom) {
                            price = custom.price
                        }
                    }
                }

                if (!product) return null

                return {
                    id: pid,
                    name: product.name,
                    quantity: qty,
                    unit: product.unit,
                    price: price
                }
            }).filter(p => p !== null) as any[] // Filter out nulls

            return {
                clientId: client.id,
                clientName: client.name || client.razao_social || "Cliente sem nome",
                products: deliveryProducts
            }
        })
        .filter(d => d.products.length > 0) // Only include if there are valid products

    return <DeliveryList initialDeliveries={initialDeliveries} allProducts={allProducts} allClients={clients} />
}
