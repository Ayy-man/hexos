'use client'

import { useRef, useState, useCallback } from 'react'
import { CheckCircle2, Clock, Minus, MoreVertical } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { BentoCard } from './BentoCard'
import { CategorySheet } from './sheets/CategorySheet'
import type { CategoryFormHandle } from './form/CategoryForm'
import type { OnboardingCategory } from '@/lib/api/onboarding-categories'
import type { OnboardingQuestion } from '@/lib/api/onboarding-questions'
import type { OnboardingAnswer } from '@/lib/api/onboarding-answers'
import type { OnboardingRequirement } from '@/lib/api/onboarding-requirements'
import type { CategoryProgress } from './hooks/use-onboarding-progress'
import { updateCategoryAction, deleteCategoryAction } from '@/features/projects/actions/onboardingFormActions'

interface CategoryBentoCardProps {
  category: OnboardingCategory
  progress: CategoryProgress
  questions: OnboardingQuestion[]
  answers: OnboardingAnswer[]
  requirements: OnboardingRequirement[]
  projectId: string
  isAdmin: boolean
  isDfy: boolean
  isPreviewMode?: boolean
  className?: string
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

export function CategoryBentoCard({
  category,
  progress,
  questions,
  answers,
  requirements,
  projectId,
  isAdmin,
  isDfy,
  isPreviewMode = false,
  className,
}: CategoryBentoCardProps) {
  const isComplete = progress.total > 0 && progress.completed === progress.total
  const hasRequiredIncomplete = progress.requiredRemaining > 0
  const completionPercentage =
    progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0

  const status = getStatusInfo(progress)

  // Slug: use category id for URL state
  const slug = `category-${category.id}`

  // Ref to the form inside the sheet — used for save-on-close and dirty-field guard
  const formRef = useRef<CategoryFormHandle>(null)

  // Controls the "unsaved changes" confirmation dialog
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [pendingCloseResolve, setPendingCloseResolve] = useState<
    ((value: boolean) => void) | null
  >(null)

  // Admin: rename inline state
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(category.title)

  // Admin: delete confirmation
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Count answers for this category's questions (for delete warning)
  const categoryQuestions = questions.filter((q) => q.category_id === category.id)
  const categoryAnswerCount = answers.filter((a) =>
    categoryQuestions.some((q) => q.id === a.question_id)
  ).length

  // Called by BentoCard before closing the sheet
  const handleBeforeClose = useCallback((): Promise<boolean> => {
    // In admin build mode, no unsaved guard needed (no form)
    if (isAdmin && !isPreviewMode) return Promise.resolve(true)
    const hasDirty = formRef.current?.hasDirtyFields ?? false
    if (!hasDirty) {
      return Promise.resolve(true)
    }
    // Has dirty fields — show confirmation dialog
    return new Promise<boolean>((resolve) => {
      setPendingCloseResolve(() => resolve)
      setShowUnsavedDialog(true)
    })
  }, [isAdmin, isPreviewMode])

  const handleSaveAndClose = useCallback(async () => {
    await formRef.current?.saveOnClose()
    setShowUnsavedDialog(false)
    pendingCloseResolve?.(true)
    setPendingCloseResolve(null)
  }, [pendingCloseResolve])

  const handleDiscardAndClose = useCallback(() => {
    setShowUnsavedDialog(false)
    pendingCloseResolve?.(true)
    setPendingCloseResolve(null)
  }, [pendingCloseResolve])

  const handleCancelClose = useCallback(() => {
    setShowUnsavedDialog(false)
    pendingCloseResolve?.(false)
    setPendingCloseResolve(null)
  }, [pendingCloseResolve])

  // Admin: handle rename save
  const handleRenameBlur = async () => {
    const trimmed = renameValue.trim()
    if (!trimmed || trimmed === category.title) {
      setRenameValue(category.title)
      setIsRenaming(false)
      return
    }
    const result = await updateCategoryAction(category.id, { title: trimmed }, projectId)
    if (!result.success) {
      toast.error(result.error || 'Failed to rename category')
      setRenameValue(category.title)
    } else {
      toast.success('Category renamed')
    }
    setIsRenaming(false)
  }

  const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur()
    }
    if (e.key === 'Escape') {
      setRenameValue(category.title)
      setIsRenaming(false)
    }
  }

  // Admin: handle delete
  const handleDeleteConfirm = async () => {
    setIsDeleting(true)
    const result = await deleteCategoryAction(category.id, projectId)
    setIsDeleting(false)
    if (!result.success) {
      toast.error(result.error || 'Failed to delete category')
    } else {
      toast.success('Category deleted')
    }
    setShowDeleteDialog(false)
  }

  return (
    <>
      <BentoCard
        slug={slug}
        isComplete={isComplete}
        hasRequiredIncomplete={hasRequiredIncomplete}
        onBeforeClose={handleBeforeClose}
        className={className}
        sheetContent={
          <CategorySheet
            formRef={formRef}
            category={category}
            questions={questions}
            answers={answers}
            requirements={requirements}
            projectId={projectId}
            isAdmin={isAdmin}
            isDfy={isDfy}
            isPreviewMode={isPreviewMode}
          />
        }
      >
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            {isAdmin && isRenaming ? (
              <Input
                autoFocus
                value={renameValue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRenameValue(e.target.value)}
                onBlur={handleRenameBlur}
                onKeyDown={handleRenameKeyDown}
                className="h-7 text-sm font-medium flex-1"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              />
            ) : (
              <h3 className="font-medium text-sm leading-snug">{category.title}</h3>
            )}

            <div className="flex items-center gap-1 shrink-0">
              <span className={`flex items-center gap-1 text-xs font-medium ${status.className}`}>
                {status.icon}
                {status.label}
              </span>

              {/* Admin kebab menu */}
              {isAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation()
                        setRenameValue(category.title)
                        setIsRenaming(true)
                      }}
                    >
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation()
                        setShowDeleteDialog(true)
                      }}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
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

      {/* Unsaved changes confirmation dialog */}
      <AlertDialog open={showUnsavedDialog} onOpenChange={(open: boolean) => !open && handleCancelClose()}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. What would you like to do?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelClose}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="outline" onClick={handleDiscardAndClose}>
              Discard
            </AlertDialogAction>
            <AlertDialogAction onClick={handleSaveAndClose}>Save &amp; Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete category confirmation dialog */}
      {isAdmin && (
        <AlertDialog open={showDeleteDialog} onOpenChange={(open: boolean) => !open && setShowDeleteDialog(false)}>
          <AlertDialogContent size="sm">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete category?</AlertDialogTitle>
              <AlertDialogDescription>
                {categoryAnswerCount > 0
                  ? `This category has ${categoryAnswerCount} answer${categoryAnswerCount === 1 ? '' : 's'} from the DFY partner. Deleting will remove their responses.`
                  : 'This will permanently delete the category and all its questions.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  )
}
