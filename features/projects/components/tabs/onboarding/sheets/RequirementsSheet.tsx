'use client'

import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, Circle, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OnboardingRequirement } from '@/lib/api/onboarding-requirements'

export interface RequirementsSheetProps {
  requirements: OnboardingRequirement[]
  projectId: string
  isAdmin: boolean
}

export function RequirementsSheet({ requirements, projectId: _projectId, isAdmin: _isAdmin }: RequirementsSheetProps) {
  const completedRequirements = requirements.filter((r) => r.status === 'approved').length
  const requirementsProgress =
    requirements.length > 0
      ? Math.round((completedRequirements / requirements.length) * 100)
      : 0
  const blockerCount = requirements.filter(
    (r) => r.blocker_type === 'absolute' && r.status !== 'approved'
  ).length

  return (
    <div className="space-y-6 py-4 overflow-y-auto">
      {/* Progress bar */}
      <Progress value={requirementsProgress} className="h-2" />

      {/* Blocker warning */}
      {blockerCount > 0 && (
        <div
          className="flex items-center gap-2 text-sm rounded-md px-3 py-2"
          style={{
            backgroundColor: 'var(--signal-warn-dim)',
            color: 'var(--signal-warn)',
          }}
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            {blockerCount} blocker{blockerCount > 1 ? 's' : ''} require
            {blockerCount === 1 ? 's' : ''} attention
          </span>
        </div>
      )}

      {/* Full requirements list */}
      <div className="space-y-2">
        {requirements.map((req) => (
          <div
            key={req.id}
            className="flex items-start gap-3 py-2 px-2 rounded-lg hover:bg-muted/50"
          >
            {/* Status icon */}
            {req.status === 'approved' ? (
              <CheckCircle2 className="h-5 w-5 text-[--signal-good] shrink-0 mt-0.5" />
            ) : req.status === 'blocked' ? (
              <AlertTriangle className="h-5 w-5 text-[--signal-bad] shrink-0 mt-0.5" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p
                  className={cn(
                    'font-medium',
                    req.status === 'approved' && 'line-through text-muted-foreground'
                  )}
                >
                  {req.title}
                </p>

                {/* Status badge */}
                <Badge
                  variant="secondary"
                  className={cn(
                    req.status === 'approved' && 'bg-[--signal-good-dim] text-[--signal-good]',
                    req.status === 'in_progress' &&
                      'bg-[color:var(--accent-dim)] text-[color:var(--accent)]',
                    req.status === 'blocked' && 'bg-[--signal-bad-dim] text-[--signal-bad]'
                  )}
                >
                  {req.status.replace(/_/g, ' ')}
                </Badge>

                {/* Blocker badge */}
                {req.blocker_type === 'absolute' && req.status !== 'approved' && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-[--signal-bad-dim] text-[--signal-bad]"
                  >
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

      <div className="border-t pt-4">
        <p className="text-sm text-muted-foreground">
          To add or edit requirements, use the Requirements tab.
        </p>
      </div>
    </div>
  )
}
