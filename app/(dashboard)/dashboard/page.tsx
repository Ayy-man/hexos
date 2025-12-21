import { getProfile } from '@/lib/auth/guards'
import { redirect } from 'next/navigation'
import { DASHBOARD_ROUTES } from '@/lib/auth/types'

export default async function DashboardRedirect() {
  const profile = await getProfile()

  if (!profile) {
    redirect('/login')
  }

  redirect(DASHBOARD_ROUTES[profile.role])
}
