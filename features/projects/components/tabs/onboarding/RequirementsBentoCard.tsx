'use client'

import { CheckCircle2, Minus, AlertTriangle, ClipboardList } from 'lucide-react'
import { BentoCard } from './BentoCard'
import { RequirementsSheet } from './sheets/RequirementsSheet'
import type { OnboardingRequirement } from '@/lib/api/onboarding-requirements'

interface RequirementsBentoCardProps {
  requirements: OnboardingRequirement[]
  progress: { total: number; completed: number; blockerCount: number }
  projectId: string
  isAdmin: boolean
}

export function RequirementsBentoCard({ requirements, progress, projectId, isAdmin }: RequirementsBentoCardProps) {
  const isComplete = progress.total > 0 && progress.completed === progress.total
  const hasBlockers = progress.blockerCount > 0

  return (
    <BentoCard
      slug="requirements"
      isComplete={isComplete}
      hasRequiredIncomplete={false}
      sheetTitle="Onboarding Requirements"
      sheetContent={
        <RequirementsSheet
          requirements={requirements}
          projectId={projectId}
          isAdmin={isAdmin}
        />
      }
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground shrink-0" />
            <h3 className="font-medium text-sm">Requirements</h3>
          </div>
          <span className="text-xs font-medium text-muted-foreground shrink-0">
            {progress.completed}/{progress.total} done
          </span>
        </div>

        {/* Blocker count */}
        {hasBlockers && (
          <div
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md"
            style={{
              backgroundColor: 'var(--signal-warn-dim)',
              color: 'var(--signal-warn)',
            }}
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>
              {progress.blockerCount} blocker{progress.blockerCount > 1 ? 's' : ''} require
              {progress.blockerCount === 1 ? 's' : ''} attention
            </span>
          </div>
        )}

        {/* Requirements preview */}
        <div className="space-y-1">
          {requirements.slice(0, 4).map((req) => (
            <div key={req.id} className="flex items-center gap-2 text-xs py-0.5">
              {req.status === 'approved' ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-[--signal-good] shrink-0" />
              ) : req.status === 'blocked' ? (
                <AlertTriangle className="h-3.5 w-3.5 text-[--signal-bad] shrink-0" />
              ) : (
                <Minus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
              <span className={req.status === 'approved' ? 'text-muted-foreground line-through' : ''}>
                {req.title}
              </span>
            </div>
          ))}
          {requirements.length > 4 && (
            <p className="text-xs text-muted-foreground">+{requirements.length - 4} more</p>
          )}
          {requirements.length === 0 && (
            <p className="text-xs text-muted-foreground">No requirements defined</p>
          )}
        </div>
      </div>
    </BentoCard>
  )
}
