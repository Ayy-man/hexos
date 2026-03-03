'use client'

import { Suspense, useState } from 'react'
import { useOnboardingProgress } from './hooks/use-onboarding-progress'
import { OnboardingProgressSummary } from './OnboardingProgressSummary'
import { CategoryBentoCard } from './CategoryBentoCard'
import { DeliverablesBentoCard } from './DeliverablesBentoCard'
import { RequirementsBentoCard } from './RequirementsBentoCard'
import type { ProjectWithRelations } from '@/lib/api/projects'
import type { OnboardingCategory } from '@/lib/api/onboarding-categories'
import type { OnboardingQuestion } from '@/lib/api/onboarding-questions'
import type { OnboardingAnswer } from '@/lib/api/onboarding-answers'
import type { OnboardingRequirement } from '@/lib/api/onboarding-requirements'
import type { UserRole } from '@/lib/auth/types'

interface OnboardingBentoGridProps {
  project: ProjectWithRelations & {
    requirements?: OnboardingRequirement[]
  }
  categories: OnboardingCategory[]
  questions: OnboardingQuestion[]
  answers: OnboardingAnswer[]
  requirements: OnboardingRequirement[]
  userRole: UserRole
  isAdmin: boolean
  isDfy: boolean
}

function OnboardingGridSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-4 bg-muted animate-pulse rounded w-48" />
        <div className="h-2 bg-muted animate-pulse rounded" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="border rounded-lg p-4 space-y-3">
            <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
            <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
            <div className="h-1.5 bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

function OnboardingBentoGridInner({
  project,
  categories,
  questions,
  answers,
  requirements,
  isAdmin,
}: OnboardingBentoGridProps) {
  const [showOverflow, setShowOverflow] = useState(false)

  const progress = useOnboardingProgress(
    categories,
    questions,
    answers,
    requirements,
    project.deliverables || []
  )

  // Sort categories: incomplete first, then by position
  const sortedCategories = [...categories].sort((a, b) => {
    const aProgress = progress.byCategory.find((p) => p.categoryId === a.id)
    const bProgress = progress.byCategory.find((p) => p.categoryId === b.id)
    const aComplete =
      aProgress && aProgress.completed === aProgress.total && aProgress.total > 0
    const bComplete =
      bProgress && bProgress.completed === bProgress.total && bProgress.total > 0
    if (aComplete !== bComplete) return aComplete ? 1 : -1
    return a.position - b.position
  })

  const visibleCategories = sortedCategories.slice(0, 6)
  const overflowCategories = sortedCategories.slice(6)

  return (
    <div className="space-y-6">
      <OnboardingProgressSummary
        total={progress.total}
        completed={progress.completed}
        percentage={progress.percentage}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Primary category card spans 2 rows on left if categories exist */}
        {visibleCategories.length > 0 && (
          <div className="md:row-span-2">
            <CategoryBentoCard
              category={visibleCategories[0]}
              progress={
                progress.byCategory.find(
                  (p) => p.categoryId === visibleCategories[0].id
                )!
              }
            />
          </div>
        )}

        {/* Fixed cards on the right, stacked */}
        <DeliverablesBentoCard
          project={project}
          progress={progress.deliverablesProgress}
        />
        <RequirementsBentoCard
          requirements={requirements}
          progress={progress.requirementsProgress}
        />

        {/* Remaining category cards */}
        {visibleCategories.slice(1).map((cat) => (
          <CategoryBentoCard
            key={cat.id}
            category={cat}
            progress={
              progress.byCategory.find((p) => p.categoryId === cat.id)!
            }
          />
        ))}
      </div>

      {/* Overflow section */}
      {overflowCategories.length > 0 && (
        <div className="space-y-4">
          {showOverflow && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {overflowCategories.map((cat) => (
                <CategoryBentoCard
                  key={cat.id}
                  category={cat}
                  progress={
                    progress.byCategory.find((p) => p.categoryId === cat.id)!
                  }
                />
              ))}
            </div>
          )}
          <button
            onClick={() => setShowOverflow((prev) => !prev)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {showOverflow
              ? 'Show less'
              : `Show ${overflowCategories.length} more ${overflowCategories.length === 1 ? 'section' : 'sections'}`}
          </button>
        </div>
      )}

      {/* Empty state: no categories */}
      {categories.length === 0 && !isAdmin && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">
            Your team is setting up the onboarding form. You&apos;ll be notified when it&apos;s ready.
          </p>
        </div>
      )}

      {/* Empty state for admin: no categories yet */}
      {categories.length === 0 && isAdmin && (
        <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
          <p className="text-sm font-medium mb-1">No onboarding sections yet</p>
          <p className="text-xs">Add categories and questions to build the onboarding form.</p>
        </div>
      )}
    </div>
  )
}

export function OnboardingBentoGrid(props: OnboardingBentoGridProps) {
  return (
    <Suspense fallback={<OnboardingGridSkeleton />}>
      <OnboardingBentoGridInner {...props} />
    </Suspense>
  )
}
