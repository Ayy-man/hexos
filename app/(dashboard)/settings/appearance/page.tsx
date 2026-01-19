import { requireAuth } from '@/lib/auth/guards'
import { getCurrentProfile } from '@/lib/api/profiles'
import { AppearanceSettingsForm } from '@/features/settings/components/AppearanceSettingsForm'

export default async function AppearanceSettingsPage() {
  await requireAuth()
  const profile = await getCurrentProfile()

  if (!profile) {
    return null
  }

  // Parse UI preferences from profile
  const defaultPrefs = {
    compact_mode: false,
    default_project_view: 'list' as const,
    default_inquiry_view: 'board' as const,
  }

  const uiPreferences = (profile as unknown as { ui_preferences?: typeof defaultPrefs }).ui_preferences || defaultPrefs

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Appearance</h1>
        <p className="text-muted-foreground">
          Customize the look and feel of your workspace
        </p>
      </div>

      <AppearanceSettingsForm preferences={uiPreferences} />
    </div>
  )
}
