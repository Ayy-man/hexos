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
import {
  PartyPopper,
  Frown,
  Clock,
  HelpCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  snoozeReminderAction,
  markLostAction,
  markWonAction,
  requestAdminHelpAction,
} from '@/features/inquiries/actions/reminderActions'
import type { StaleProposal } from '@/lib/api/proposal-reminders'

type ActionType = 'won' | 'lost' | 'snooze' | 'help' | null

interface ProposalStatusDialogProps {
  proposal: StaleProposal
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete?: () => void
}

export function ProposalStatusDialog({
  proposal,
  open,
  onOpenChange,
  onComplete,
}: ProposalStatusDialogProps) {
  const [selectedAction, setSelectedAction] = useState<ActionType>(null)
  const [isPending, startTransition] = useTransition()

  // Form state for different actions
  const [lostReason, setLostReason] = useState('')
  const [wonNotes, setWonNotes] = useState('')
  const [clientEmail, setClientEmail] = useState('')

  const resetState = () => {
    setSelectedAction(null)
    setLostReason('')
    setWonNotes('')
    setClientEmail('')
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetState()
    }
    onOpenChange(newOpen)
  }

  const handleActionSelect = (action: ActionType) => {
    setSelectedAction(action)
  }

  const handleConfirm = () => {
    startTransition(async () => {
      try {
        switch (selectedAction) {
          case 'won':
            await markWonAction(proposal.id, wonNotes || undefined, clientEmail || undefined)
            toast.success('Congratulations! Deal marked as closed.')
            break
          case 'lost':
            await markLostAction(proposal.id, lostReason || undefined)
            toast.success('Proposal marked as lost.')
            break
          case 'snooze':
            const result = await snoozeReminderAction(proposal.id)
            if (result.success) {
              toast.success(result.message)
            } else {
              toast.info(result.message)
            }
            break
          case 'help':
            await requestAdminHelpAction(proposal.id)
            toast.success('Admin has been notified and will follow up.')
            break
        }
        handleOpenChange(false)
        onComplete?.()
      } catch (error) {
        console.error('Error updating proposal status:', error)
        toast.error('Failed to update proposal status')
      }
    })
  }

  const remainingSnoozes = 3 - (proposal.reminder_snooze_count || 0)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            What happened with &ldquo;{proposal.prospect_company_name || 'this proposal'}&rdquo;?
          </DialogTitle>
          <DialogDescription>
            Sent {proposal.days_since_sent} days ago
            {proposal.price_dfy && (
              <span className="ml-2">
                &bull; ${proposal.price_dfy.toLocaleString()}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Action Selection */}
        {!selectedAction && (
          <div className="grid grid-cols-2 gap-3 py-4">
            <button
              onClick={() => handleActionSelect('won')}
              className="flex flex-col items-center gap-2 rounded-lg border-2 border-transparent bg-green-50 p-4 text-green-700 hover:border-green-500 dark:bg-green-950/50 dark:text-green-400 dark:hover:border-green-600"
            >
              <PartyPopper className="h-8 w-8" />
              <span className="font-medium">Won!</span>
              <span className="text-xs text-green-600 dark:text-green-500">Deal closed</span>
            </button>

            <button
              onClick={() => handleActionSelect('lost')}
              className="flex flex-col items-center gap-2 rounded-lg border-2 border-transparent bg-red-50 p-4 text-red-700 hover:border-red-500 dark:bg-red-950/50 dark:text-red-400 dark:hover:border-red-600"
            >
              <Frown className="h-8 w-8" />
              <span className="font-medium">Lost</span>
              <span className="text-xs text-red-600 dark:text-red-500">Didn&apos;t work out</span>
            </button>

            <button
              onClick={() => handleActionSelect('snooze')}
              disabled={remainingSnoozes <= 0}
              className="flex flex-col items-center gap-2 rounded-lg border-2 border-transparent bg-amber-50 p-4 text-amber-700 hover:border-amber-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-amber-950/50 dark:text-amber-400 dark:hover:border-amber-600"
            >
              <Clock className="h-8 w-8" />
              <span className="font-medium">Still Going</span>
              <span className="text-xs text-amber-600 dark:text-amber-500">
                {remainingSnoozes > 0
                  ? `Remind me later (${remainingSnoozes} left)`
                  : 'No snoozes left'}
              </span>
            </button>

            <button
              onClick={() => handleActionSelect('help')}
              className="flex flex-col items-center gap-2 rounded-lg border-2 border-transparent bg-blue-50 p-4 text-blue-700 hover:border-blue-500 dark:bg-blue-950/50 dark:text-blue-400 dark:hover:border-blue-600"
            >
              <HelpCircle className="h-8 w-8" />
              <span className="font-medium">Need Help</span>
              <span className="text-xs text-blue-600 dark:text-blue-500">Contact admin</span>
            </button>
          </div>
        )}

        {/* Won Form */}
        {selectedAction === 'won' && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <PartyPopper className="h-5 w-5" />
              <span className="font-medium">Congratulations on closing the deal!</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wonNotes">Notes for the team (optional)</Label>
              <Textarea
                id="wonNotes"
                placeholder="Any special requirements, timeline notes, or client preferences..."
                value={wonNotes}
                onChange={(e) => setWonNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientEmail">Client email (optional)</Label>
              <Input
                id="clientEmail"
                type="email"
                placeholder="client@example.com"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                We&apos;ll use this to invite the client to the portal.
              </p>
            </div>
          </div>
        )}

        {/* Lost Form */}
        {selectedAction === 'lost' && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <Frown className="h-5 w-5" />
              <span className="font-medium">Sorry to hear that</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lostReason">What happened? (optional)</Label>
              <Textarea
                id="lostReason"
                placeholder="Budget issues, went with competitor, project cancelled..."
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                This helps us improve future proposals.
              </p>
            </div>
          </div>
        )}

        {/* Snooze Confirmation */}
        {selectedAction === 'snooze' && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Clock className="h-5 w-5" />
              <span className="font-medium">Still negotiating?</span>
            </div>

            <p className="text-sm text-muted-foreground">
              We&apos;ll remind you again in 2 weeks. You have {remainingSnoozes - 1} snooze{remainingSnoozes - 1 !== 1 ? 's' : ''} remaining after this.
            </p>

            {remainingSnoozes === 1 && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                This is your last snooze. After this, the proposal will be escalated to admin for follow-up.
              </p>
            )}
          </div>
        )}

        {/* Help Confirmation */}
        {selectedAction === 'help' && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <HelpCircle className="h-5 w-5" />
              <span className="font-medium">Request admin assistance</span>
            </div>

            <p className="text-sm text-muted-foreground">
              An admin will be notified to help with this proposal. They may reach out to you or the prospect directly.
            </p>
          </div>
        )}

        {/* Footer */}
        {selectedAction && (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedAction(null)}
              disabled={isPending}
            >
              Back
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isPending}
              className={
                selectedAction === 'won'
                  ? 'bg-green-600 hover:bg-green-700'
                  : selectedAction === 'lost'
                  ? 'bg-red-600 hover:bg-red-700'
                  : selectedAction === 'snooze'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Confirm
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
