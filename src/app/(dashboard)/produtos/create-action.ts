'use server'

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { ProductFormValues } from "./actions"

export async function createProduct(data: ProductFormValues) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('products')
        .insert(data)

    if (error) {
        throw new Error('Failed to create product')
    }

    revalidatePath('/produtos')
    redirect('/produtos')
}
