import { requireAuth } from '@/lib/auth/guards'
import { getCurrentProfile } from '@/lib/api/profiles'
import { ProfileSettingsForm } from '@/features/settings/components/ProfileSettingsForm'

export default async function ProfileSettingsPage() {
  await requireAuth()
  const profile = await getCurrentProfile()

  if (!profile) {
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">
          Manage your personal information and how others see you
        </p>
      </div>

      <ProfileSettingsForm profile={profile} />
    </div>
  )
}
