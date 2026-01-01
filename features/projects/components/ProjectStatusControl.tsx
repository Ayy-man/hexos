'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ChevronDown, Loader2, Check, Pause, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProjectStatus } from '@/lib/api/projects'
import { updateProjectStatusAction } from '../actions/projectActions'
import { toast } from 'sonner'

// ============================================
// Status Configuration
// ============================================

const STATUS_PHASES = {
  inquiry: ['inquiry_new', 'ai_matching', 'qualified'],
  proposal: ['proposal_drafting', 'internal_review', 'proposal_sent', 'negotiating', 'committed'],
  signoff: ['deliverables_pending', 'awaiting_signoff', 'signed_off'],
  agreement: ['agreement_sent', 'agreement_signed'],
  payment: ['payment_pending', 'payment_partial', 'payment_paid'],
  onboarding: ['collecting_access', 'access_complete', 'dev_assigned'],
  development: ['in_progress', 'blocked_client', 'blocked_internal', 'review_checkpoint', 'revisions', 'final_qa'],
  delivery: ['delivered', 'acceptance_pending', 'accepted'],
  closed: ['completed', 'cancelled', 'on_hold'],
} as const

const PHASE_LABELS: Record<string, string> = {
  inquiry: 'Inquiry',
  proposal: 'Proposal',
  signoff: 'Sign-off',
  agreement: 'Agreement',
  payment: 'Payment',
  onboarding: 'Onboarding',
  development: 'Development',
  delivery: 'Delivery',
  closed: 'Closed',
}

const PHASE_ORDER = ['inquiry', 'proposal', 'signoff', 'agreement', 'payment', 'onboarding', 'development', 'delivery', 'closed'] as const

const STATUS_LABELS: Record<string, string> = {
  // Inquiry
  inquiry_new: 'New Inquiry',
  ai_matching: 'AI Matching',
  qualified: 'Qualified',
  // Proposal
  proposal_drafting: 'Drafting Proposal',
  internal_review: 'Internal Review',
  proposal_sent: 'Proposal Sent',
  negotiating: 'Negotiating',
  committed: 'Committed',
  // Sign-off
  deliverables_pending: 'Deliverables Pending',
  awaiting_signoff: 'Awaiting Sign-off',
  signed_off: 'Signed Off',
  // Agreement
  agreement_sent: 'Agreement Sent',
  agreement_signed: 'Agreement Signed',
  // Payment
  payment_pending: 'Payment Pending',
  payment_partial: 'Partial Payment',
  payment_paid: 'Paid',
  // Onboarding
  collecting_access: 'Collecting Access',
  access_complete: 'Access Complete',
  dev_assigned: 'Dev Assigned',
  // Development
  in_progress: 'In Progress',
  blocked_client: 'Blocked (Client)',
  blocked_internal: 'Blocked (Internal)',
  review_checkpoint: 'Review Checkpoint',
  revisions: 'Revisions',
  final_qa: 'Final QA',
  // Delivery
  delivered: 'Delivered',
  acceptance_pending: 'Acceptance Pending',
  accepted: 'Accepted',
  // Closed
  completed: 'Completed',
  cancelled: 'Cancelled',
  on_hold: 'On Hold',
}

const STATUS_COLORS: Record<string, string> = {
  // Inquiry - Stone
  inquiry_new: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
  ai_matching: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
  qualified: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
  // Proposal - Blue
  proposal_drafting: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  internal_review: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  proposal_sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  negotiating: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  committed: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  // Sign-off - Indigo
  deliverables_pending: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
  awaiting_signoff: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
  signed_off: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
  // Agreement - Purple
  agreement_sent: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  agreement_signed: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  // Payment - Amber
  payment_pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  payment_partial: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  payment_paid: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  // Onboarding - Teal
  collecting_access: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300',
  access_complete: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300',
  dev_assigned: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300',
  // Development - Cyan
  in_progress: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
  blocked_client: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  blocked_internal: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  review_checkpoint: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
  revisions: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  final_qa: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
  // Delivery - Green
  delivered: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  acceptance_pending: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  accepted: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  // Closed
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  on_hold: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
}

// Transition map: what statuses can transition to what
const TRANSITIONS: Record<string, { next: ProjectStatus; label: string; primary?: boolean }[]> = {
  // Inquiry
  inquiry_new: [{ next: 'ai_matching', label: 'Start Matching', primary: true }],
  ai_matching: [{ next: 'qualified', label: 'Mark Qualified', primary: true }],
  qualified: [{ next: 'proposal_drafting', label: 'Start Proposal', primary: true }],

  // Proposal
  proposal_drafting: [{ next: 'internal_review', label: 'Submit for Review', primary: true }],
  internal_review: [
    { next: 'proposal_sent', label: 'Send to Client', primary: true },
    { next: 'proposal_drafting', label: 'Back to Draft' }
  ],
  proposal_sent: [
    { next: 'negotiating', label: 'Start Negotiation' },
    { next: 'committed', label: 'Mark Committed', primary: true }
  ],
  negotiating: [{ next: 'committed', label: 'Mark Committed', primary: true }],
  committed: [{ next: 'deliverables_pending', label: 'Confirm Deliverables', primary: true }],

  // Sign-off
  deliverables_pending: [{ next: 'awaiting_signoff', label: 'Send for Sign-off', primary: true }],
  awaiting_signoff: [{ next: 'signed_off', label: 'Mark Signed Off', primary: true }],
  signed_off: [{ next: 'agreement_sent', label: 'Send Agreement', primary: true }],

  // Agreement
  agreement_sent: [{ next: 'agreement_signed', label: 'Mark Signed', primary: true }],
  agreement_signed: [{ next: 'payment_pending', label: 'Request Payment', primary: true }],

  // Payment
  payment_pending: [
    { next: 'payment_partial', label: 'Partial Payment' },
    { next: 'payment_paid', label: 'Full Payment', primary: true }
  ],
  payment_partial: [{ next: 'payment_paid', label: 'Mark Paid', primary: true }],
  payment_paid: [{ next: 'collecting_access', label: 'Start Onboarding', primary: true }],

  // Onboarding
  collecting_access: [{ next: 'access_complete', label: 'Access Complete', primary: true }],
  access_complete: [{ next: 'dev_assigned', label: 'Assign Dev', primary: true }],
  dev_assigned: [{ next: 'in_progress', label: 'Start Development', primary: true }],

  // Development
  in_progress: [
    { next: 'review_checkpoint', label: 'Submit for Review', primary: true },
    { next: 'blocked_client', label: 'Blocked (Client)' },
    { next: 'blocked_internal', label: 'Blocked (Internal)' }
  ],
  blocked_client: [{ next: 'in_progress', label: 'Unblock', primary: true }],
  blocked_internal: [{ next: 'in_progress', label: 'Unblock', primary: true }],
  review_checkpoint: [
    { next: 'in_progress', label: 'Continue Work' },
    { next: 'revisions', label: 'Request Revisions' },
    { next: 'final_qa', label: 'Send to QA', primary: true }
  ],
  revisions: [{ next: 'review_checkpoint', label: 'Resubmit', primary: true }],
  final_qa: [{ next: 'delivered', label: 'Mark Delivered', primary: true }],

  // Delivery
  delivered: [{ next: 'acceptance_pending', label: 'Request Acceptance', primary: true }],
  acceptance_pending: [
    { next: 'accepted', label: 'Client Accepted', primary: true },
    { next: 'revisions', label: 'Revisions Needed' }
  ],
  accepted: [{ next: 'completed', label: 'Close Project', primary: true }],

  // Closed (terminal or resume)
  completed: [],
  cancelled: [],
  on_hold: [{ next: 'in_progress', label: 'Resume', primary: true }],
}

// ============================================
// Helper Functions
// ============================================

function getPhaseForStatus(status: string): string {
  for (const [phase, statuses] of Object.entries(STATUS_PHASES)) {
    if (statuses.includes(status as never)) return phase
  }
  return 'unknown'
}

function getPhaseIndex(phase: string): number {
  return PHASE_ORDER.indexOf(phase as (typeof PHASE_ORDER)[number])
}

// ============================================
// Component
// ============================================

interface ProjectStatusControlProps {
  projectId: string
  currentStatus: ProjectStatus
  isAdmin: boolean
}

export function ProjectStatusControl({
  projectId,
  currentStatus,
  isAdmin,
}: ProjectStatusControlProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    status: ProjectStatus | null
    label: string
  }>({ open: false, status: null, label: '' })

  const currentPhase = getPhaseForStatus(currentStatus)
  const currentPhaseIndex = getPhaseIndex(currentPhase)
  const transitions = TRANSITIONS[currentStatus] || []
  const primaryTransition = transitions.find(t => t.primary)
  const secondaryTransitions = transitions.filter(t => !t.primary)

  const handleTransition = async (newStatus: ProjectStatus) => {
    setIsUpdating(true)
    try {
      await updateProjectStatusAction(projectId, newStatus)
      toast.success(`Status updated to ${STATUS_LABELS[newStatus]}`)
    } catch (error) {
      console.error('Failed to update status:', error)
      toast.error('Failed to update status')
    } finally {
      setIsUpdating(false)
      setConfirmDialog({ open: false, status: null, label: '' })
    }
  }

  const handleSpecialAction = (status: ProjectStatus, label: string) => {
    setConfirmDialog({ open: true, status, label })
  }

  // Don't show controls if not admin or if project is completed/cancelled
  if (!isAdmin) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Status:</span>
        <Badge className={cn('text-sm', STATUS_COLORS[currentStatus])}>
          {STATUS_LABELS[currentStatus]}
        </Badge>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Phase Stepper */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {PHASE_ORDER.filter(p => p !== 'closed').map((phase, index) => {
          const isCompleted = index < currentPhaseIndex
          const isCurrent = phase === currentPhase
          const isUpcoming = index > currentPhaseIndex

          return (
            <div key={phase} className="flex items-center">
              {index > 0 && (
                <div
                  className={cn(
                    'w-8 h-0.5 mx-0.5',
                    isCompleted ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
              <div
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap',
                  isCompleted && 'bg-primary/20 text-primary',
                  isCurrent && 'bg-primary text-primary-foreground',
                  isUpcoming && 'bg-muted text-muted-foreground'
                )}
              >
                {isCompleted && <Check className="h-3 w-3" />}
                {PHASE_LABELS[phase]}
              </div>
            </div>
          )
        })}
      </div>

      {/* Current Status + Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Badge className={cn('text-sm', STATUS_COLORS[currentStatus])}>
            {STATUS_LABELS[currentStatus]}
          </Badge>
        </div>

        {/* Primary Transition Button */}
        {primaryTransition && (
          <Button
            onClick={() => handleTransition(primaryTransition.next)}
            disabled={isUpdating}
            size="sm"
          >
            {isUpdating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              primaryTransition.label
            )}
          </Button>
        )}

        {/* Secondary Actions Dropdown */}
        {(secondaryTransitions.length > 0 || currentStatus !== 'completed' && currentStatus !== 'cancelled') && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isUpdating}>
                More Actions
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {secondaryTransitions.map(t => (
                <DropdownMenuItem
                  key={t.next}
                  onClick={() => handleTransition(t.next)}
                >
                  {t.label}
                </DropdownMenuItem>
              ))}

              {secondaryTransitions.length > 0 && <DropdownMenuSeparator />}

              {currentStatus !== 'on_hold' && currentStatus !== 'completed' && currentStatus !== 'cancelled' && (
                <DropdownMenuItem
                  onClick={() => handleSpecialAction('on_hold', 'Put On Hold')}
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Put On Hold
                </DropdownMenuItem>
              )}

              {currentStatus !== 'cancelled' && currentStatus !== 'completed' && (
                <DropdownMenuItem
                  onClick={() => handleSpecialAction('cancelled', 'Cancel Project')}
                  className="text-red-600 focus:text-red-600"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel Project
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => !open && setConfirmDialog({ open: false, status: null, label: '' })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.label}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.status === 'cancelled'
                ? 'Are you sure you want to cancel this project? This action should only be used for projects that will not continue.'
                : 'Are you sure you want to put this project on hold? You can resume it later.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDialog.status && handleTransition(confirmDialog.status)}
              disabled={isUpdating}
              className={confirmDialog.status === 'cancelled' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Confirm'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
