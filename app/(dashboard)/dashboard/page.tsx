import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DASHBOARD_ROUTES } from '@/lib/auth/types'
import type { UserRole } from '@/lib/auth/types'

export default async function DashboardRedirect() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError) {
    redirect('/login?error=' + encodeURIComponent('Auth: ' + authError.message))
  }

  if (!user) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError) {
    redirect('/login?error=' + encodeURIComponent('Profile: ' + profileError.message))
  }

  if (!profile) {
    redirect('/login?error=' + encodeURIComponent('No profile found'))
  }

  redirect(DASHBOARD_ROUTES[profile.role as UserRole])
}
