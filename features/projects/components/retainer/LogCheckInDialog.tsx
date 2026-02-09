'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react'
import { logCheckInAction } from '@/features/projects/actions/retainerActions'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { CheckInHealth } from '@/lib/api/retainer-check-ins'

interface LogCheckInDialogProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function LogCheckInDialog({
  projectId,
  open,
  onOpenChange,
  onSuccess,
}: LogCheckInDialogProps) {
  const [health, setHealth] = useState<CheckInHealth>('green')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const result = await logCheckInAction({
        projectId,
        health,
        notes: notes.trim() || undefined,
      })

      if ('error' in result) {
        toast.error(result.error)
      } else {
        toast.success('Check-in logged successfully')
        setHealth('green')
        setNotes('')
        onOpenChange(false)
        onSuccess()
      }
    } catch (error) {
      console.error('[LogCheckInDialog] Error:', error)
      toast.error('Failed to log check-in')
    } finally {
      setIsSubmitting(false)
    }
  }

  const healthOptions: Array<{
    value: CheckInHealth
    label: string
    icon: typeof CheckCircle
    color: string
    bgColor: string
  }> = [
    {
      value: 'green',
      label: 'Healthy',
      icon: CheckCircle,
      color: 'text-green-700 dark:text-green-300',
      bgColor: 'bg-green-50 hover:bg-green-100 border-green-200 dark:bg-green-950 dark:hover:bg-green-900 dark:border-green-800',
    },
    {
      value: 'yellow',
      label: 'Needs Attention',
      icon: AlertCircle,
      color: 'text-yellow-700 dark:text-yellow-300',
      bgColor: 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200 dark:bg-yellow-950 dark:hover:bg-yellow-900 dark:border-yellow-800',
    },
    {
      value: 'red',
      label: 'At Risk',
      icon: XCircle,
      color: 'text-red-700 dark:text-red-300',
      bgColor: 'bg-red-50 hover:bg-red-100 border-red-200 dark:bg-red-950 dark:hover:bg-red-900 dark:border-red-800',
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Check-in</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Health Rating */}
          <div className="space-y-3">
            <Label>Health Rating</Label>
            <RadioGroup value={health} onValueChange={(value) => setHealth(value as CheckInHealth)}>
              <div className="grid gap-2">
                {healthOptions.map((option) => {
                  const Icon = option.icon
                  return (
                    <label
                      key={option.value}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                        option.bgColor,
                        health === option.value && 'ring-2 ring-offset-2 ring-primary'
                      )}
                    >
                      <RadioGroupItem value={option.value} id={option.value} />
                      <Icon className={cn('h-5 w-5', option.color)} />
                      <span className="font-medium">{option.label}</span>
                    </label>
                  )
                })}
              </div>
            </RadioGroup>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How's the project going? Any concerns?"
              rows={4}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Logging...' : 'Log Check-in'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
