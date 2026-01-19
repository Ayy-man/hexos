import { redirect } from 'next/navigation'
import { requireAuth, getProfile } from '@/lib/auth/guards'

export default async function PulsePage() {
  await requireAuth()
  const profile = await getProfile()

  if (!profile) {
    redirect('/login')
  }

  if (!['admin', 'internal'].includes(profile.role)) {
    redirect('/dashboard')
  }

  return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-zinc-100">Pulse</h1>
        <p className="mt-2 text-zinc-500">Coming soon</p>
      </div>
    </div>
  )
}
