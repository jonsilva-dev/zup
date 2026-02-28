'use server'

import { createClient as createSupabaseClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function updateClientAction(id: string, data: any) {
    const supabase = await createSupabaseClient()

    const updatePayload = {
        type: data.type,
        name: data.name,
        razao_social: data.razao_social,
        document: data.document,
        ie: data.ie,
        email: data.email,
        whatsapp: data.whatsapp,
        address_zip: data.address_zip,
        address_street: data.address_street,
        address_number: data.address_number,
        address_district: data.address_district,
        address_city: data.address_city,
        address_state: data.address_state,
        due_day: data.due_day ? Number(data.due_day) : null
    }

    const { error } = await supabase.from('clients').update(updatePayload).eq('id', id)

    if (error) {
        console.error("Error updating client", error)
        let errorMessage = "Erro ao atualizar cliente. Tente novamente."
        if (error.message) {
            errorMessage = `Erro do banco de dados: ${error.message}`
        }
        throw new Error(errorMessage)
    }

    // Replace-all Strategy for Prices
    await supabase.from('client_product_prices').delete().eq('client_id', id)
    if (data.products && Array.isArray(data.products) && data.products.length > 0) {
        const pricesToInsert = data.products.map((p: any) => ({
            client_id: id,
            product_id: p.id,
            price: p.price
        }))
        await supabase.from('client_product_prices').insert(pricesToInsert)
    }

    // Replace-all Strategy for Schedules
    await supabase.from('delivery_schedules').delete().eq('client_id', id)
    if (data.schedule && typeof data.schedule === 'object') {
        const schedulesToInsert: any[] = []
        Object.keys(data.schedule).forEach((dayStr) => {
            const dayOfWeek = parseInt(dayStr)
            const productsForDay = data.schedule[dayStr]

            if (productsForDay && typeof productsForDay === 'object') {
                Object.keys(productsForDay).forEach((productId) => {
                    const quantity = productsForDay[productId]
                    if (quantity > 0) {
                        schedulesToInsert.push({
                            client_id: id,
                            day_of_week: dayOfWeek,
                            product_id: productId,
                            quantity: quantity
                        })
                    }
                })
            }
        })

        if (schedulesToInsert.length > 0) {
            await supabase.from('delivery_schedules').insert(schedulesToInsert)
        }
    }

    revalidatePath(`/pessoas/cliente/${id}`)
    revalidatePath('/pessoas')
    revalidatePath('/pessoas', 'layout')
    redirect('/pessoas')
}

export async function deleteClientAction(id: string) {
    const supabase = await createSupabaseClient()

    const { error } = await supabase.from('clients').delete().eq('id', id)

    if (error) {
        console.error("Error deleting client", error)
        throw new Error("Erro ao excluir cliente.")
    }

    revalidatePath('/pessoas')
    redirect('/pessoas')
}
