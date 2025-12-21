import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/auth/guards'
import { DASHBOARD_ROUTES } from '@/lib/auth/types'

export default async function Home() {
  const profile = await getProfile()

  if (profile) {
    redirect(DASHBOARD_ROUTES[profile.role])
  } else {
    redirect('/login')
  }
}