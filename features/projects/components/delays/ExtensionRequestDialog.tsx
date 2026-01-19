'use client'

import { useState, useTransition, useEffect } from 'react'
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
import { Loader2, Calendar, AlertTriangle } from 'lucide-react'
import { requestExtensionAction } from '../../actions/extensionActions'
import { getDelaySummaryAction } from '../../actions/delayActions'

interface ExtensionRequestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  currentDeadline: string
  onExtensionRequested?: () => void
}

export function ExtensionRequestDialog({
  open,
  onOpenChange,
  projectId,
  currentDeadline,
  onExtensionRequested,
}: ExtensionRequestDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [requestedDeadline, setRequestedDeadline] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [clientDelayDays, setClientDelayDays] = useState(0)

  // Load delay summary
  useEffect(() => {
    if (!open) return

    async function loadDelays() {
      const summary = await getDelaySummaryAction(projectId)
      setClientDelayDays(summary.client_delay_days)
    }

    loadDelays()
  }, [open, projectId])

  // Calculate additional days
  const calculateDays = (date1: string, date2: string) => {
    const d1 = new Date(date1)
    const d2 = new Date(date2)
    return Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))
  }

  const totalExtensionDays = requestedDeadline
    ? calculateDays(currentDeadline, requestedDeadline)
    : 0

  const additionalDays = Math.max(0, totalExtensionDays - clientDelayDays)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!requestedDeadline || !reason.trim()) {
      setError('Please fill in all required fields')
      return
    }

    if (new Date(requestedDeadline) <= new Date(currentDeadline)) {
      setError('New deadline must be after current deadline')
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await requestExtensionAction({
        project_id: projectId,
        original_deadline: currentDeadline,
        requested_deadline: requestedDeadline,
        client_delay_days: clientDelayDays,
        additional_days: additionalDays,
        reason: reason.trim(),
      })

      if (result.success) {
        resetForm()
        onOpenChange(false)
        onExtensionRequested?.()
      } else {
        setError(result.error || 'Failed to request extension')
      }
    })
  }

  const resetForm = () => {
    setRequestedDeadline('')
    setReason('')
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
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Request Deadline Extension
            </DialogTitle>
            <DialogDescription>
              Submit an extension request for DFY partner approval.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* Current vs New Deadline */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Current Deadline</Label>
                <Input
                  type="date"
                  value={currentDeadline}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="requestedDeadline">New Deadline</Label>
                <Input
                  id="requestedDeadline"
                  type="date"
                  value={requestedDeadline}
                  onChange={(e) => setRequestedDeadline(e.target.value)}
                  min={currentDeadline}
                />
              </div>
            </div>

            {/* Breakdown */}
            {requestedDeadline && totalExtensionDays > 0 && (
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <div className="text-sm font-medium">Extension Breakdown</div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Total Days</div>
                    <div className="font-medium">{totalExtensionDays}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                      Client Delays
                    </div>
                    <div className="font-medium">{clientDelayDays}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Additional</div>
                    <div className="font-medium">{additionalDays}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Extension</Label>
              <Textarea
                id="reason"
                placeholder="Explain why an extension is needed..."
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
            <Button
              type="submit"
              disabled={isPending || !requestedDeadline || !reason.trim()}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
