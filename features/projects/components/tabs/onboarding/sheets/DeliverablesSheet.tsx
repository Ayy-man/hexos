'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, Minus, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { ProjectWithRelations } from '@/lib/api/projects'
import type { UserRole } from '@/lib/auth/types'
import { ButtonHoldAndRelease } from '@/components/ui/hold-and-release-button'
import {
  confirmDeliverablesAction,
  sendForSignoffAction,
  signOffDeliverablesAction,
} from '../../../../actions/projectActions'
import { isDeliverablesLocked } from '@/lib/utils/projectPhases'

// Local type for deliverable
type ProjectDeliverable = NonNullable<ProjectWithRelations['deliverables']>[number]

interface DeliverableTreeNode extends ProjectDeliverable {
  children: DeliverableTreeNode[]
}

function buildDeliverableTree(deliverables: ProjectDeliverable[]): DeliverableTreeNode[] {
  const nodeMap = new Map<string, DeliverableTreeNode>()
  const roots: DeliverableTreeNode[] = []

  for (const d of deliverables) {
    nodeMap.set(d.id, { ...d, children: [] })
  }

  for (const d of deliverables) {
    const node = nodeMap.get(d.id)!
    if (d.parent_id && nodeMap.has(d.parent_id)) {
      nodeMap.get(d.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
}

function DeliverableTreeItem({
  deliverable,
  depth,
}: {
  deliverable: DeliverableTreeNode
  depth: number
}) {
  const hasChildren = deliverable.children.length > 0

  return (
    <div>
      <div
        className="flex items-start gap-3 py-2 px-2 rounded-lg hover:bg-muted/50"
        style={{ marginLeft: depth * 20 }}
      >
        {deliverable.status === 'done' ? (
          <CheckCircle2 className="h-5 w-5 text-[--signal-good] shrink-0 mt-0.5" />
        ) : deliverable.status === 'in_progress' ? (
          <Minus className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
        ) : (
          <Minus className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p
              className={cn(
                'font-medium',
                deliverable.status === 'done' && 'line-through text-muted-foreground'
              )}
            >
              {deliverable.title}
            </p>
            <Badge
              variant="secondary"
              className={cn(
                deliverable.status === 'done' && 'bg-[--signal-good-dim] text-[--signal-good]',
                deliverable.status === 'in_progress' &&
                  'bg-[color:var(--accent-dim)] text-[color:var(--accent)]'
              )}
            >
              {deliverable.status.replace(/_/g, ' ')}
            </Badge>
            {hasChildren && (
              <span className="text-xs text-muted-foreground">
                ({deliverable.children.length} tasks)
              </span>
            )}
          </div>
          {deliverable.description && (
            <p className="text-sm text-muted-foreground mt-1">{deliverable.description}</p>
          )}
        </div>
      </div>
      {hasChildren && (
        <div>
          {deliverable.children.map((child) => (
            <DeliverableTreeItem key={child.id} deliverable={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

function getSignoffStatusInfo(
  isSignedOff: boolean,
  isAwaitingSignoff: boolean,
  isDeliverablesConfirmed: boolean
) {
  if (isSignedOff) {
    return {
      label: 'Signed Off',
      className: 'bg-[--signal-good-dim] text-[--signal-good]',
      description: 'Deliverables have been confirmed and locked.',
    }
  }
  if (isAwaitingSignoff) {
    return {
      label: 'Awaiting Sign-off',
      className: 'bg-[color:var(--accent-dim)] text-[color:var(--accent)]',
      description: 'Waiting for DFY partner to confirm on behalf of client.',
    }
  }
  if (isDeliverablesConfirmed) {
    return {
      label: 'Confirmed',
      className: 'bg-[color:var(--accent-dim)] text-[color:var(--accent)]',
      description: 'Deliverables confirmed, ready to send for sign-off.',
    }
  }
  return {
    label: 'Pending',
    className: '',
    description: 'Deliverables need to be reviewed and confirmed.',
  }
}

export interface DeliverablesSheetProps {
  project: ProjectWithRelations
  userRole: UserRole
  isAdmin: boolean
  isDfy: boolean
}

export function DeliverablesSheet({ project, userRole, isAdmin, isDfy }: DeliverablesSheetProps) {
  const [isLoading, setIsLoading] = useState(false)

  const deliverables = project.deliverables || []
  const deliverableTree = buildDeliverableTree(deliverables)

  const isLocked = isDeliverablesLocked(project.status)
  const isSignedOff = project.signed_off_at !== null
  const isDeliverablesConfirmed =
    ['awaiting_signoff', 'signed_off'].includes(project.status) || isLocked
  const isAwaitingSignoff = project.status === 'awaiting_signoff'

  const completedDeliverables = deliverables.filter((d) => d.status === 'done').length
  const deliverablesProgress =
    deliverables.length > 0
      ? Math.round((completedDeliverables / deliverables.length) * 100)
      : 0

  const signoffStatus = getSignoffStatusInfo(isSignedOff, isAwaitingSignoff, isDeliverablesConfirmed)

  const handleConfirmDeliverables = async () => {
    setIsLoading(true)
    try {
      await confirmDeliverablesAction(project.id)
      toast.success('Deliverables confirmed')
    } catch (error) {
      console.error('Failed to confirm deliverables:', error)
      toast.error('Failed to confirm deliverables')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendForSignoff = async () => {
    setIsLoading(true)
    try {
      await sendForSignoffAction(project.id)
      toast.success('Sent for sign-off')
    } catch (error) {
      console.error('Failed to send for signoff:', error)
      toast.error('Failed to send for sign-off')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOff = async () => {
    setIsLoading(true)
    try {
      await signOffDeliverablesAction(project.id)
      toast.success('Deliverables signed off successfully')
    } catch (error) {
      console.error('Failed to sign off:', error)
      toast.error('Failed to sign off')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6 py-4 overflow-y-auto">
      {/* Sign-off status badge */}
      <div className="flex items-center gap-2">
        <Badge className={signoffStatus.className}>{signoffStatus.label}</Badge>
        <span className="text-sm text-muted-foreground">{signoffStatus.description}</span>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">
            {completedDeliverables} / {deliverables.length}
          </span>
        </div>
        <Progress value={deliverablesProgress} className="h-2" />
      </div>

      {/* Full deliverables tree */}
      <div className="space-y-2">
        {deliverableTree.map((d) => (
          <DeliverableTreeItem key={d.id} deliverable={d} depth={0} />
        ))}
        {deliverables.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No deliverables yet.</p>
        )}
      </div>

      {/* Sign-off actions */}
      <div className="flex items-center gap-3 border-t pt-4">
        {isAdmin && !isLocked && !isDeliverablesConfirmed && (
          <Button size="sm" onClick={handleConfirmDeliverables} disabled={isLoading}>
            Confirm Deliverables
          </Button>
        )}
        {isAdmin && isDeliverablesConfirmed && !isAwaitingSignoff && !isSignedOff && (
          <ButtonHoldAndRelease
            onHoldComplete={handleSendForSignoff}
            disabled={isLoading}
            variant="default"
            defaultText="Send for Sign-off"
            holdingText="Release to Send"
          />
        )}
        {isDfy && isAwaitingSignoff && (
          <ButtonHoldAndRelease
            onHoldComplete={handleSignOff}
            disabled={isLoading}
            variant="default"
            defaultText="Confirm on Behalf of Client"
            holdingText="Release to Confirm"
          />
        )}
      </div>

      {/* Locked indicator */}
      {isSignedOff && (
        <div className="flex items-center gap-2 text-sm text-[--signal-good]">
          <Lock className="h-4 w-4" />
          <span>Deliverables are locked as the source of truth</span>
        </div>
      )}
    </div>
  )
}
