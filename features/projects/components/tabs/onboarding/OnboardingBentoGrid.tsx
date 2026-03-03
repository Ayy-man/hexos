'use client'

import { Suspense, useState, useTransition, useRef } from 'react'
import { CheckCircle2, Info } from 'lucide-react'
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
import { addCategoryAction, reorderCategoriesAction, markOnboardingCompleteAction } from '@/features/projects/actions/onboardingFormActions'
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
  /**
   * True when project has moved past onboarding phase.
   * Hides deliverables/requirements cards and shows the Q&A transition banner.
   */
  isPostOnboarding?: boolean
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
  userRole,
  isAdmin,
  isDfy,
  isPostOnboarding = false,
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

  // Completion flow state
  const [isMarkingComplete, setIsMarkingComplete] = useState(false)
  const [flaggedCategories, setFlaggedCategories] = useState<string[]>([])
  // Track whether mark-complete succeeded (shows success banner)
  const [completionSuccess, setCompletionSuccess] = useState(false)

  // Post-onboarding transition banner dismissal (localStorage)
  const bannerKey = `onboarding-banner-dismissed-${project.id}`
  const [isBannerDismissed, setIsBannerDismissed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(bannerKey) === 'true'
  })

  const progress = useOnboardingProgress(
    sortedCategories,
    questions,
    answers,
    requirements,
    project.deliverables || []
  )

  // All required categories answered = every category has requiredRemaining === 0
  // AND no absolute-blocker requirements are unapproved
  const allRequiredAnswered =
    progress.byCategory.every((c) => c.requiredRemaining === 0) &&
    requirements.filter((r) => r.blocker_type === 'absolute' && r.status !== 'approved').length === 0

  const handleMarkComplete = async () => {
    setIsMarkingComplete(true)
    setFlaggedCategories([])
    try {
      const result = await markOnboardingCompleteAction(project.id)
      if (result.success) {
        setCompletionSuccess(true)
        toast.success('Onboarding marked as complete!')
      } else if (result.error === 'incomplete' && result.incompleteCategories) {
        setFlaggedCategories(result.incompleteCategories)
        toast.error('Some required items are incomplete. Please review the flagged sections.')
      } else {
        toast.error(result.error || 'Failed to complete onboarding')
      }
    } catch {
      toast.error('Failed to complete onboarding')
    } finally {
      setIsMarkingComplete(false)
    }
  }

  const handleDismissBanner = () => {
    setIsBannerDismissed(true)
    if (typeof window !== 'undefined') {
      localStorage.setItem(bannerKey, 'true')
    }
  }

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
      flagged={flaggedCategories.includes(cat.id)}
      className={className}
    />
  )

  return (
    <div className="space-y-6">
      {/* Post-onboarding: phase transition banner (dismissible, shown once per project) */}
      {isPostOnboarding && !isBannerDismissed && (
        <div className="flex items-start gap-3 bg-muted/50 border rounded-lg px-4 py-3 text-sm">
          <Info className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
          <div className="flex-1 text-muted-foreground">
            Onboarding complete — this tab now serves as your ongoing Q&amp;A channel.
          </div>
          <button
            onClick={handleDismissBanner}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Post-completion success banner (after DFY clicks Mark Complete) */}
      {completionSuccess && (
        <div className="flex items-center gap-2 bg-[--signal-good]/10 border border-[--signal-good]/30 rounded-lg px-4 py-3 text-sm text-[--signal-good]">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Onboarding complete! You can still edit your responses below.</span>
        </div>
      )}

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

          {/* Fixed cards on the right — hidden post-onboarding */}
          {!isPostOnboarding && (
            <>
              <DeliverablesBentoCard
                project={project}
                progress={progress.deliverablesProgress}
                userRole={userRole}
                isAdmin={isAdmin}
                isDfy={isDfy}
              />
              <RequirementsBentoCard
                requirements={requirements}
                progress={progress.requirementsProgress}
                projectId={project.id}
                isAdmin={isAdmin}
              />
            </>
          )}

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

          {/* Fixed cards — hidden post-onboarding */}
          {!isPostOnboarding && (
            <>
              <DeliverablesBentoCard
                project={project}
                progress={progress.deliverablesProgress}
                userRole={userRole}
                isAdmin={isAdmin}
                isDfy={isDfy}
              />
              <RequirementsBentoCard
                requirements={requirements}
                progress={progress.requirementsProgress}
                projectId={project.id}
                isAdmin={isAdmin}
              />
            </>
          )}

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

      {/* Mark Onboarding Complete — DFY only, during onboarding phase, not yet completed */}
      {isDfy && !isPostOnboarding && !completionSuccess && (
        <div className="border-t pt-6">
          {allRequiredAnswered ? (
            <Button
              onClick={handleMarkComplete}
              disabled={isMarkingComplete}
              className="w-full md:w-auto"
            >
              {isMarkingComplete ? 'Completing...' : 'Mark Onboarding Complete'}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Complete all required items to finish onboarding
            </p>
          )}
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
