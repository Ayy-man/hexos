'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { updateNotificationPreferencesAction } from '../actions/settingsActions'
import { toast } from 'sonner'
import {
  Bell,
  Mail,
  MessageSquare,
  Package,
  FileCheck,
  AtSign,
  CreditCard,
  FileText,
  Loader2,
  Smartphone,
} from 'lucide-react'
import type { UserRole } from '@/lib/auth/types'
import type { NotificationPreferences } from '@/lib/api/profiles'

interface NotificationSettingsFormProps {
  preferences: NotificationPreferences
  userRole: UserRole
}

interface NotificationCategory {
  key: keyof NotificationPreferences['in_app'] | keyof NotificationPreferences['email']
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  roles?: UserRole[]
}

const notificationCategories: NotificationCategory[] = [
  {
    key: 'project_updates',
    label: 'Project Updates',
    description: 'Status changes, phase transitions, and milestones',
    icon: Package,
  },
  {
    key: 'deliverable_completed',
    label: 'Deliverable Completed',
    description: 'When a deliverable is marked as done',
    icon: FileCheck,
  },
  {
    key: 'mentions',
    label: 'Mentions',
    description: 'When someone @mentions you in a conversation',
    icon: AtSign,
  },
  {
    key: 'direct_messages',
    label: 'Direct Messages',
    description: 'New messages in project conversations',
    icon: MessageSquare,
  },
  {
    key: 'inquiry_updates',
    label: 'Inquiry Updates',
    description: 'Stage changes and proposal updates',
    icon: FileText,
    roles: ['admin', 'internal', 'dfy'],
  },
  {
    key: 'payment_updates',
    label: 'Payment Updates',
    description: 'Invoice and payment notifications',
    icon: CreditCard,
    roles: ['admin', 'internal', 'dfy', 'client'],
  },
]

const emailOnlyCategories = [
  {
    key: 'weekly_digest' as const,
    label: 'Weekly Digest',
    description: 'Summary of your activity and updates',
    icon: Mail,
  },
]

export function NotificationSettingsForm({ preferences, userRole }: NotificationSettingsFormProps) {
  const [prefs, setPrefs] = useState<NotificationPreferences>(preferences)
  const [isPending, startTransition] = useTransition()
  const [hasChanges, setHasChanges] = useState(false)

  const updatePref = (
    channel: 'in_app' | 'email',
    key: string,
    value: boolean
  ) => {
    setPrefs((prev) => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        [key]: value,
      },
    }))
    setHasChanges(true)
  }

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateNotificationPreferencesAction(prefs)

      if (result.success) {
        toast.success('Notification preferences saved')
        setHasChanges(false)
      } else {
        toast.error(result.error || 'Failed to save preferences')
      }
    })
  }

  const filteredCategories = notificationCategories.filter(
    (cat) => !cat.roles || cat.roles.includes(userRole)
  )

  return (
    <div className="space-y-6">
      {/* Main Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Channels
          </CardTitle>
          <CardDescription>
            Choose which notifications you receive and how
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Header Row */}
          <div className="grid grid-cols-[1fr,80px,80px] gap-4 mb-4 pb-2 border-b">
            <div />
            <div className="text-center">
              <Badge variant="outline" className="gap-1">
                <Smartphone className="h-3 w-3" />
                In-App
              </Badge>
            </div>
            <div className="text-center">
              <Badge variant="outline" className="gap-1">
                <Mail className="h-3 w-3" />
                Email
              </Badge>
            </div>
          </div>

          {/* Notification Rows */}
          <div className="space-y-4">
            {filteredCategories.map((category) => {
              const Icon = category.icon
              const inAppKey = category.key as keyof NotificationPreferences['in_app']
              const emailKey = category.key as keyof NotificationPreferences['email']

              return (
                <div
                  key={category.key}
                  className="grid grid-cols-[1fr,80px,80px] gap-4 items-center py-2"
                >
                  <div className="flex items-start gap-3">
                    <Icon className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <Label className="font-medium">{category.label}</Label>
                      <p className="text-sm text-muted-foreground">
                        {category.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    {inAppKey in prefs.in_app && (
                      <Switch
                        checked={prefs.in_app[inAppKey]}
                        onCheckedChange={(checked) =>
                          updatePref('in_app', category.key, checked)
                        }
                      />
                    )}
                  </div>

                  <div className="flex justify-center">
                    {emailKey in prefs.email && (
                      <Switch
                        checked={prefs.email[emailKey]}
                        onCheckedChange={(checked) =>
                          updatePref('email', category.key, checked)
                        }
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Email-Only Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Preferences
          </CardTitle>
          <CardDescription>
            Additional email notification settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {emailOnlyCategories.map((category) => {
            const Icon = category.icon

            return (
              <div
                key={category.key}
                className="flex items-center justify-between py-2"
              >
                <div className="flex items-start gap-3">
                  <Icon className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <Label className="font-medium">{category.label}</Label>
                    <p className="text-sm text-muted-foreground">
                      {category.description}
                    </p>
                  </div>
                </div>

                <Switch
                  checked={prefs.email[category.key]}
                  onCheckedChange={(checked) =>
                    updatePref('email', category.key, checked)
                  }
                />
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* WhatsApp Preview */}
      <Card className="border-dashed">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                WhatsApp Notifications
              </CardTitle>
              <CardDescription>
                Receive critical updates via WhatsApp
              </CardDescription>
            </div>
            <Badge variant="secondary">Coming Soon</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Connect your phone number in your profile settings to receive
            urgent notifications via WhatsApp.
          </p>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isPending || !hasChanges}
          size="lg"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Preferences'
          )}
        </Button>
      </div>
    </div>
  )
}
