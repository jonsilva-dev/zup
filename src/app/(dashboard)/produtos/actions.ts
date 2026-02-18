'use server'

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

const productSchema = z.object({
    name: z.string().min(2, "Nome é obrigatório"),
    code: z.string().optional(),
    unit: z.enum(["KG", "UN"]),
    cost_price: z.coerce.number().min(0, "Preço deve ser positivo"),
    ncm: z.string().optional(),
    csosn_cst: z.string().optional(),
    cfop: z.string().optional(),
    icms_base: z.coerce.number().optional(),
    icms_value: z.coerce.number().optional(),
    ipi_value: z.coerce.number().optional(),
    icms_rate: z.coerce.number().optional(),
    ipi_rate: z.coerce.number().optional(),
})

export type ProductFormValues = z.infer<typeof productSchema>

export async function updateProduct(id: string, data: ProductFormValues) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('products')
        .update(data)
        .eq('id', id)

    if (error) {
        throw new Error('Failed to update product')
    }

    revalidatePath('/produtos')
    revalidatePath(`/produtos/${id}`)
    redirect('/produtos')
}

export async function deleteProduct(id: string) {
    const supabase = await createClient()

    // 1. Clean up client references (JSONB columns)
    const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, custom_prices, delivery_schedule')

    if (clientsError) {
        console.error("Error fetching clients for cleanup:", clientsError)
        throw new Error("Failed to fetch clients for cleanup")
    }

    if (clients && clients.length > 0) {
        const updates = clients.map((client: any) => {
            let modified = false;

            // Cleanup custom_prices
            let newCustomPrices = client.custom_prices
            if (Array.isArray(newCustomPrices)) {
                const filtered = newCustomPrices.filter((p: any) => p.id !== id)
                if (filtered.length !== newCustomPrices.length) {
                    newCustomPrices = filtered
                    modified = true
                }
            }

            // Cleanup delivery_schedule
            let newSchedule = client.delivery_schedule
            // Deep copy to avoid mutating original if we were just iterating (though here we map)
            // But client.delivery_schedule is from reference. 
            // In map we can create new object.
            if (newSchedule && typeof newSchedule === 'object') {
                // Create a shallow copy of the days structure
                newSchedule = { ...newSchedule }
                Object.keys(newSchedule).forEach(day => {
                    if (newSchedule[day] && newSchedule[day][id] !== undefined) {
                        // Create copy of the day object before deleting
                        newSchedule[day] = { ...newSchedule[day] }
                        delete newSchedule[day][id]
                        modified = true
                    }
                })
            }

            if (modified) {
                return {
                    id: client.id,
                    custom_prices: newCustomPrices,
                    delivery_schedule: newSchedule
                }
            }
            return null
        }).filter(Boolean) as { id: string, custom_prices: any, delivery_schedule: any }[]

        // Perform updates in parallel
        await Promise.all(updates.map(update =>
            supabase.from('clients').update({
                custom_prices: update.custom_prices,
                delivery_schedule: update.delivery_schedule
            }).eq('id', update.id)
        ))
    }

    // 2. Delete the product
    const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)

    if (error) {
        throw new Error('Failed to delete product')
    }

    revalidatePath('/produtos')
    redirect('/produtos')
}
