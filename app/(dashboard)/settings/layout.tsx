import { requireAuth } from '@/lib/auth/guards'
import { getCurrentProfile } from '@/lib/api/profiles'
import { SettingsSidebar } from '@/features/settings/components/SettingsSidebar'

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAuth()
  const profile = await getCurrentProfile()

  if (!profile) {
    return null
  }

  return (
    <div className="flex gap-8">
      {/* Sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <SettingsSidebar userRole={profile.role} />
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  )
}
