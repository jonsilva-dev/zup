'use server'

import { createClient as createSupabaseClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function createUserAction(data: any) {
    const supabase = await createSupabaseClient()

    console.log("Attempting to create user with:", { email: data.email, role: data.role, name: data.name })

    // 0. Verify requester is Admin
    const { data: { user: requester }, error: requesterError } = await supabase.auth.getUser()

    if (requesterError || !requester) {
        console.error("Unauthorized: Could not get requester user", requesterError)
        throw new Error("Unauthorized")
    }

    const { data: requesterProfile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', requester.id)
        .single()

    if (profileError || !requesterProfile || requesterProfile.role !== 'admin') {
        console.error("Unauthorized: Requester is not admin", { id: requester.id, role: requesterProfile?.role })
        throw new Error("Unauthorized: Only admins can create users")
    }

    console.log("Authorized Admin creating user:", { requesterId: requester.id, newEmail: data.email })

    // 1. Create User in Supabase Auth using Admin Client
    const supabaseAdmin = createAdminClient()

    // Check if we are unexpectedly on the client
    if (typeof window !== 'undefined') {
        console.error("DANGER: createAdminClient called on client side")
    }

    const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: {
            name: data.name,
            role: data.role
        }
    })

    if (error) {
        console.error("Supabase Admin Create User Error:", JSON.stringify(error, null, 2))
        // Check for specific error codes if possible
        if (error.message.includes("service_role")) {
            throw new Error("Server Configuration Error: Invalid Service Role Key")
        }
        throw new Error("Failed to create user: " + error.message)
    }

    console.log("User created successfully:", newUser)

    revalidatePath('/pessoas')
    redirect('/pessoas?tab=usuarios')
}
