'use client'

import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import {
  getProjectProgress,
  type ProjectProgress,
} from '@/lib/utils/projectProgress'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface ProjectProgressBarProps {
  project: {
    status: string
    deliverables?: Array<{ id: string; status: string; parent_id?: string | null; hill_position?: number }> | null
    requirements?: Array<{ id: string; status: string }> | null
  }
  variant?: 'compact' | 'detailed'
  showLabel?: boolean
  className?: string
}

export function ProjectProgressBar({
  project,
  variant = 'compact',
  showLabel = true,
  className,
}: ProjectProgressBarProps) {
  const progress = getProjectProgress(project)

  // Blue indicator for onboarding phases, default for development
  const indicatorClass = progress.isOnboardingPhase
    ? '[&>div]:bg-blue-500'
    : '[&>div]:bg-primary'

  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn('flex items-center gap-2', className)}>
              <Progress
                value={progress.percentage}
                className={cn('h-2 w-16 flex-shrink-0', indicatorClass)}
              />
              {showLabel && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {progress.percentage}%
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">{progress.label}</p>
            {progress.type === 'requirements' && progress.details.requirements && (
              <p className="text-xs text-muted-foreground">
                {progress.details.requirements.completed} of{' '}
                {progress.details.requirements.total} requirements complete
              </p>
            )}
            {progress.type === 'hillchart' && progress.details.hillChart && (
              <p className="text-xs text-muted-foreground">
                Average of {progress.details.hillChart.subDeliverableCount} deliverables
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Phase: {progress.details.phase.phaseLabel}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Detailed variant for project detail page
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Progress</span>
        <span className="text-sm text-muted-foreground">
          {progress.percentage}%
        </span>
      </div>
      <Progress value={progress.percentage} className={cn('h-2', indicatorClass)} />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{progress.label}</span>
        <span>Phase: {progress.details.phase.phaseLabel}</span>
      </div>
    </div>
  )
}

/**
 * Inline progress indicator for mobile cards
 */
export function ProjectProgressInline({
  project,
  className,
}: {
  project: {
    status: string
    deliverables?: Array<{ id: string; status: string; parent_id?: string | null; hill_position?: number }> | null
    requirements?: Array<{ id: string; status: string }> | null
  }
  className?: string
}) {
  const progress = getProjectProgress(project)

  // Blue for onboarding phases, default for development
  const barColor = progress.isOnboardingPhase ? 'bg-blue-500' : 'bg-primary'

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full transition-all', barColor)}
          style={{ width: `${progress.percentage}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground shrink-0">
        {progress.percentage}%
      </span>
    </div>
  )
}
