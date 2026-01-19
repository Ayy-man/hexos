'use client'

import { useState, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { createDelayAction } from '../../actions/delayActions'
import type { DelayType } from '@/lib/api/project-delays'

interface DelayMarkerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  deliverables?: Array<{ id: string; title: string }>
  blockers?: Array<{ id: string; title: string }>
  allowDevDelay?: boolean
  onDelayCreated?: () => void
}

export function DelayMarkerDialog({
  open,
  onOpenChange,
  projectId,
  deliverables = [],
  blockers = [],
  allowDevDelay = false,
  onDelayCreated,
}: DelayMarkerDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [delayType, setDelayType] = useState<DelayType>('client_delay')
  const [delayDate, setDelayDate] = useState(new Date().toISOString().split('T')[0])
  const [daysCount, setDaysCount] = useState(1)
  const [reason, setReason] = useState('')
  const [deliverableId, setDeliverableId] = useState<string>('')
  const [blockerId, setBlockerId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) {
      setError('Please provide a reason for the delay')
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await createDelayAction({
        project_id: projectId,
        delay_type: delayType,
        delay_date: delayDate,
        days_count: daysCount,
        deliverable_id: deliverableId || undefined,
        blocker_id: blockerId || undefined,
        reason: reason.trim(),
      })

      if (result.success) {
        resetForm()
        onOpenChange(false)
        onDelayCreated?.()
      } else {
        setError(result.error || 'Failed to mark delay')
      }
    })
  }

  const resetForm = () => {
    setDelayType('client_delay')
    setDelayDate(new Date().toISOString().split('T')[0])
    setDaysCount(1)
    setReason('')
    setDeliverableId('')
    setBlockerId('')
    setError(null)
  }

  const handleClose = () => {
    resetForm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Mark Delay</DialogTitle>
            <DialogDescription>
              Record a delay for this project. Client delays adjust expected progress.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* Delay Type */}
            <div className="space-y-2">
              <Label htmlFor="delayType">Delay Type</Label>
              <Select
                value={delayType}
                onValueChange={(value) => setDelayType(value as DelayType)}
              >
                <SelectTrigger id="delayType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client_delay">
                    Client Delay (adjusts timeline)
                  </SelectItem>
                  {allowDevDelay && (
                    <SelectItem value="dev_delay">
                      Dev Delay (for accountability)
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Delay Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="delayDate">Date</Label>
                <Input
                  id="delayDate"
                  type="date"
                  value={delayDate}
                  onChange={(e) => setDelayDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* Days Count */}
              <div className="space-y-2">
                <Label htmlFor="daysCount">Days</Label>
                <Input
                  id="daysCount"
                  type="number"
                  min={1}
                  max={7}
                  value={daysCount}
                  onChange={(e) => setDaysCount(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>

            {/* Related Deliverable */}
            {deliverables.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="deliverable">Related Deliverable (optional)</Label>
                <Select
                  value={deliverableId || 'none'}
                  onValueChange={(val) => setDeliverableId(val === 'none' ? '' : val)}
                >
                  <SelectTrigger id="deliverable">
                    <SelectValue placeholder="Select deliverable" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {deliverables.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Related Blocker */}
            {blockers.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="blocker">Related Blocker (optional)</Label>
                <Select
                  value={blockerId || 'none'}
                  onValueChange={(val) => setBlockerId(val === 'none' ? '' : val)}
                >
                  <SelectTrigger id="blocker">
                    <SelectValue placeholder="Select blocker" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {blockers.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                placeholder="Describe why there was a delay..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !reason.trim()}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Marking...
                </>
              ) : (
                'Mark Delay'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
