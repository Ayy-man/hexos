'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
import { ChevronDown, Loader2, Pause, X, Undo2, Clock, CalendarPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProjectStatus } from '@/lib/api/projects'
import { updateProjectStatusAction } from '../actions/projectActions'
import { toast } from 'sonner'
import { DelayMarkerDialog } from './delays/DelayMarkerDialog'
import { ExtensionRequestDialog } from './delays/ExtensionRequestDialog'

// ============================================
// Status Configuration
// ============================================

// Project phases (inquiry/proposal phases handled at inquiry level, not here)
const STATUS_PHASES = {
  signoff: ['deliverables_pending', 'awaiting_signoff', 'signed_off'],
  agreement: ['agreement_sent', 'agreement_signed'],
  payment: ['payment_pending', 'payment_partial', 'payment_paid'],
  onboarding: ['collecting_access', 'access_complete', 'dev_assigned'],
  development: ['in_progress', 'blocked_client', 'blocked_internal', 'review_checkpoint', 'revisions', 'final_qa'],
  delivery: ['delivered', 'acceptance_pending', 'accepted'],
  closed: ['completed', 'cancelled', 'on_hold'],
} as const

const PHASE_LABELS: Record<string, string> = {
  signoff: 'Sign-off',
  agreement: 'Agreement',
  payment: 'Payment',
  onboarding: 'Onboarding',
  development: 'Development',
  delivery: 'Delivery',
  closed: 'Closed',
}

const PHASE_ORDER = ['signoff', 'agreement', 'payment', 'onboarding', 'development', 'delivery', 'closed'] as const

const STATUS_LABELS: Record<string, string> = {
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

// Semantic status colors - simplified palette
const STATUS_COLORS: Record<string, string> = {
  // Sign-off - Neutral (pipeline progress)
  deliverables_pending: 'bg-secondary text-secondary-foreground',
  awaiting_signoff: 'bg-secondary text-secondary-foreground',
  signed_off: 'bg-secondary text-secondary-foreground',
  // Agreement - Neutral
  agreement_sent: 'bg-secondary text-secondary-foreground',
  agreement_signed: 'bg-secondary text-secondary-foreground',
  // Payment - Warning (needs attention)
  payment_pending: 'bg-warning-muted text-warning-foreground',
  payment_partial: 'bg-warning-muted text-warning-foreground',
  payment_paid: 'bg-success-muted text-success-foreground',
  // Onboarding - Neutral
  collecting_access: 'bg-secondary text-secondary-foreground',
  access_complete: 'bg-secondary text-secondary-foreground',
  dev_assigned: 'bg-secondary text-secondary-foreground',
  // Development - Info (active work)
  in_progress: 'bg-info-muted text-info-foreground',
  blocked_client: 'bg-error-muted text-error-foreground',
  blocked_internal: 'bg-error-muted text-error-foreground',
  review_checkpoint: 'bg-info-muted text-info-foreground',
  revisions: 'bg-warning-muted text-warning-foreground',
  final_qa: 'bg-info-muted text-info-foreground',
  // Delivery - Success
  delivered: 'bg-success-muted text-success-foreground',
  acceptance_pending: 'bg-success-muted text-success-foreground',
  accepted: 'bg-success-muted text-success-foreground',
  // Closed
  completed: 'bg-success-muted text-success-foreground',
  cancelled: 'bg-error-muted text-error-foreground',
  on_hold: 'bg-muted text-muted-foreground',
}

// Transition map: what statuses can transition to what
// Projects start at deliverables_pending after conversion from inquiry
const TRANSITIONS: Record<string, { next: ProjectStatus; label: string; primary?: boolean }[]> = {
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

// Get all phases before the current one (for "Move Back" feature)
function getPreviousPhases(currentStatus: string): Array<{ phase: string; label: string; firstStatus: ProjectStatus }> {
  const currentPhase = getPhaseForStatus(currentStatus)
  const currentPhaseIndex = getPhaseIndex(currentPhase)

  const previousPhases: Array<{ phase: string; label: string; firstStatus: ProjectStatus }> = []

  for (let i = 0; i < currentPhaseIndex; i++) {
    const phase = PHASE_ORDER[i]
    if (phase === 'closed') continue // Don't allow moving back to closed
    const statuses = STATUS_PHASES[phase as keyof typeof STATUS_PHASES]
    if (statuses && statuses.length > 0) {
      previousPhases.push({
        phase,
        label: PHASE_LABELS[phase],
        firstStatus: statuses[0] as ProjectStatus,
      })
    }
  }

  return previousPhases
}

// ============================================
// Component
// ============================================

interface ProjectStatusControlProps {
  projectId: string
  currentStatus: ProjectStatus
  isAdmin: boolean
  userRole?: 'admin' | 'internal' | 'dev' | 'dfy' | 'client'
  deliverables?: Array<{ id: string; title: string }>
  blockers?: Array<{ id: string; title: string }>
  targetDeliveryDate?: string | null
}

export function ProjectStatusControl({
  projectId,
  currentStatus,
  isAdmin,
  userRole,
  deliverables = [],
  blockers = [],
  targetDeliveryDate,
}: ProjectStatusControlProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    status: ProjectStatus | null
    label: string
  }>({ open: false, status: null, label: '' })
  const [delayDialogOpen, setDelayDialogOpen] = useState(false)
  const [extensionDialogOpen, setExtensionDialogOpen] = useState(false)

  // Permission checks for delay tracking
  const canMarkDelay = userRole === 'admin' || userRole === 'internal' || userRole === 'dev'
  const canMarkDevDelay = userRole === 'admin' || userRole === 'internal'
  const canRequestExtension = userRole === 'admin' || userRole === 'internal'

  const transitions = TRANSITIONS[currentStatus] || []
  const primaryTransition = transitions.find(t => t.primary)
  const secondaryTransitions = transitions.filter(t => !t.primary)
  const previousPhases = getPreviousPhases(currentStatus)

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

  // Check if dev can see limited More Actions (just delay tracking)
  const showDevActions = !isAdmin && canMarkDelay && currentStatus !== 'completed' && currentStatus !== 'cancelled'

  // Non-admin view: status badge + limited actions for dev
  if (!isAdmin) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Status:</span>
        <Badge className={cn('text-sm', STATUS_COLORS[currentStatus])}>
          {STATUS_LABELS[currentStatus]}
        </Badge>

        {/* Dev can see limited More Actions for delay tracking */}
        {showDevActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                More Actions
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setDelayDialogOpen(true)}>
                <Clock className="h-4 w-4 mr-2" />
                Mark Delay
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Delay Marker Dialog for dev */}
        <DelayMarkerDialog
          open={delayDialogOpen}
          onOpenChange={setDelayDialogOpen}
          projectId={projectId}
          deliverables={deliverables}
          blockers={blockers}
          allowDevDelay={canMarkDevDelay}
        />
      </div>
    )
  }

  return (
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

              {/* Move Back submenu - only show if there are previous phases */}
              {previousPhases.length > 0 && (
                <>
                  {secondaryTransitions.length > 0 && <DropdownMenuSeparator />}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Undo2 className="h-4 w-4 mr-2" />
                      Move Back To...
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {previousPhases.map(({ phase, label, firstStatus }) => (
                        <DropdownMenuItem
                          key={phase}
                          onClick={() => handleSpecialAction(firstStatus, `Move back to ${label}`)}
                        >
                          {label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </>
              )}

              {(secondaryTransitions.length > 0 || previousPhases.length > 0) && <DropdownMenuSeparator />}

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

              {/* Delay Tracking Actions */}
              {(canMarkDelay || canRequestExtension) && currentStatus !== 'completed' && currentStatus !== 'cancelled' && (
                <>
                  <DropdownMenuSeparator />
                  {canMarkDelay && (
                    <DropdownMenuItem onClick={() => setDelayDialogOpen(true)}>
                      <Clock className="h-4 w-4 mr-2" />
                      Mark Delay
                    </DropdownMenuItem>
                  )}
                  {canRequestExtension && targetDeliveryDate && (
                    <DropdownMenuItem onClick={() => setExtensionDialogOpen(true)}>
                      <CalendarPlus className="h-4 w-4 mr-2" />
                      Request Extension
                    </DropdownMenuItem>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

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
                : confirmDialog.status === 'on_hold'
                ? 'Are you sure you want to put this project on hold? You can resume it later.'
                : confirmDialog.label.startsWith('Move back')
                ? 'Are you sure you want to move this project back? This will reset progress to the selected phase.'
                : 'Are you sure you want to make this change?'}
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

      {/* Delay Marker Dialog */}
      <DelayMarkerDialog
        open={delayDialogOpen}
        onOpenChange={setDelayDialogOpen}
        projectId={projectId}
        deliverables={deliverables}
        blockers={blockers}
        allowDevDelay={canMarkDevDelay}
      />

      {/* Extension Request Dialog */}
      {targetDeliveryDate && (
        <ExtensionRequestDialog
          open={extensionDialogOpen}
          onOpenChange={setExtensionDialogOpen}
          projectId={projectId}
          currentDeadline={targetDeliveryDate}
        />
      )}
    </div>
  )
}
