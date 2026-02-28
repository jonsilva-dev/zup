'use server'

import { createClient as createSupabaseClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function createClientAction(data: any) {
    const supabase = await createSupabaseClient()

    // 1. Create Client
    const { data: newClient, error } = await supabase.from('clients').insert({
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
    }).select().single()

    if (error) {
        console.error("Error creating client", error)
        // Translate common errors or provide a generic message
        let errorMessage = "Erro ao criar cliente. Tente novamente."
        if (error.message) {
            errorMessage = `Erro do banco de dados: ${error.message}`
        }
        throw new Error(errorMessage)
    }

    if (newClient) {
        // 2. Insert Custom Prices into relational table
        if (data.products && Array.isArray(data.products) && data.products.length > 0) {
            const pricesToInsert = data.products.map((p: any) => ({
                client_id: newClient.id,
                product_id: p.id,
                price: p.price
            }))

            const { error: pricesError } = await supabase.from('client_product_prices').insert(pricesToInsert)
            if (pricesError) {
                console.error("Error creating client product prices", pricesError)
                // Depending on strictness, we might throw or just log. Logging for now to not break the main UX if just one child insert fails.
            }
        }

        // 3. Insert Delivery Schedule into relational table
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
                                client_id: newClient.id,
                                day_of_week: dayOfWeek,
                                product_id: productId,
                                quantity: quantity
                            })
                        }
                    })
                }
            })

            if (schedulesToInsert.length > 0) {
                const { error: scheduleError } = await supabase.from('delivery_schedules').insert(schedulesToInsert)
                if (scheduleError) {
                    console.error("Error creating delivery schedule", scheduleError)
                }
            }
        }
    }

    revalidatePath('/pessoas', 'layout')
    redirect('/pessoas')
}
