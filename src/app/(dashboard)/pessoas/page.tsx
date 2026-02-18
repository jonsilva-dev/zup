import { createClient } from "@/utils/supabase/server"
import { PeopleTabs } from "@/components/people-tabs"

export default async function PessoasPage() {
    const supabase = await createClient()

    const [{ data: clients }, { data: users }] = await Promise.all([
        supabase.from('clients').select('*').order('name'),
        supabase.from('profiles').select('*').order('name')
    ])

    return <PeopleTabs clients={clients || []} users={users || []} />
}
