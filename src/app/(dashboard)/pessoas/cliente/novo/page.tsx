import { createClient } from "@/utils/supabase/server"
import { NewClientForm } from "./form"

export default async function NewClientPage() {
    const supabase = await createClient()
    const { data: products } = await supabase.from('products').select('*').order('name')

    return <NewClientForm products={products || []} />
}

