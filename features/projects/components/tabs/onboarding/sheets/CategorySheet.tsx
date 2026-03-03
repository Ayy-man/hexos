'use client'

import { useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
} from '@/components/ui/responsive-dialog'
import { CategoryForm } from '../form/CategoryForm'
import type { CategoryFormHandle } from '../form/CategoryForm'
import { CategoryEditor } from '../admin/CategoryEditor'
import type { OnboardingCategory } from '@/lib/api/onboarding-categories'
import type { OnboardingQuestion } from '@/lib/api/onboarding-questions'
import type { OnboardingAnswer } from '@/lib/api/onboarding-answers'
import type { OnboardingRequirement } from '@/lib/api/onboarding-requirements'

interface CategorySheetProps {
  category: OnboardingCategory
  questions: OnboardingQuestion[]
  answers: OnboardingAnswer[]
  requirements: OnboardingRequirement[]
  projectId: string
  isAdmin: boolean
  isDfy: boolean
  /** When true (admin only), renders read-only DFY preview with banner */
  isPreviewMode?: boolean
  onSectionDeleted?: () => void
  formRef?: React.Ref<CategoryFormHandle>
}

function getRequirementStatusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return 'Pending'
    case 'in_progress':
      return 'In Progress'
    case 'complete':
      return 'Complete'
    case 'blocked':
      return 'Blocked'
    default:
      return status
  }
}

function getRequirementStatusVariant(
  status: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'complete':
      return 'default'
    case 'blocked':
      return 'destructive'
    case 'in_progress':
      return 'secondary'
    default:
      return 'outline'
  }
}

export function CategorySheet({
  category,
  questions,
  answers,
  requirements,
  projectId,
  isAdmin,
  isDfy,
  isPreviewMode = false,
  onSectionDeleted,
  formRef,
}: CategorySheetProps) {
  const internalFormRef = useRef<CategoryFormHandle>(null)
  const resolvedRef = formRef ?? internalFormRef

  // Filter questions and answers for this specific category
  const categoryQuestions = questions.filter((q) => q.category_id === category.id)
  const categoryAnswers = answers.filter((a) =>
    categoryQuestions.some((q) => q.id === a.question_id),
  )
  // Filter requirements assigned to this category
  const categoryRequirements = requirements.filter(
    (r) => r.category_id === category.id,
  )

  /**
   * Sheet content selection logic:
   * - isAdmin && !isPreviewMode → CategoryEditor (build mode)
   * - isAdmin && isPreviewMode  → CategoryForm with readOnly + preview banner
   * - isDfy                      → CategoryForm (fill mode)
   * - other roles                → CategoryForm with readOnly
   */
  const isAdminBuildMode = isAdmin && !isPreviewMode
  const isReadOnly = isAdmin && !isPreviewMode ? false : !isDfy

  return (
    <>
      <ResponsiveDialogHeader>
        <ResponsiveDialogTitle>{category.title}</ResponsiveDialogTitle>
        {category.description && (
          <ResponsiveDialogDescription>{category.description}</ResponsiveDialogDescription>
        )}
      </ResponsiveDialogHeader>

      <div className="space-y-8 py-4">
        {/* Preview mode banner */}
        {isAdmin && isPreviewMode && (
          <div className="bg-muted/50 border border-dashed rounded-md px-3 py-2 text-sm text-muted-foreground">
            Preview mode — answers here are not saved
          </div>
        )}

        {/* Admin build mode: show category editor */}
        {isAdminBuildMode ? (
          <CategoryEditor
            projectId={projectId}
            categoryId={category.id}
            questions={categoryQuestions}
            answers={categoryAnswers}
          />
        ) : (
          /* DFY fill or admin preview or other roles: show form */
          <CategoryForm
            ref={resolvedRef}
            projectId={projectId}
            questions={categoryQuestions}
            answers={categoryAnswers}
            readOnly={isReadOnly}
            onSectionDeleted={onSectionDeleted}
          />
        )}

        {/* Category requirements (if any are assigned to this category) */}
        {categoryRequirements.length > 0 && (
          <div className="space-y-3 border-t pt-6">
            <h3 className="text-sm font-medium">Requirements</h3>
            {categoryRequirements.map((req) => (
              <div key={req.id} className="flex items-center gap-2 text-sm">
                <Badge variant={getRequirementStatusVariant(req.status ?? 'pending')}>
                  {getRequirementStatusLabel(req.status ?? 'pending')}
                </Badge>
                <span>{req.title}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
