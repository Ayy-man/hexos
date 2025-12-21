'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DASHBOARD_ROUTES } from './types'

export async function signIn(formData: FormData): Promise<void> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    // For now, redirect back to login. Error handling can be improved with useFormState
    redirect('/login?error=' + encodeURIComponent(error.message))
  }

  // Get profile to determine dashboard
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .single()

  const dashboardRoute = profile ? DASHBOARD_ROUTES[profile.role as keyof typeof DASHBOARD_ROUTES] : '/dashboard/admin'

  redirect(dashboardRoute)
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
