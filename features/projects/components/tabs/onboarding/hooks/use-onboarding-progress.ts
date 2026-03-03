'use client'

import { useMemo } from 'react'
import type { OnboardingCategory } from '@/lib/api/onboarding-categories'
import type { OnboardingQuestion } from '@/lib/api/onboarding-questions'
import type { OnboardingAnswer } from '@/lib/api/onboarding-answers'
import type { OnboardingRequirement } from '@/lib/api/onboarding-requirements'

export interface CategoryProgress {
  categoryId: string
  title: string
  total: number
  completed: number
  requiredTotal: number
  requiredCompleted: number
  requiredRemaining: number
  lastEdited: string | null // MAX(updated_at) across answers in category
}

export interface OnboardingProgress {
  total: number
  completed: number
  percentage: number
  byCategory: CategoryProgress[]
  deliverablesProgress: { total: number; completed: number }
  requirementsProgress: { total: number; completed: number; blockerCount: number }
}

export function useOnboardingProgress(
  categories: OnboardingCategory[],
  questions: OnboardingQuestion[],
  answers: OnboardingAnswer[],
  requirements: OnboardingRequirement[],
  deliverables: Array<{ id: string; status: string }>
): OnboardingProgress {
  return useMemo(() => {
    // Build answer lookup: Map<question_id, OnboardingAnswer>
    const answerMap = new Map(answers.map((a) => [a.question_id, a]))

    const byCategory = categories.map((cat) => {
      const catQuestions = questions.filter((q) => q.category_id === cat.id)
      const catRequirements = requirements.filter((r) => r.category_id === cat.id)

      const answeredQuestions = catQuestions.filter((q) => {
        const answer = answerMap.get(q.id)
        return answer && answer.value !== null
      })

      const completedReqs = catRequirements.filter((r) => r.status === 'approved')

      const requiredQuestions = catQuestions.filter((q) => q.is_required)
      const requiredAnswered = requiredQuestions.filter((q) => {
        const answer = answerMap.get(q.id)
        return answer && answer.value !== null
      })

      // Last edited = MAX updated_at across answers for questions in this category
      const categoryAnswers = catQuestions
        .map((q) => answerMap.get(q.id))
        .filter(Boolean) as OnboardingAnswer[]
      const lastEdited =
        categoryAnswers.length > 0
          ? categoryAnswers.reduce(
              (latest, a) => (a.updated_at > latest ? a.updated_at : latest),
              categoryAnswers[0].updated_at
            )
          : null

      return {
        categoryId: cat.id,
        title: cat.title,
        total: catQuestions.length + catRequirements.length,
        completed: answeredQuestions.length + completedReqs.length,
        requiredTotal: requiredQuestions.length,
        requiredCompleted: requiredAnswered.length,
        requiredRemaining: requiredQuestions.length - requiredAnswered.length,
        lastEdited,
      }
    })

    const completedDeliverables = deliverables.filter((d) => d.status === 'done').length
    const completedRequirements = requirements.filter((r) => r.status === 'approved').length
    const blockerCount = requirements.filter(
      (r) => r.blocker_type === 'absolute' && r.status !== 'approved'
    ).length

    const totalItems = questions.length + requirements.length
    const answeredCount = questions.filter((q) => {
      const answer = answerMap.get(q.id)
      return answer && answer.value !== null
    }).length
    const completedItems = answeredCount + completedRequirements

    return {
      total: totalItems,
      completed: completedItems,
      percentage: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
      byCategory,
      deliverablesProgress: { total: deliverables.length, completed: completedDeliverables },
      requirementsProgress: { total: requirements.length, completed: completedRequirements, blockerCount },
    }
  }, [categories, questions, answers, requirements, deliverables])
}
