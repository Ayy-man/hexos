import { requireAuth } from '@/lib/auth/guards'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Construction } from 'lucide-react'

export default async function SettingsPage() {
  await requireAuth()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Construction className="h-5 w-5" />
            Coming Soon
          </CardTitle>
          <CardDescription>
            Settings functionality is currently being developed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This page will include account settings, notification preferences, and more.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
