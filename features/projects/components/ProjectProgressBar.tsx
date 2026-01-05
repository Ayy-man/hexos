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
    deliverables?: Array<{ id: string; status: string }> | null
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

  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn('flex items-center gap-2', className)}>
              <Progress
                value={progress.percentage}
                className="h-2 w-16 flex-shrink-0"
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
            {progress.type === 'deliverables' && progress.details.deliverables && (
              <p className="text-xs text-muted-foreground">
                {progress.details.deliverables.completed} of{' '}
                {progress.details.deliverables.total} deliverables complete
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
      <Progress value={progress.percentage} className="h-2" />
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
    deliverables?: Array<{ id: string; status: string }> | null
  }
  className?: string
}) {
  const progress = getProjectProgress(project)

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground shrink-0">
        {progress.percentage}%
      </span>
    </div>
  )
}
