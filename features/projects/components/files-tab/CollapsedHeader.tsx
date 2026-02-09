'use client'

import { ArrowLeft, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ProjectWithRelations, ProjectStatus } from '@/lib/api/projects'

interface CollapsedHeaderProps {
  project: ProjectWithRelations
  onExit: () => void
}

const statusLabels: Record<ProjectStatus, string> = {
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
  payment_paid: 'Payment Received',
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
  // Retainer
  retainer: 'Retainer',
  // Closed
  completed: 'Completed',
  cancelled: 'Cancelled',
  on_hold: 'On Hold',
}

const statusColors: Record<ProjectStatus, string> = {
  // Sign-off
  deliverables_pending: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  awaiting_signoff: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  signed_off: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  // Agreement
  agreement_sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  agreement_signed: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  // Payment
  payment_pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  payment_partial: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  payment_paid: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  // Onboarding
  collecting_access: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
  access_complete: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300',
  dev_assigned: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
  // Development
  in_progress: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  blocked_client: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  blocked_internal: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  review_checkpoint: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  revisions: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300',
  final_qa: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900 dark:text-fuchsia-300',
  // Delivery
  delivered: 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300',
  acceptance_pending: 'bg-lime-100 text-lime-700 dark:bg-lime-900 dark:text-lime-300',
  accepted: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  // Retainer
  retainer: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  // Closed
  completed: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  on_hold: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
}

function formatDate(date: string | null): string {
  if (!date) return 'Not set'
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getDeliveryStatus(targetDate: string | null, overrideDate: string | null): {
  label: string
  color: string
} {
  const effectiveDate = overrideDate || targetDate
  if (!effectiveDate) return { label: 'No date', color: 'text-muted-foreground' }

  const today = new Date()
  const delivery = new Date(effectiveDate)
  const daysUntil = Math.ceil((delivery.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (daysUntil < 0) {
    return { label: 'Overdue', color: 'text-red-600 dark:text-red-400' }
  } else if (daysUntil <= 7) {
    return { label: 'Due Soon', color: 'text-amber-600 dark:text-amber-400' }
  }
  return { label: 'On Track', color: 'text-emerald-600 dark:text-emerald-400' }
}

export function CollapsedHeader({ project, onExit }: CollapsedHeaderProps) {
  const status = project.status as ProjectStatus
  const effectiveDeliveryDate = project.delivery_date_override || project.target_delivery_date
  const deliveryStatus = getDeliveryStatus(project.target_delivery_date, project.delivery_date_override)

  return (
    <div className="flex items-center justify-between h-12 px-4 border-b bg-background">
      {/* Left: Back arrow + Project name */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onExit}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="font-medium text-sm truncate max-w-[300px]">
          {project.project_name}
        </span>
      </div>

      {/* Center: Status + Delivery date + Status indicator */}
      <div className="flex items-center gap-4">
        <Badge
          variant="secondary"
          className={cn('text-xs', statusColors[status])}
        >
          {statusLabels[status]}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {formatDate(effectiveDeliveryDate)}
        </span>
        <span className={cn('text-sm font-medium', deliveryStatus.color)}>
          {deliveryStatus.label}
        </span>
      </div>

      {/* Right: Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onExit}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}
