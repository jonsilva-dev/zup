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

    // 1. Clean up relational tables references
    // If not using ON DELETE CASCADE, we delete them manually first.
    await Promise.all([
        supabase.from('client_product_prices').delete().eq('product_id', id),
        supabase.from('delivery_schedules').delete().eq('product_id', id)
    ])

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
