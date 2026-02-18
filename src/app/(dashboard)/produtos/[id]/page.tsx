
import { createClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"
import EditProductForm from "./form"

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function EditProductPage({ params }: PageProps) {
    const { id } = await params
    const supabase = await createClient()

    const { data: product } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single()

    if (!product) {
        return notFound()
    }

    return <EditProductForm product={product} />
}
