'use server'

import { createClient as createSupabaseClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function updateClientAction(id: string, data: any) {
    const supabase = await createSupabaseClient()

    const { error } = await supabase.from('clients').update({
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
        delivery_schedule: data.schedule,
        custom_prices: data.products
    }).eq('id', id)

    if (error) {
        console.error("Error updating client", error)
        let errorMessage = "Erro ao atualizar cliente. Tente novamente."
        if (error.message) {
            errorMessage = `Erro do banco de dados: ${error.message}`
        }
        throw new Error(errorMessage)
    }

    revalidatePath('/pessoas')
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
