import { createClient } from "@/utils/supabase/server"
import { UserForm } from "@/components/user-form"
import { notFound, redirect } from "next/navigation"

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function UserDetailsPage({ params }: PageProps) {
    const { id } = await params
    const supabase = await createClient()

    // 1. Get Requester (Current User)
    const { data: { user: requester }, error: requesterAuthError } = await supabase.auth.getUser()

    if (requesterAuthError || !requester) {
        redirect('/login')
    }

    const { data: requesterProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', requester.id)
        .single()

    // 2. Get Target User Profile
    const { data: targetProfile, error: targetError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()

    if (targetError || !targetProfile) {
        return notFound()
    }

    // 3. Determine Permissions
    const isOwner = requester.id === targetProfile.id
    const isAdmin = requesterProfile?.role === 'admin'

    // Logic: 
    // - Admin can edit everyone.
    // - Deliverer (non-admin) can only edit themselves.
    // - Deliverer viewing others -> View Only.

    let mode: 'edit' | 'view' = 'view'
    if (isAdmin || isOwner) {
        mode = 'edit'
    }

    // Specific field permissions
    const canEditRole = isAdmin
    // Admin can delete if it's not their own account (to avoid locking themselves out or just safety)
    const canDelete = isAdmin && !isOwner

    return (
        <UserForm
            initialData={{
                id: targetProfile.id,
                name: targetProfile.name,
                email: targetProfile.email,
                role: targetProfile.role as "admin" | "deliverer"
            }}
            mode={mode}
            canEditRole={canEditRole}
            canEditPassword={isOwner}
            canDelete={canDelete}
        />
    )
}
