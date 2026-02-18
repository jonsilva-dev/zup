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
        // For simplicity storing schedule/prices as jsonb, ideally strictly relational
        delivery_schedule: data.schedule,
        custom_prices: data.products // storing product prices overrides here
    }).select().single()

    if (error) {
        console.error("Error creating client", error)
        // Translate common errors or provide a generic message
        let errorMessage = "Erro ao criar cliente. Tente novamente."
        if (error.message) {
            if (error.message.includes("custom_prices")) errorMessage = "Erro de configuração do banco: Coluna 'custom_prices' ausente."
            else errorMessage = `Erro do banco de dados: ${error.message}`
        }
        throw new Error(errorMessage)
    }

    revalidatePath('/pessoas')
    redirect('/pessoas')
}
