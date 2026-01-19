import { requireAuth } from '@/lib/auth/guards'
import { getCurrentProfile } from '@/lib/api/profiles'
import { NotificationSettingsForm } from '@/features/settings/components/NotificationSettingsForm'

export default async function NotificationSettingsPage() {
  await requireAuth()
  const profile = await getCurrentProfile()

  if (!profile) {
    return null
  }

  // Parse notification preferences from profile
  const defaultPrefs = {
    in_app: {
      project_updates: true,
      deliverable_completed: true,
      mentions: true,
      direct_messages: true,
      inquiry_updates: true,
      payment_updates: true,
    },
    email: {
      project_updates: false,
      deliverable_completed: true,
      mentions: true,
      inquiry_updates: true,
      payment_updates: true,
      weekly_digest: false,
    },
  }

  const notificationPreferences = (profile as unknown as { notification_preferences?: typeof defaultPrefs }).notification_preferences || defaultPrefs

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground">
          Choose how and when you want to be notified
        </p>
      </div>

      <NotificationSettingsForm
        preferences={notificationPreferences}
        userRole={profile.role}
      />
    </div>
  )
}
