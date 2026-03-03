'use client'

import { Suspense, useState, useTransition, useRef } from 'react'
import { useOnboardingProgress } from './hooks/use-onboarding-progress'
import { OnboardingProgressSummary } from './OnboardingProgressSummary'
import { CategoryBentoCard } from './CategoryBentoCard'
import { DeliverablesBentoCard } from './DeliverablesBentoCard'
import { RequirementsBentoCard } from './RequirementsBentoCard'
import { PreviewToggle } from './admin/PreviewToggle'
import { Sortable, SortableItem } from '@/components/ui/sortable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { addCategoryAction, reorderCategoriesAction } from '@/features/projects/actions/onboardingFormActions'
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

interface SortableCategoryItem {
  id: string
}

function OnboardingBentoGridInner({
  project,
  categories,
  questions,
  answers,
  requirements,
  isAdmin,
  isDfy,
}: OnboardingBentoGridProps) {
  const [showOverflow, setShowOverflow] = useState(false)
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [sortedCategories, setSortedCategories] = useState<OnboardingCategory[]>(
    [...categories].sort((a, b) => a.position - b.position)
  )
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategoryTitle, setNewCategoryTitle] = useState('')
  const [isPending, startTransition] = useTransition()
  const addInputRef = useRef<HTMLInputElement>(null)

  const progress = useOnboardingProgress(
    sortedCategories,
    questions,
    answers,
    requirements,
    project.deliverables || []
  )

  // Sort for display: incomplete first, then by position (for non-admin)
  // For admin we use sortedCategories directly (maintains drag-reorder state)
  const displayCategories = isAdmin
    ? sortedCategories
    : [...sortedCategories].sort((a, b) => {
        const aProgress = progress.byCategory.find((p) => p.categoryId === a.id)
        const bProgress = progress.byCategory.find((p) => p.categoryId === b.id)
        const aComplete =
          aProgress && aProgress.completed === aProgress.total && aProgress.total > 0
        const bComplete =
          bProgress && bProgress.completed === bProgress.total && bProgress.total > 0
        if (aComplete !== bComplete) return aComplete ? 1 : -1
        return a.position - b.position
      })

  const visibleCategories = displayCategories.slice(0, 6)
  const overflowCategories = displayCategories.slice(6)

  // Admin: handle category reorder via drag-and-drop
  const handleCategoryReorder = (newItems: SortableCategoryItem[]) => {
    const reordered = newItems
      .map((item: SortableCategoryItem) => sortedCategories.find((c: OnboardingCategory) => c.id === item.id))
      .filter((c): c is OnboardingCategory => c !== undefined)
    setSortedCategories(reordered)

    const updates = newItems.map((item: SortableCategoryItem, index: number) => ({
      id: item.id,
      position: index,
    }))

    startTransition(async () => {
      const result = await reorderCategoriesAction(project.id, updates)
      if (!result.success) {
        toast.error(result.error || 'Failed to reorder categories')
        setSortedCategories([...categories].sort((a: OnboardingCategory, b: OnboardingCategory) => a.position - b.position))
      }
    })
  }

  // Admin: handle add category inline
  const handleAddCategoryBlur = async () => {
    const trimmed = newCategoryTitle.trim()
    if (!trimmed) {
      setShowAddCategory(false)
      setNewCategoryTitle('')
      return
    }
    const result = await addCategoryAction(project.id, trimmed)
    if (!result.success) {
      toast.error(result.error || 'Failed to add category')
    } else {
      toast.success('Category added')
    }
    setShowAddCategory(false)
    setNewCategoryTitle('')
  }

  const handleAddCategoryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur()
    }
    if (e.key === 'Escape') {
      setShowAddCategory(false)
      setNewCategoryTitle('')
    }
  }

  const sortableItems: SortableCategoryItem[] = sortedCategories.map((c: OnboardingCategory) => ({ id: c.id }))

  const renderCategoryCard = (cat: OnboardingCategory, className?: string) => (
    <CategoryBentoCard
      key={cat.id}
      category={cat}
      progress={
        progress.byCategory.find((p) => p.categoryId === cat.id) ?? {
          categoryId: cat.id,
          title: cat.title,
          total: 0,
          completed: 0,
          requiredTotal: 0,
          requiredCompleted: 0,
          requiredRemaining: 0,
          lastEdited: null,
        }
      }
      questions={questions}
      answers={answers}
      requirements={requirements}
      projectId={project.id}
      isAdmin={isAdmin}
      isDfy={isDfy}
      isPreviewMode={isPreviewMode}
      className={className}
    />
  )

  return (
    <div className="space-y-6">
      {/* Top row: progress + admin preview toggle */}
      <div className="flex items-center justify-between gap-4">
        <OnboardingProgressSummary
          total={progress.total}
          completed={progress.completed}
          percentage={progress.percentage}
        />
        {isAdmin && (
          <PreviewToggle isPreview={isPreviewMode} onToggle={setIsPreviewMode} />
        )}
      </div>

      {/* Admin drag-and-drop grid */}
      {isAdmin ? (
        <Sortable
          value={sortableItems}
          onValueChange={handleCategoryReorder}
          getItemValue={(item: SortableCategoryItem) => item.id}
          strategy="grid"
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {/* Primary category card spans 2 rows on left if categories exist */}
          {visibleCategories.length > 0 && (
            <SortableItem
              key={visibleCategories[0].id}
              value={visibleCategories[0].id}
              className="md:row-span-2"
            >
              {renderCategoryCard(visibleCategories[0])}
            </SortableItem>
          )}

          {/* Fixed cards on the right, stacked (not sortable) */}
          <DeliverablesBentoCard
            project={project}
            progress={progress.deliverablesProgress}
          />
          <RequirementsBentoCard
            requirements={requirements}
            progress={progress.requirementsProgress}
          />

          {/* Remaining category cards */}
          {visibleCategories.slice(1).map((cat: OnboardingCategory) => (
            <SortableItem key={cat.id} value={cat.id}>
              {renderCategoryCard(cat)}
            </SortableItem>
          ))}
        </Sortable>
      ) : (
        /* Non-admin: static grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleCategories.length > 0 && (
            <div className="md:row-span-2">
              {renderCategoryCard(visibleCategories[0])}
            </div>
          )}

          <DeliverablesBentoCard
            project={project}
            progress={progress.deliverablesProgress}
          />
          <RequirementsBentoCard
            requirements={requirements}
            progress={progress.requirementsProgress}
          />

          {visibleCategories.slice(1).map((cat: OnboardingCategory) => renderCategoryCard(cat))}
        </div>
      )}

      {/* Overflow section */}
      {overflowCategories.length > 0 && (
        <div className="space-y-4">
          {showOverflow && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {overflowCategories.map((cat: OnboardingCategory) => renderCategoryCard(cat))}
            </div>
          )}
          <button
            onClick={() => setShowOverflow((prev: boolean) => !prev)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {showOverflow
              ? 'Show less'
              : `Show ${overflowCategories.length} more ${overflowCategories.length === 1 ? 'section' : 'sections'}`}
          </button>
        </div>
      )}

      {/* Admin: "+ Add Category" button */}
      {isAdmin && (
        <div className="pt-2">
          {showAddCategory ? (
            <Input
              ref={addInputRef}
              autoFocus
              value={newCategoryTitle}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCategoryTitle(e.target.value)}
              onBlur={handleAddCategoryBlur}
              onKeyDown={handleAddCategoryKeyDown}
              placeholder="Category title..."
              className="max-w-sm"
              disabled={isPending}
            />
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="border-dashed text-muted-foreground hover:text-foreground"
              onClick={() => setShowAddCategory(true)}
              disabled={isPending}
              type="button"
            >
              + Add Category
            </Button>
          )}
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
