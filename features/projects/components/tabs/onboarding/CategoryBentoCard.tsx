'use client'

import { CheckCircle2, Clock, Minus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Progress } from '@/components/ui/progress'
import { BentoCard } from './BentoCard'
import type { OnboardingCategory } from '@/lib/api/onboarding-categories'
import type { CategoryProgress } from './hooks/use-onboarding-progress'

interface CategoryBentoCardProps {
  category: OnboardingCategory
  progress: CategoryProgress
}

function getStatusInfo(progress: CategoryProgress) {
  if (progress.total === 0) {
    return {
      label: 'Not started',
      icon: <Minus className="h-3.5 w-3.5" />,
      className: 'text-muted-foreground',
    }
  }
  if (progress.completed === progress.total) {
    return {
      label: 'Complete',
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      className: 'text-[--signal-good]',
    }
  }
  if (progress.completed > 0) {
    return {
      label: 'In progress',
      icon: <Clock className="h-3.5 w-3.5" />,
      className: 'text-muted-foreground',
    }
  }
  return {
    label: 'Not started',
    icon: <Minus className="h-3.5 w-3.5" />,
    className: 'text-muted-foreground',
  }
}

export function CategoryBentoCard({ category, progress }: CategoryBentoCardProps) {
  const isComplete = progress.total > 0 && progress.completed === progress.total
  const hasRequiredIncomplete = progress.requiredRemaining > 0
  const completionPercentage =
    progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0

  const status = getStatusInfo(progress)

  // Slug: use category id for URL state
  const slug = `category-${category.id}`

  return (
    <BentoCard
      slug={slug}
      isComplete={isComplete}
      hasRequiredIncomplete={hasRequiredIncomplete}
      sheetTitle={category.title}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-sm leading-snug">{category.title}</h3>
          <span className={`flex items-center gap-1 text-xs font-medium shrink-0 ${status.className}`}>
            {status.icon}
            {status.label}
          </span>
        </div>

        {/* Description */}
        {category.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{category.description}</p>
        )}

        {/* Completion fraction */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {progress.completed}/{progress.total} items answered
          </span>
          {hasRequiredIncomplete && (
            <span className="text-muted-foreground">
              {progress.requiredRemaining} required remaining
            </span>
          )}
        </div>

        {/* Progress bar */}
        <Progress value={completionPercentage} className="h-1.5" />

        {/* Last edited */}
        {progress.lastEdited && (
          <p className="text-xs text-muted-foreground">
            Last edited {formatDistanceToNow(new Date(progress.lastEdited), { addSuffix: true })}
          </p>
        )}
      </div>
    </BentoCard>
  )
}
