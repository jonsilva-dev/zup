import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl) {
        console.error("Error: NEXT_PUBLIC_SUPABASE_URL is missing")
    }
    if (!serviceRoleKey) {
        console.error("Error: SUPABASE_SERVICE_ROLE_KEY is missing")
    }

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error("Missing Supabase URL or Service Role Key via createAdminClient")
    }

    return createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
}
