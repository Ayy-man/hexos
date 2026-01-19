'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { updateDevAvailabilityAction, updateProfileAction } from '../actions/settingsActions'
import { toast } from 'sonner'
import { Loader2, Clock, Calendar, Zap, User } from 'lucide-react'
import { cn } from '@/lib/utils'

type AvailabilityStatus = 'available' | 'busy' | 'unavailable' | 'away'

interface AvailabilityControlProps {
  currentStatus: AvailabilityStatus
  currentMessage: string | null
  devAvailability: {
    is_available: boolean
    available_hours_per_week: number
    max_concurrent_projects: number
    available_from: string | null
    available_until: string | null
    status_message: string | null
    auto_assign: boolean
  } | null
}

const statusOptions: {
  value: AvailabilityStatus
  label: string
  description: string
  color: string
  bgColor: string
}[] = [
  {
    value: 'available',
    label: 'Available',
    description: 'Open to new projects',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-500',
  },
  {
    value: 'busy',
    label: 'Busy',
    description: 'Near capacity, limited availability',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-500',
  },
  {
    value: 'unavailable',
    label: 'Unavailable',
    description: 'Not taking new projects',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-500',
  },
  {
    value: 'away',
    label: 'Away',
    description: 'On vacation or leave',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500',
  },
]

export function AvailabilityControl({
  currentStatus,
  currentMessage,
  devAvailability,
}: AvailabilityControlProps) {
  const [status, setStatus] = useState<AvailabilityStatus>(currentStatus)
  const [message, setMessage] = useState(currentMessage || '')
  const [hoursPerWeek, setHoursPerWeek] = useState(devAvailability?.available_hours_per_week || 40)
  const [maxProjects, setMaxProjects] = useState(devAvailability?.max_concurrent_projects || 5)
  const [autoAssign, setAutoAssign] = useState(devAvailability?.auto_assign ?? true)
  const [availableFrom, setAvailableFrom] = useState(devAvailability?.available_from || '')
  const [availableUntil, setAvailableUntil] = useState(devAvailability?.available_until || '')
  const [isPending, startTransition] = useTransition()
  const [hasChanges, setHasChanges] = useState(false)

  const handleStatusChange = (value: AvailabilityStatus) => {
    setStatus(value)
    setHasChanges(true)
  }

  const handleSave = () => {
    startTransition(async () => {
      // Update profile status
      const profileResult = await updateProfileAction({
        availability_status: status,
        availability_message: message.trim() || null,
      })

      if (!profileResult.success) {
        toast.error(profileResult.error || 'Failed to update status')
        return
      }

      // Update dev availability
      const availResult = await updateDevAvailabilityAction({
        is_available: status === 'available' || status === 'busy',
        available_hours_per_week: hoursPerWeek,
        max_concurrent_projects: maxProjects,
        auto_assign: autoAssign,
        available_from: availableFrom || null,
        available_until: availableUntil || null,
        status_message: message.trim() || null,
      })

      if (availResult.success) {
        toast.success('Availability updated')
        setHasChanges(false)
      } else {
        toast.error(availResult.error || 'Failed to update availability')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Status Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Availability Status
          </CardTitle>
          <CardDescription>
            Let your team know if you're available for new projects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={status}
            onValueChange={(value) => handleStatusChange(value as AvailabilityStatus)}
            className="grid grid-cols-2 gap-4"
          >
            {statusOptions.map((option) => (
              <div key={option.value}>
                <RadioGroupItem
                  value={option.value}
                  id={option.value}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={option.value}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border-2 p-4 cursor-pointer transition-all',
                    'peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5',
                    'hover:border-primary/50'
                  )}
                >
                  <div className={cn('h-3 w-3 rounded-full', option.bgColor)} />
                  <div>
                    <div className={cn('font-medium', status === option.value && option.color)}>
                      {option.label}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {option.description}
                    </div>
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>

          {/* Status Message */}
          <div className="mt-6 space-y-2">
            <Label htmlFor="status-message">Status Message (optional)</Label>
            <Input
              id="status-message"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value)
                setHasChanges(true)
              }}
              placeholder={
                status === 'away'
                  ? 'e.g., On vacation until Jan 20'
                  : 'e.g., Finishing up current project'
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Capacity Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Capacity
          </CardTitle>
          <CardDescription>
            Configure your working hours and project limits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="hours">Hours per Week</Label>
              <Input
                id="hours"
                type="number"
                min={0}
                max={80}
                value={hoursPerWeek}
                onChange={(e) => {
                  setHoursPerWeek(Number(e.target.value))
                  setHasChanges(true)
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-projects">Max Concurrent Projects</Label>
              <Input
                id="max-projects"
                type="number"
                min={1}
                max={20}
                value={maxProjects}
                onChange={(e) => {
                  setMaxProjects(Number(e.target.value))
                  setHasChanges(true)
                }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <Label className="font-medium flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Auto-assign
              </Label>
              <p className="text-sm text-muted-foreground">
                Include me in automatic project assignments
              </p>
            </div>
            <Switch
              checked={autoAssign}
              onCheckedChange={(checked) => {
                setAutoAssign(checked)
                setHasChanges(true)
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Planned Absence */}
      {(status === 'away' || status === 'unavailable') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Planned Absence
            </CardTitle>
            <CardDescription>
              Specify dates for your planned time away
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="from-date">From</Label>
                <Input
                  id="from-date"
                  type="date"
                  value={availableFrom}
                  onChange={(e) => {
                    setAvailableFrom(e.target.value)
                    setHasChanges(true)
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="until-date">Until</Label>
                <Input
                  id="until-date"
                  type="date"
                  value={availableUntil}
                  onChange={(e) => {
                    setAvailableUntil(e.target.value)
                    setHasChanges(true)
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
            'Save Availability'
          )}
        </Button>
      </div>
    </div>
  )
}
