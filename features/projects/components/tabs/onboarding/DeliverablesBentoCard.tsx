'use client'

import { CheckCircle2, Minus, FileCheck } from 'lucide-react'
import { BentoCard } from './BentoCard'
import { DeliverablesSheet } from './sheets/DeliverablesSheet'
import type { ProjectWithRelations } from '@/lib/api/projects'
import type { UserRole } from '@/lib/auth/types'

// Local type for deliverable
type ProjectDeliverable = NonNullable<ProjectWithRelations['deliverables']>[number]

interface DeliverableTreeNode extends ProjectDeliverable {
  children: DeliverableTreeNode[]
}

export function buildDeliverableTree(deliverables: ProjectDeliverable[]): DeliverableTreeNode[] {
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

interface DeliverablesBentoCardProps {
  project: ProjectWithRelations
  progress: { total: number; completed: number }
  userRole: UserRole
  isAdmin: boolean
  isDfy: boolean
}

function getSignoffStatusLabel(project: ProjectWithRelations) {
  if (project.signed_off_at) return 'Signed Off'
  if (project.status === 'awaiting_signoff') return 'Awaiting Sign-off'
  if (['awaiting_signoff', 'signed_off'].includes(project.status)) return 'Confirmed'
  return 'Pending'
}

export function DeliverablesBentoCard({
  project,
  progress,
  userRole,
  isAdmin,
  isDfy,
}: DeliverablesBentoCardProps) {
  const deliverables = project.deliverables || []
  const deliverableTree = buildDeliverableTree(deliverables)
  const isComplete = progress.total > 0 && progress.completed === progress.total
  const signoffLabel = getSignoffStatusLabel(project)

  return (
    <BentoCard
      slug="deliverables"
      isComplete={isComplete}
      hasRequiredIncomplete={false}
      sheetTitle="Deliverables Sign-off"
      sheetContent={
        <DeliverablesSheet
          project={project}
          userRole={userRole}
          isAdmin={isAdmin}
          isDfy={isDfy}
        />
      }
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-muted-foreground shrink-0" />
            <h3 className="font-medium text-sm">Deliverables</h3>
          </div>
          <span className="text-xs font-medium text-muted-foreground shrink-0">{signoffLabel}</span>
        </div>

        {/* Completion fraction */}
        <p className="text-xs text-muted-foreground">
          {progress.completed}/{progress.total} completed
        </p>

        {/* Tree preview */}
        <div className="space-y-1">
          {deliverableTree.slice(0, 4).map((d) => (
            <div key={d.id} className="flex items-center gap-2 text-xs py-0.5">
              {d.status === 'done' ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-[--signal-good] shrink-0" />
              ) : (
                <Minus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
              <span className={d.status === 'done' ? 'text-muted-foreground line-through' : ''}>
                {d.title}
              </span>
              {d.children.length > 0 && (
                <span className="text-muted-foreground">({d.children.length})</span>
              )}
            </div>
          ))}
          {deliverableTree.length > 4 && (
            <p className="text-xs text-muted-foreground">+{deliverableTree.length - 4} more</p>
          )}
          {deliverables.length === 0 && (
            <p className="text-xs text-muted-foreground">No deliverables yet</p>
          )}
        </div>
      </div>
    </BentoCard>
  )
}
