'use client'

import { useState, useTransition } from 'react'
import { useTheme } from 'next-themes'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { updateUiPreferencesAction } from '../actions/settingsActions'
import { toast } from 'sonner'
import {
  Palette,
  Sun,
  Moon,
  Monitor,
  LayoutList,
  LayoutGrid,
  Loader2,
  Minimize2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UiPreferences } from '@/lib/api/profiles'

interface AppearanceSettingsFormProps {
  preferences: UiPreferences
}

export function AppearanceSettingsForm({ preferences }: AppearanceSettingsFormProps) {
  const { theme, setTheme } = useTheme()
  const [prefs, setPrefs] = useState<UiPreferences>(preferences)
  const [isPending, startTransition] = useTransition()
  const [hasChanges, setHasChanges] = useState(false)

  const updatePref = <K extends keyof UiPreferences>(key: K, value: UiPreferences[K]) => {
    setPrefs((prev) => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateUiPreferencesAction(prefs)

      if (result.success) {
        toast.success('Preferences saved')
        setHasChanges(false)
      } else {
        toast.error(result.error || 'Failed to save preferences')
      }
    })
  }

  const themes = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ]

  return (
    <div className="space-y-6">
      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Theme
          </CardTitle>
          <CardDescription>
            Choose your preferred color scheme
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {themes.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                  theme === value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <Icon className={cn(
                  'h-6 w-6',
                  theme === value ? 'text-primary' : 'text-muted-foreground'
                )} />
                <span className={cn(
                  'text-sm font-medium',
                  theme === value ? 'text-primary' : 'text-foreground'
                )}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Display Density */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Minimize2 className="h-5 w-5" />
            Display Density
          </CardTitle>
          <CardDescription>
            Adjust the spacing and size of interface elements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-2">
            <div>
              <Label className="font-medium">Compact Mode</Label>
              <p className="text-sm text-muted-foreground">
                Reduce spacing for a denser interface
              </p>
            </div>
            <Switch
              checked={prefs.compact_mode}
              onCheckedChange={(checked) => updatePref('compact_mode', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Default Views */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5" />
            Default Views
          </CardTitle>
          <CardDescription>
            Choose your preferred default view for lists
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Projects View */}
          <div className="space-y-3">
            <Label className="font-medium">Projects</Label>
            <RadioGroup
              value={prefs.default_project_view}
              onValueChange={(value) => updatePref('default_project_view', value as 'list' | 'board')}
              className="flex gap-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="list" id="project-list" />
                <Label
                  htmlFor="project-list"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <LayoutList className="h-4 w-4" />
                  List
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="board" id="project-board" />
                <Label
                  htmlFor="project-board"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <LayoutGrid className="h-4 w-4" />
                  Board
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Inquiries View */}
          <div className="space-y-3">
            <Label className="font-medium">Inquiries</Label>
            <RadioGroup
              value={prefs.default_inquiry_view}
              onValueChange={(value) => updatePref('default_inquiry_view', value as 'list' | 'board')}
              className="flex gap-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="list" id="inquiry-list" />
                <Label
                  htmlFor="inquiry-list"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <LayoutList className="h-4 w-4" />
                  List
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="board" id="inquiry-board" />
                <Label
                  htmlFor="inquiry-board"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <LayoutGrid className="h-4 w-4" />
                  Board
                </Label>
              </div>
            </RadioGroup>
          </div>
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
