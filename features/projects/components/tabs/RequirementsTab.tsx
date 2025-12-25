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
  Lock,
  Link2,
  User,
  Users,
  Plus,
} from 'lucide-react'
import { toast } from 'sonner'
import { useRequirementsRealtime } from '@/hooks/use-requirements-realtime'
import { DependencySelector } from './DependencySelector'
import type { ProjectWithRelations } from '@/lib/api/projects'
import type { ProjectRequirement } from '@/lib/api/project-requirements'
import type { UserRole } from '@/lib/auth/types'
import {
  updateRequirementStatusAction,
  updateRequirementDependenciesAction,
} from '../../actions/projectActions'

interface RequirementsTabProps {
  project: ProjectWithRelations
  requirements: ProjectRequirement[]
  userRole: UserRole
  isAdmin: boolean
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
  in_progress: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  blocked: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  client: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function RequirementsTab({
  project,
  requirements: initialRequirements,
  userRole,
  isAdmin,
}: RequirementsTabProps) {
  const [updating, setUpdating] = useState<string | null>(null)
  const [selectedRequirement, setSelectedRequirement] = useState<ProjectRequirement | null>(null)

  // Real-time subscription
  const { requirements } = useRequirementsRealtime({
    projectId: project.id,
    initialRequirements,
  })

  // Filter requirements based on user role
  const visibleRequirements = requirements.filter((r) => {
    if (isAdmin || userRole === 'internal') return true
    if (userRole === 'dev') return r.assigned_role === 'admin' // Devs see admin tasks
    if (userRole === 'dfy') return true // DFY sees all for their projects
    if (userRole === 'client') return r.assigned_role === 'client' // Clients see only client tasks
    return false
  })

  // Calculate progress based on visible requirements
  const completedCount = visibleRequirements.filter((r) => r.status === 'completed').length
  const progressPercent =
    visibleRequirements.length > 0
      ? Math.round((completedCount / visibleRequirements.length) * 100)
      : 0

  // Get blocked dependencies for a requirement
  const getBlockedBy = (req: ProjectRequirement): string[] => {
    if (!req.dependencies || req.dependencies.length === 0) return []
    return req.dependencies
      .filter((d) => d.depends_on && d.depends_on.status !== 'completed')
      .map((d) => d.depends_on?.title || 'Unknown')
  }

  // Check if a requirement is blocked
  const isBlocked = (req: ProjectRequirement): boolean => {
    return getBlockedBy(req).length > 0
  }

  // Check if user can complete a requirement
  const canComplete = (req: ProjectRequirement): boolean => {
    // Can't complete if blocked by dependencies
    if (isBlocked(req)) return false

    // Role-based permissions
    if (isAdmin) return true
    if (userRole === 'dfy') return true // DFY can complete on client's behalf
    if (userRole === 'dev') return false // Devs can only view
    if (userRole === 'client') return req.assigned_role === 'client'
    return false
  }

  const handleToggleComplete = async (requirement: ProjectRequirement) => {
    if (!canComplete(requirement) && requirement.status !== 'completed') {
      const blockedBy = getBlockedBy(requirement)
      if (blockedBy.length > 0) {
        toast.error(`Cannot complete: waiting on ${blockedBy.join(', ')}`)
      }
      return
    }

    setUpdating(requirement.id)
    try {
      const newStatus = requirement.status === 'completed' ? 'pending' : 'completed'
      const result = await updateRequirementStatusAction(requirement.id, newStatus)

      if (!result.success && result.error) {
        toast.error(result.error)
      }
    } catch (error) {
      console.error('Failed to update requirement:', error)
      toast.error('Failed to update requirement')
    } finally {
      setUpdating(null)
    }
  }

  const handleSaveDependencies = async (dependsOnIds: string[]) => {
    if (!selectedRequirement) return
    try {
      await updateRequirementDependenciesAction(selectedRequirement.id, dependsOnIds)
      toast.success('Dependencies updated')
    } catch (error) {
      console.error('Failed to update dependencies:', error)
      toast.error('Failed to update dependencies')
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
              {completedCount} / {visibleRequirements.length} ({progressPercent}%)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Requirements List */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Requirements Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          {visibleRequirements.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No requirements defined for this project.
            </p>
          ) : (
            <div className="divide-y">
              {visibleRequirements.map((requirement) => {
                const blocked = isBlocked(requirement)
                const blockedBy = getBlockedBy(requirement)
                const canToggle = canComplete(requirement) || requirement.status === 'completed'

                return (
                  <div
                    key={requirement.id}
                    className={`flex items-start gap-3 py-3 ${
                      blocked ? 'opacity-60' : ''
                    }`}
                  >
                    {canToggle && !blocked ? (
                      <Checkbox
                        checked={requirement.status === 'completed'}
                        onCheckedChange={() => handleToggleComplete(requirement)}
                        disabled={updating === requirement.id}
                        className="mt-0.5"
                      />
                    ) : (
                      <div className="mt-0.5">
                        {blocked ? (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        ) : requirement.status === 'completed' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className={`font-medium ${
                            requirement.status === 'completed'
                              ? 'line-through text-muted-foreground'
                              : ''
                          }`}
                        >
                          {requirement.title}
                        </p>
                        {/* Role badge */}
                        <Badge
                          variant="outline"
                          className={`text-xs ${ROLE_COLORS[requirement.assigned_role]}`}
                        >
                          {requirement.assigned_role === 'admin' ? (
                            <Users className="h-3 w-3 mr-1" />
                          ) : (
                            <User className="h-3 w-3 mr-1" />
                          )}
                          {requirement.assigned_role === 'admin' ? 'Internal' : 'Client'}
                        </Badge>
                      </div>
                      {requirement.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {requirement.description}
                        </p>
                      )}
                      {/* Blocked message */}
                      {blocked && (
                        <p className="text-sm text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                          <Lock className="h-3 w-3" />
                          Waiting on: {blockedBy.join(', ')}
                        </p>
                      )}
                      {/* Dependencies count */}
                      {requirement.dependencies && requirement.dependencies.length > 0 && !blocked && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {requirement.dependencies.length} prerequisite(s) completed
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Dependency link button (admin only) */}
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setSelectedRequirement(requirement)}
                          title="Manage dependencies"
                        >
                          <Link2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Badge
                        variant="secondary"
                        className={STATUS_COLORS[requirement.status] || STATUS_COLORS.pending}
                      >
                        {formatStatus(requirement.status)}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dependency Selector Modal */}
      {selectedRequirement && (
        <DependencySelector
          open={!!selectedRequirement}
          onOpenChange={(open) => !open && setSelectedRequirement(null)}
          requirement={selectedRequirement}
          allRequirements={requirements}
          onSave={handleSaveDependencies}
        />
      )}
    </div>
  )
}
