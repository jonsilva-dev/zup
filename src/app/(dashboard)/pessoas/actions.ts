'use server'

import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"
import { revalidatePath } from "next/cache"

export async function createUserAction(data: { name: string; email: string; role: string; password: string }) {
    try {
        const supabase = await createClient()

        // 0. Verify requester is Admin
        const { data: { user: requester }, error: requesterError } = await supabase.auth.getUser()

        if (requesterError || !requester) {
            console.error("Authentication failed:", requesterError)
            throw new Error("Unauthorized")
        }

        const { data: requesterProfile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', requester.id)
            .single()

        if (profileError) {
            console.error("Profile fetch error:", profileError)
        }

        if (!requesterProfile || requesterProfile.role !== 'admin') {
            console.error("Authorization failed:", { role: requesterProfile?.role })
            throw new Error("Unauthorized: Only admins can create users")
        }

        // 1. Create User in Supabase Auth using Admin Client
        const supabaseAdmin = createAdminClient()

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
            throw new Error("Failed to create user: " + error.message)
        }

        revalidatePath('/pessoas')
        return { success: true, user: newUser }
    } catch (error: any) {
        console.error("Create User Error:", error)
        // Ensure the error is thrown so the client catches it
        throw new Error(error.message || "An unexpected error occurred during user creation")
    }
}

export async function updateUserAction(data: { id: string; name: string; email: string; role: string; password?: string }) {
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()

    // 1. Verify Requester
    const { data: { user: requester }, error: requesterError } = await supabase.auth.getUser()
    if (requesterError || !requester) throw new Error("Unauthorized")

    const { data: requesterProfile } = await supabase.from('profiles').select('role').eq('id', requester.id).single()
    if (!requesterProfile) throw new Error("Profile not found")

    const isOwner = requester.id === data.id
    const isAdmin = requesterProfile.role === 'admin'

    // 2. Permission Check
    // Admin can edit anyone. Owner can edit self.
    if (!isAdmin && !isOwner) {
        throw new Error("Unauthorized: You do not have permission to edit this user")
    }

    // 3. Prepare Updates
    const profileUpdates: any = {
        name: data.name,
    }

    const authUpdates: any = {
        email: data.email,
        user_metadata: { name: data.name }
    }

    // Role update: Only Admin can change role
    // And usually users shouldn't change their own role to something else (security risk if they downgrade then get stuck, or upgrade)
    if (isAdmin) {
        profileUpdates.role = data.role
        authUpdates.user_metadata.role = data.role
    }

    // Password update: Only Owner can change their own password (based on requirements)
    if (isOwner && data.password && data.password.length >= 6) {
        authUpdates.password = data.password
    }

    // 4. Perform Updates
    // Update public.profiles (for app logic)
    const { error: profileDbError } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', data.id)

    if (profileDbError) throw new Error("Failed to update profile: " + profileDbError.message)

    // Update auth.users (for login and metadata)
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(data.id, authUpdates)

    if (authError) throw new Error("Failed to update auth user: " + authError.message)

    revalidatePath('/pessoas')
    revalidatePath(`/pessoas/usuario/${data.id}`)

    return { success: true }
}

export async function deleteUserAction(userId: string) {
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()

    // 1. Verify Requester is Admin
    const { data: { user: requester }, error: requesterError } = await supabase.auth.getUser()
    if (requesterError || !requester) throw new Error("Unauthorized")

    const { data: requesterProfile } = await supabase.from('profiles').select('role').eq('id', requester.id).single()

    if (!requesterProfile || requesterProfile.role !== 'admin') {
        throw new Error("Unauthorized: Only admins can delete users")
    }

    if (requester.id === userId) {
        throw new Error("Operation not allowed: You cannot delete your own account")
    }

    // 2. Unassign user from any deliveries (set deliverer_id to NULL) to avoid FK constraint violations
    const { error: unassignError } = await supabase
        .from('deliveries')
        .update({ deliverer_id: null })
        .eq('deliverer_id', userId)

    if (unassignError) {
        console.error("Error unassigning deliveries:", unassignError)
        throw new Error("Failed to unassign user's deliveries: " + unassignError.message)
    }

    // 3. Try to delete user profile (public schema) first to identify any other FK constraint issues
    const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)

    if (profileError) {
        console.error("Profile deletion error:", profileError)
        throw new Error("Cannot delete user: Associated data exists (likely in other tables). " + profileError.message)
    }

    // 4. Delete User (Auth schema)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (error) throw new Error("Failed to delete user: " + error.message)

    revalidatePath('/pessoas')
    return { success: true }
}
