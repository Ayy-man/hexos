'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  CheckCircle2,
  Circle,
  Lock,
  ChevronRight,
  FileCheck,
  ClipboardList,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import type { ProjectWithRelations } from '@/lib/api/projects'
import type { OnboardingRequirement } from '@/lib/api/onboarding-requirements'
import type { UserRole } from '@/lib/auth/types'
import { ButtonHoldAndRelease } from '@/components/ui/hold-and-release-button'
import {
  confirmDeliverablesAction,
  sendForSignoffAction,
  signOffDeliverablesAction,
} from '../../actions/projectActions'
import { isDeliverablesLocked } from '@/lib/utils/projectPhases'

// Local type for deliverable based on ProjectWithRelations
type ProjectDeliverable = NonNullable<ProjectWithRelations['deliverables']>[number]

interface OnboardingTabProps {
  project: ProjectWithRelations
  requirements: OnboardingRequirement[]
  userRole: UserRole
  isAdmin: boolean
  isDfy: boolean
}

// Status badge colors
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  done: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
}

// Tree node type
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

export function OnboardingTab({
  project,
  requirements,
  userRole,
  isAdmin,
  isDfy,
}: OnboardingTabProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isDeliverablesModalOpen, setIsDeliverablesModalOpen] = useState(false)
  const [isRequirementsModalOpen, setIsRequirementsModalOpen] = useState(false)

  const deliverables = project.deliverables || []
  const deliverableTree = buildDeliverableTree(deliverables)

  // Locked status
  const isLocked = isDeliverablesLocked(project.status)
  const isSignedOff = project.signed_off_at !== null

  // Sign-off flow status
  const isDeliverablesConfirmed = ['awaiting_signoff', 'signed_off'].includes(project.status) || isLocked
  const isAwaitingSignoff = project.status === 'awaiting_signoff'

  // Calculate deliverables progress
  const completedDeliverables = deliverables.filter((d) => d.status === 'done').length
  const deliverablesProgress = deliverables.length > 0
    ? Math.round((completedDeliverables / deliverables.length) * 100)
    : 0

  // Calculate requirements progress
  const completedRequirements = requirements.filter((r) => r.status === 'approved').length
  const requirementsProgress = requirements.length > 0
    ? Math.round((completedRequirements / requirements.length) * 100)
    : 0

  // Count blockers
  const blockerCount = requirements.filter(
    (r) => r.blocker_type === 'absolute' && r.status !== 'approved'
  ).length

  // Handlers
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

  // Get sign-off status info
  const getSignoffStatusInfo = () => {
    if (isSignedOff) {
      return {
        status: 'signed_off',
        label: 'Signed Off',
        color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
        description: 'Deliverables have been confirmed and locked.',
      }
    }
    if (isAwaitingSignoff) {
      return {
        status: 'awaiting',
        label: 'Awaiting Sign-off',
        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
        description: 'Waiting for DFY partner to confirm on behalf of client.',
      }
    }
    if (isDeliverablesConfirmed) {
      return {
        status: 'confirmed',
        label: 'Confirmed',
        color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
        description: 'Deliverables confirmed, ready to send for sign-off.',
      }
    }
    return {
      status: 'pending',
      label: 'Pending',
      color: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
      description: 'Deliverables need to be reviewed and confirmed.',
    }
  }

  const signoffStatus = getSignoffStatusInfo()

  return (
    <div className="space-y-6">
      {/* Deliverables Sign-off Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Deliverables Sign-off</CardTitle>
            </div>
            <Badge className={signoffStatus.color}>{signoffStatus.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{signoffStatus.description}</p>

          {/* Deliverables Summary */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">
                {completedDeliverables} / {deliverables.length}
              </span>
            </div>
            <Progress value={deliverablesProgress} className="h-2" />
          </div>

          {/* Deliverables list preview */}
          <div className="space-y-1">
            {deliverableTree.slice(0, 4).map((d) => (
              <div key={d.id} className="flex items-center gap-2 text-sm py-1">
                {d.status === 'done' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <span className={d.status === 'done' ? 'text-muted-foreground line-through' : ''}>
                  {d.title}
                </span>
                {d.children.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({d.children.length} tasks)
                  </span>
                )}
              </div>
            ))}
            {deliverableTree.length > 4 && (
              <p className="text-xs text-muted-foreground">
                +{deliverableTree.length - 4} more deliverables
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeliverablesModalOpen(true)}
            >
              View All Deliverables
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>

            {/* Sign-off actions */}
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
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 pt-2">
              <Lock className="h-4 w-4" />
              <span>Deliverables are locked as the source of truth</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Requirements Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Onboarding Requirements</CardTitle>
            </div>
            <Badge variant="secondary">
              {completedRequirements} / {requirements.length} done
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress */}
          <div className="space-y-2">
            <Progress value={requirementsProgress} className="h-2" />
          </div>

          {/* Blocker warning */}
          {blockerCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 rounded-md px-3 py-2">
              <AlertTriangle className="h-4 w-4" />
              <span>{blockerCount} blocker{blockerCount > 1 ? 's' : ''} require{blockerCount === 1 ? 's' : ''} attention</span>
            </div>
          )}

          {/* Requirements preview */}
          <div className="space-y-1">
            {requirements.slice(0, 5).map((req) => (
              <div key={req.id} className="flex items-center gap-2 text-sm py-1">
                {req.status === 'approved' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                ) : req.status === 'blocked' ? (
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <span className={req.status === 'approved' ? 'text-muted-foreground line-through' : ''}>
                  {req.title}
                </span>
                {req.blocker_type === 'absolute' && req.status !== 'approved' && (
                  <Badge variant="outline" className="text-xs bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-300">
                    Blocker
                  </Badge>
                )}
              </div>
            ))}
            {requirements.length > 5 && (
              <p className="text-xs text-muted-foreground">
                +{requirements.length - 5} more requirements
              </p>
            )}
            {requirements.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No requirements defined for this project.
              </p>
            )}
          </div>

          {/* Action */}
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRequirementsModalOpen(true)}
            >
              Manage Requirements
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Deliverables Modal */}
      <Dialog open={isDeliverablesModalOpen} onOpenChange={setIsDeliverablesModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>All Deliverables</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-4">
            {deliverableTree.map((d) => (
              <DeliverableTreeItem key={d.id} deliverable={d} depth={0} />
            ))}
            {deliverables.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No deliverables yet.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Requirements Modal */}
      <Dialog open={isRequirementsModalOpen} onOpenChange={setIsRequirementsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Onboarding Requirements</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-4">
            {requirements.map((req) => (
              <div key={req.id} className="flex items-start gap-3 py-2 px-2 rounded-lg hover:bg-muted/50">
                {req.status === 'approved' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                ) : req.status === 'blocked' ? (
                  <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`font-medium ${req.status === 'approved' ? 'line-through text-muted-foreground' : ''}`}>
                      {req.title}
                    </p>
                    <Badge variant="secondary" className={STATUS_COLORS[req.status] || STATUS_COLORS.pending}>
                      {req.status.replace(/_/g, ' ')}
                    </Badge>
                    {req.blocker_type === 'absolute' && req.status !== 'approved' && (
                      <Badge variant="outline" className="text-xs bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-300">
                        Blocker
                      </Badge>
                    )}
                  </div>
                  {req.description && (
                    <p className="text-sm text-muted-foreground mt-1">{req.description}</p>
                  )}
                </div>
              </div>
            ))}
            {requirements.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No requirements defined for this project.
              </p>
            )}
          </div>
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              To add or edit requirements, use the Requirements tab.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Recursive deliverable tree item for modal
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
          <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
        ) : deliverable.status === 'in_progress' ? (
          <Circle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`font-medium ${deliverable.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
              {deliverable.title}
            </p>
            <Badge variant="secondary" className={STATUS_COLORS[deliverable.status] || STATUS_COLORS.pending}>
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
