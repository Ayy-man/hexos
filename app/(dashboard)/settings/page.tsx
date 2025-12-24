import { requireAuth } from '@/lib/auth/guards'
import { getCurrentProfile } from '@/lib/api/profiles'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LogoUpload } from '@/features/settings/components/LogoUpload'
import { User, Settings2 } from 'lucide-react'

export default async function SettingsPage() {
  await requireAuth()
  const profile = await getCurrentProfile()

  const isDfy = profile?.role === 'dfy'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      {/* Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile
          </CardTitle>
          <CardDescription>
            Your account information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <span className="text-sm text-muted-foreground">Name:</span>
            <span className="ml-2 font-medium">{profile?.name}</span>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Email:</span>
            <span className="ml-2 font-medium">{profile?.email}</span>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Role:</span>
            <span className="ml-2 font-medium capitalize">{profile?.role}</span>
          </div>
        </CardContent>
      </Card>

      {/* DFY-only: Logo Upload */}
      {isDfy && (
        <LogoUpload currentLogoUrl={profile?.logo_url || null} />
      )}

      {/* Future Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            More Settings
          </CardTitle>
          <CardDescription>
            Additional settings coming soon
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Notification preferences, theme settings, and more will be available here.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
