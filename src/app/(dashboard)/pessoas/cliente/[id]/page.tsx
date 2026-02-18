import { createClient } from "@/utils/supabase/server"
import { EditClientForm } from "./form"
import { notFound } from "next/navigation"

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    const [{ data: client }, { data: products }] = await Promise.all([
        supabase.from('clients').select('*').eq('id', id).single(),
        supabase.from('products').select('*').order('name')
    ])

    if (!client) {
        notFound()
    }

    return <EditClientForm client={client} products={products || []} />
}
