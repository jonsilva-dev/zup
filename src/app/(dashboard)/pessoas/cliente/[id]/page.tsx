import { createClient } from "@/utils/supabase/server"
import { EditClientForm } from "./form"
import { notFound } from "next/navigation"

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    const [{ data: client }, { data: products }] = await Promise.all([
        supabase.from('clients').select(`
            *,
            client_product_prices (
                product_id,
                price
            ),
            delivery_schedules (
                day_of_week,
                product_id,
                quantity
            )
        `).eq('id', id).single(),
        supabase.from('products').select('*').order('name')
    ])

    if (!client) {
        notFound()
    }

    // Map relational data back to the structure expected by the form
    const custom_prices = client.client_product_prices?.map((p: any) => ({
        id: p.product_id,
        price: p.price
    })) || []

    const delivery_schedule: Record<string, Record<string, number>> = {}
    if (client.delivery_schedules) {
        client.delivery_schedules.forEach((s: any) => {
            if (!delivery_schedule[s.day_of_week]) {
                delivery_schedule[s.day_of_week] = {}
            }
            delivery_schedule[s.day_of_week][s.product_id] = s.quantity
        })
    }

    const clientForForm = {
        ...client,
        custom_prices,
        delivery_schedule
    }


    return <EditClientForm client={clientForForm as any} products={products || []} />
}
