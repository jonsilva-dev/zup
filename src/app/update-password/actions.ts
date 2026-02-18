'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function updatePassword(formData: FormData) {
    const supabase = await createClient()

    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (password !== confirmPassword) {
        redirect('/update-password?message=Passwords do not match')
    }

    const { error } = await supabase.auth.updateUser({
        password: password
    })

    if (error) {
        redirect('/error?message=Could not update password')
    }

    redirect('/')
}
