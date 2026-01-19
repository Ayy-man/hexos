'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LocationTag } from '@/components/ui/location-tag'
import { MapPin, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { updateLocationAction } from '../actions/settingsActions'

// Common timezones for the dropdown
const TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'PST', label: 'PST (Pacific Standard Time)' },
  { value: 'MST', label: 'MST (Mountain Standard Time)' },
  { value: 'CST', label: 'CST (Central Standard Time)' },
  { value: 'EST', label: 'EST (Eastern Standard Time)' },
  { value: 'GMT', label: 'GMT (Greenwich Mean Time)' },
  { value: 'CET', label: 'CET (Central European Time)' },
  { value: 'IST', label: 'IST (India Standard Time)' },
  { value: 'JST', label: 'JST (Japan Standard Time)' },
  { value: 'AEST', label: 'AEST (Australian Eastern Time)' },
  { value: 'PKT', label: 'PKT (Pakistan Standard Time)' },
  { value: 'GST', label: 'GST (Gulf Standard Time)' },
]

interface LocationSettingsProps {
  currentCity?: string | null
  currentCountry?: string | null
  currentTimezone?: string | null
}

export function LocationSettings({
  currentCity,
  currentCountry,
  currentTimezone,
}: LocationSettingsProps) {
  const [city, setCity] = useState(currentCity || '')
  const [country, setCountry] = useState(currentCountry || '')
  const [timezone, setTimezone] = useState(currentTimezone || 'UTC')
  const [isPending, startTransition] = useTransition()

  const hasLocation = city && country

  const handleSave = () => {
    startTransition(async () => {
      try {
        await updateLocationAction({
          city: city || null,
          country: country || null,
          timezone: timezone || null,
        })
        toast.success('Location updated')
      } catch (error) {
        toast.error('Failed to update location')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Location
        </CardTitle>
        <CardDescription>
          Let your team know where you're working from
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Preview */}
        {hasLocation && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Preview:</span>
            <LocationTag city={city} country={country} timezone={timezone} />
          </div>
        )}

        {/* Form */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              placeholder="San Francisco"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              placeholder="USA"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <select
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.value}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Location'
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
