'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ButtonHoldAndRelease } from '@/components/ui/hold-and-release-button'
import { CheckCircle2, Loader2, PartyPopper } from 'lucide-react'
import { toast } from 'sonner'

interface MarkAsClosedButtonProps {
  inquiryId: string
  isClosed: boolean
  onMarkAsClosed: (notes?: string, clientEmail?: string) => Promise<void>
  onUnmarkAsClosed?: () => Promise<void>
}

export function MarkAsClosedButton({
  inquiryId,
  isClosed,
  onMarkAsClosed,
  onUnmarkAsClosed,
}: MarkAsClosedButtonProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [notes, setNotes] = useState('')
  const [clientEmail, setClientEmail] = useState('')

  const handleMarkAsClosed = () => {
    startTransition(async () => {
      try {
        await onMarkAsClosed(notes || undefined, clientEmail || undefined)
        toast.success('Deal marked as closed!')
        setOpen(false)
        setNotes('')
        setClientEmail('')
      } catch (error) {
        console.error('Error marking as closed:', error)
        toast.error('Failed to mark as closed')
      }
    })
  }

  const handleUnmark = () => {
    if (!onUnmarkAsClosed) return
    startTransition(async () => {
      try {
        await onUnmarkAsClosed()
        toast.success('Deal unmarked')
      } catch (error) {
        console.error('Error unmarking:', error)
        toast.error('Failed to unmark')
      }
    })
  }

  // If already closed, show undo option
  if (isClosed) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm font-medium">Deal Closed</span>
        </div>
        {onUnmarkAsClosed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUnmark}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Undo'
            )}
          </Button>
        )}
      </div>
    )
  }

  return (
    <>
      <Button
        variant="default"
        className="bg-green-600 hover:bg-green-700"
        onClick={() => setOpen(true)}
      >
        <PartyPopper className="h-4 w-4 mr-2" />
        Mark as Closed
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PartyPopper className="h-5 w-5 text-green-600" />
              Congratulations on closing the deal!
            </DialogTitle>
            <DialogDescription>
              Mark this deal as closed. The internal team will be notified to
              start the project conversion process.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes for the team (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any special requirements, timeline notes, or client preferences..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Client email (optional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="client@example.com"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                We&apos;ll use this to invite the client to the portal once the
                project is set up.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <ButtonHoldAndRelease
              onComplete={handleMarkAsClosed}
              holdDuration={2000}
              disabled={isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Marking...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Hold to Confirm
                </>
              )}
            </ButtonHoldAndRelease>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
