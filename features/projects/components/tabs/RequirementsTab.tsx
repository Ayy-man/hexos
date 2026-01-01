'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import {
  CheckCircle2,
  Circle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Video,
  Plus,
} from 'lucide-react'
import { toast } from 'sonner'
import type { ProjectWithRelations } from '@/lib/api/projects'
import type { OnboardingRequirement } from '@/lib/api/onboarding-requirements'
import type { UserRole } from '@/lib/auth/types'
import { markRequirementCompleteAction } from '../../actions/projectActions'

interface RequirementsTabProps {
  project: ProjectWithRelations
  requirements: OnboardingRequirement[]
  userRole: UserRole
  isAdmin: boolean
}

// Owner type colors and labels
const OWNER_COLORS: Record<string, string> = {
  hexona: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
  dfy: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  client: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
}

const OWNER_LABELS: Record<string, string> = {
  hexona: 'Hexona',
  dfy: 'DFY',
  client: 'Client',
}

// Status colors
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  submitted: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  blocked: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

// Blocker type indicators
const BLOCKER_STYLES: Record<string, { color: string; label: string }> = {
  none: { color: '', label: '' },
  partial: { color: 'border-l-4 border-l-amber-500', label: 'Partial Blocker' },
  absolute: { color: 'border-l-4 border-l-red-500', label: 'Blocker' },
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// Build tree structure from flat array
interface RequirementTreeNode extends OnboardingRequirement {
  children: RequirementTreeNode[]
}

function buildTree(requirements: OnboardingRequirement[]): RequirementTreeNode[] {
  const nodeMap = new Map<string, RequirementTreeNode>()
  const roots: RequirementTreeNode[] = []

  // First pass: create nodes
  requirements.forEach((req) => {
    nodeMap.set(req.id, { ...req, children: [] })
  })

  // Second pass: build tree
  requirements.forEach((req) => {
    const node = nodeMap.get(req.id)!
    if (req.parent_id && nodeMap.has(req.parent_id)) {
      nodeMap.get(req.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  })

  return roots
}

// Recursive requirement item component
function RequirementItem({
  requirement,
  depth = 0,
  userRole,
  isAdmin,
  updating,
  onToggleComplete,
  expandedIds,
  onToggleExpand,
}: {
  requirement: RequirementTreeNode
  depth?: number
  userRole: UserRole
  isAdmin: boolean
  updating: string | null
  onToggleComplete: (req: OnboardingRequirement) => void
  expandedIds: Set<string>
  onToggleExpand: (id: string) => void
}) {
  const hasChildren = requirement.children.length > 0
  const isExpanded = expandedIds.has(requirement.id)
  const blockerStyle = BLOCKER_STYLES[requirement.blocker_type || 'none']
  const isCompleted = requirement.status === 'approved'

  // Can user complete this requirement?
  const canComplete = (() => {
    if (isAdmin) return true
    if (userRole === 'dfy' && requirement.owner_type === 'dfy') return true
    if (userRole === 'client' && requirement.owner_type === 'client') return true
    return false
  })()

  return (
    <div>
      <div
        className={`flex items-start gap-3 py-3 px-3 hover:bg-muted/50 rounded-lg ${blockerStyle.color}`}
        style={{ marginLeft: depth * 24 }}
      >
        {/* Expand/collapse for items with children */}
        {hasChildren ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={() => onToggleExpand(requirement.id)}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        ) : (
          <div className="w-5" /> // Spacer
        )}

        {/* Checkbox or status icon */}
        {canComplete ? (
          <Checkbox
            checked={isCompleted}
            onCheckedChange={() => onToggleComplete(requirement)}
            disabled={updating === requirement.id}
            className="mt-0.5"
          />
        ) : (
          <div className="mt-0.5">
            {isCompleted ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : requirement.status === 'blocked' ? (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p
              className={`font-medium ${
                isCompleted ? 'line-through text-muted-foreground' : ''
              }`}
            >
              {requirement.title}
            </p>
            {/* Owner badge */}
            <Badge
              variant="outline"
              className={`text-xs ${OWNER_COLORS[requirement.owner_type || 'hexona']}`}
            >
              {OWNER_LABELS[requirement.owner_type || 'hexona']}
            </Badge>
            {/* Blocker badge */}
            {blockerStyle.label && (
              <Badge variant="outline" className="text-xs bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-300">
                {blockerStyle.label}
              </Badge>
            )}
          </div>
          {requirement.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {requirement.description}
            </p>
          )}
          {requirement.notes && (
            <p className="text-sm text-muted-foreground/80 mt-1 italic">
              {requirement.notes}
            </p>
          )}
          {/* Links */}
          <div className="flex items-center gap-3 mt-2">
            {requirement.loom_url && (
              <a
                href={requirement.loom_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
              >
                <Video className="h-3 w-3" />
                Loom
              </a>
            )}
            {requirement.resource_url && (
              <a
                href={requirement.resource_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                Resource
              </a>
            )}
          </div>
        </div>

        {/* Status badge */}
        <Badge
          variant="secondary"
          className={STATUS_COLORS[requirement.status] || STATUS_COLORS.pending}
        >
          {formatStatus(requirement.status)}
        </Badge>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {requirement.children.map((child) => (
            <RequirementItem
              key={child.id}
              requirement={child}
              depth={depth + 1}
              userRole={userRole}
              isAdmin={isAdmin}
              updating={updating}
              onToggleComplete={onToggleComplete}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function RequirementsTab({
  project,
  requirements,
  userRole,
  isAdmin,
}: RequirementsTabProps) {
  const [updating, setUpdating] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Build tree from flat requirements
  const tree = buildTree(requirements)

  // Calculate progress
  const completedCount = requirements.filter((r) => r.status === 'approved').length
  const progressPercent =
    requirements.length > 0
      ? Math.round((completedCount / requirements.length) * 100)
      : 0

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const expandAll = () => {
    const allIds = new Set(requirements.filter((r) =>
      requirements.some((child) => child.parent_id === r.id)
    ).map((r) => r.id))
    setExpandedIds(allIds)
  }

  const collapseAll = () => {
    setExpandedIds(new Set())
  }

  const handleToggleComplete = async (requirement: OnboardingRequirement) => {
    setUpdating(requirement.id)
    try {
      // Toggle between pending and approved
      if (requirement.status === 'approved') {
        // TODO: Add action to uncomplete
        toast.info('Uncomplete not implemented yet')
      } else {
        await markRequirementCompleteAction(requirement.id, project.id)
        toast.success('Requirement marked complete')
      }
    } catch (error) {
      console.error('Failed to update requirement:', error)
      toast.error('Failed to update requirement')
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Onboarding Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Progress value={progressPercent} className="flex-1" />
            <span className="text-sm font-medium">
              {completedCount} / {requirements.length} ({progressPercent}%)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Requirements List */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Requirements Checklist</CardTitle>
          <div className="flex items-center gap-2">
            {requirements.length > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={expandAll}>
                  Expand All
                </Button>
                <Button variant="outline" size="sm" onClick={collapseAll}>
                  Collapse
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {requirements.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No requirements defined for this project.
            </p>
          ) : (
            <div className="space-y-1">
              {tree.map((requirement) => (
                <RequirementItem
                  key={requirement.id}
                  requirement={requirement}
                  userRole={userRole}
                  isAdmin={isAdmin}
                  updating={updating}
                  onToggleComplete={handleToggleComplete}
                  expandedIds={expandedIds}
                  onToggleExpand={toggleExpand}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
