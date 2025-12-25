'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, Circle, Clock, AlertCircle, Plus } from 'lucide-react'
import type { ProjectWithRelations } from '@/lib/api/projects'
import type { UserRole } from '@/lib/auth/types'
import { updateRequirementStatusAction } from '../../actions/projectActions'

interface Requirement {
  id: string
  title: string
  description: string | null
  status: string
  completed_at: string | null
}

interface RequirementsTabProps {
  project: ProjectWithRelations
  requirements: Requirement[]
  userRole: UserRole
  isAdmin: boolean
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
  in_progress: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  blocked: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function RequirementsTab({
  project,
  requirements,
  userRole,
  isAdmin,
}: RequirementsTabProps) {
  const [updating, setUpdating] = useState<string | null>(null)

  const completedCount = requirements.filter((r) => r.status === 'completed').length
  const progressPercent = requirements.length > 0
    ? Math.round((completedCount / requirements.length) * 100)
    : 0

  const handleToggleComplete = async (requirement: Requirement) => {
    setUpdating(requirement.id)
    try {
      const newStatus = requirement.status === 'completed' ? 'pending' : 'completed'
      await updateRequirementStatusAction(requirement.id, newStatus)
    } catch (error) {
      console.error('Failed to update requirement:', error)
    } finally {
      setUpdating(null)
    }
  }

  // Can toggle: admin always, dev if assigned
  const canToggle = isAdmin || userRole === 'dev'

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
        </CardHeader>
        <CardContent>
          {requirements.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No requirements defined for this project.
            </p>
          ) : (
            <div className="divide-y">
              {requirements.map((requirement) => (
                <div
                  key={requirement.id}
                  className="flex items-start gap-3 py-3"
                >
                  {canToggle ? (
                    <Checkbox
                      checked={requirement.status === 'completed'}
                      onCheckedChange={() => handleToggleComplete(requirement)}
                      disabled={updating === requirement.id}
                      className="mt-0.5"
                    />
                  ) : (
                    <div className="mt-0.5">
                      {requirement.status === 'completed' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-medium ${
                        requirement.status === 'completed'
                          ? 'line-through text-muted-foreground'
                          : ''
                      }`}
                    >
                      {requirement.title}
                    </p>
                    {requirement.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {requirement.description}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant="secondary"
                    className={STATUS_COLORS[requirement.status] || STATUS_COLORS.pending}
                  >
                    {formatStatus(requirement.status)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
