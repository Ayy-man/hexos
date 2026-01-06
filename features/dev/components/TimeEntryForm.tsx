'use client'

import { useState, useTransition } from 'react'
import { Plus, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { addManualEntryAction } from '@/features/dev/actions/timeTrackingActions'

interface Deliverable {
  id: string
  title: string
  project?: {
    id: string
    project_name: string
  }
}

interface TimeEntryFormProps {
  deliverables: Deliverable[]
  preselectedDeliverableId?: string
  onSuccess?: () => void
  trigger?: React.ReactNode
}

export function TimeEntryForm({
  deliverables,
  preselectedDeliverableId,
  onSuccess,
  trigger,
}: TimeEntryFormProps) {
  const [open, setOpen] = useState(false)
  const [deliverableId, setDeliverableId] = useState(preselectedDeliverableId || '')
  const [hours, setHours] = useState('')
  const [minutes, setMinutes] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!deliverableId) {
      toast.error('Please select a deliverable')
      return
    }

    const totalMinutes = (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0)
    if (totalMinutes <= 0) {
      toast.error('Please enter a valid duration')
      return
    }

    startTransition(async () => {
      const result = await addManualEntryAction({
        deliverableId,
        durationMinutes: totalMinutes,
        description: description || undefined,
        date,
      })

      if (result.success) {
        toast.success(`Logged ${formatDuration(totalMinutes)}`)
        setOpen(false)
        resetForm()
        onSuccess?.()
      } else {
        toast.error(result.message || 'Failed to add time entry')
      }
    })
  }

  const resetForm = () => {
    if (!preselectedDeliverableId) setDeliverableId('')
    setHours('')
    setMinutes('')
    setDescription('')
    setDate(new Date().toISOString().split('T')[0])
  }

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    if (h > 0 && m > 0) return `${h}h ${m}m`
    if (h > 0) return `${h}h`
    return `${m}m`
  }

  // Group deliverables by project
  const groupedDeliverables = deliverables.reduce((acc, d) => {
    const projectName = d.project?.project_name || 'No Project'
    if (!acc[projectName]) acc[projectName] = []
    acc[projectName].push(d)
    return acc
  }, {} as Record<string, Deliverable[]>)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Log Time
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Time</DialogTitle>
          <DialogDescription>
            Manually add time spent on a deliverable.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Deliverable Select */}
          <div className="space-y-2">
            <Label>Deliverable</Label>
            <Select value={deliverableId} onValueChange={setDeliverableId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a deliverable" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(groupedDeliverables).map(([projectName, items]) => (
                  <div key={projectName}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      {projectName}
                    </div>
                    {items.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.title}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label>Duration</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    max="24"
                    placeholder="0"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    h
                  </span>
                </div>
              </div>
              <div className="flex-1">
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    placeholder="0"
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    m
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              placeholder="What did you work on?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              <Clock className="h-4 w-4 mr-1" />
              {isPending ? 'Logging...' : 'Log Time'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Quick time entry buttons for common durations
interface QuickTimeEntryProps {
  deliverableId: string
  onSuccess?: () => void
}

export function QuickTimeEntry({ deliverableId, onSuccess }: QuickTimeEntryProps) {
  const [isPending, startTransition] = useTransition()

  const quickLog = (minutes: number) => {
    startTransition(async () => {
      const result = await addManualEntryAction({
        deliverableId,
        durationMinutes: minutes,
      })
      if (result.success) {
        toast.success(`Logged ${minutes >= 60 ? `${minutes / 60}h` : `${minutes}m`}`)
        onSuccess?.()
      } else {
        toast.error('Failed to log time')
      }
    })
  }

  return (
    <div className="flex gap-1">
      <Button
        size="xs"
        variant="ghost"
        onClick={() => quickLog(15)}
        disabled={isPending}
      >
        +15m
      </Button>
      <Button
        size="xs"
        variant="ghost"
        onClick={() => quickLog(30)}
        disabled={isPending}
      >
        +30m
      </Button>
      <Button
        size="xs"
        variant="ghost"
        onClick={() => quickLog(60)}
        disabled={isPending}
      >
        +1h
      </Button>
    </div>
  )
}
