'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  updateOnboardingCategory,
  deleteOnboardingCategory,
  reorderOnboardingCategories,
} from '@/lib/api/onboarding-categories'
import type { UpdateOnboardingCategoryInput } from '@/lib/api/onboarding-categories'
import {
  updateOnboardingQuestion,
  deleteOnboardingQuestion,
  reorderOnboardingQuestions,
} from '@/lib/api/onboarding-questions'
import type { QuestionType, UpdateOnboardingQuestionInput, OnboardingQuestion } from '@/lib/api/onboarding-questions'
import { upsertOnboardingAnswer } from '@/lib/api/onboarding-answers'

// ============================================
// Answer Actions
// ============================================

/**
 * Auto-save a single answer for a question.
 * Does NOT call revalidatePath to avoid full page re-renders on every keystroke.
 */
export async function saveAnswerAction(
  projectId: string,
  questionId: string,
  value: string | boolean | string[] | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    await upsertOnboardingAnswer({
      question_id: questionId,
      project_id: projectId,
      answered_by: user.id,
      value,
    })

    return { success: true }
  } catch (error) {
    console.error('[saveAnswerAction] FAILED:', error)
    // Detect FK/not-found errors when the question or category was deleted
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (
      errorMessage.includes('foreign key') ||
      errorMessage.includes('violates') ||
      errorMessage.includes('not found') ||
      errorMessage.includes('PGRST116')
    ) {
      return { success: false, error: 'section_deleted' }
    }
    return { success: false, error: 'Failed to save answer' }
  }
}

// ============================================
// Category Actions (admin only)
// ============================================

export async function addCategoryAction(
  projectId: string,
  title: string,
  description?: string
): Promise<{ success: boolean; error?: string; category?: { id: string; title: string; description: string | null; position: number; project_id: string; created_at: string; updated_at: string } }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    // Get max position using the same client (avoid creating a second client)
    const { data: existingCategories, error: fetchError } = await supabase
      .from('onboarding_categories')
      .select('position')
      .eq('project_id', projectId)
      .order('position', { ascending: false })
      .limit(1)

    if (fetchError) {
      console.error('[addCategoryAction] SELECT failed:', fetchError)
      return { success: false, error: `SELECT failed: ${fetchError.message}` }
    }

    const nextPosition = existingCategories && existingCategories.length > 0
      ? existingCategories[0].position + 1
      : 0

    const { data: category, error: insertError } = await supabase
      .from('onboarding_categories')
      .insert({
        project_id: projectId,
        title,
        description: description || null,
        position: nextPosition,
      })
      .select()
      .single()

    if (insertError) {
      console.error('[addCategoryAction] INSERT failed:', insertError)
      return { success: false, error: `INSERT failed: ${insertError.message}` }
    }

    revalidatePath(`/projects/${projectId}`)
    return { success: true, category }
  } catch (error) {
    console.error('[addCategoryAction] FAILED:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return { success: false, error: `Failed to add category: ${msg}` }
  }
}

export async function updateCategoryAction(
  categoryId: string,
  input: UpdateOnboardingCategoryInput,
  projectId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    await updateOnboardingCategory(categoryId, input)

    revalidatePath('/projects/' + projectId)
    return { success: true }
  } catch (error) {
    console.error('[updateCategoryAction] FAILED:', error)
    return { success: false, error: 'Failed to update category' }
  }
}

export async function deleteCategoryAction(
  categoryId: string,
  projectId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    await deleteOnboardingCategory(categoryId)

    revalidatePath('/projects/' + projectId)
    return { success: true }
  } catch (error) {
    console.error('[deleteCategoryAction] FAILED:', error)
    return { success: false, error: 'Failed to delete category' }
  }
}

export async function reorderCategoriesAction(
  projectId: string,
  updates: Array<{ id: string; position: number }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    await reorderOnboardingCategories(updates)

    revalidatePath('/projects/' + projectId)
    return { success: true }
  } catch (error) {
    console.error('[reorderCategoriesAction] FAILED:', error)
    return { success: false, error: 'Failed to reorder categories' }
  }
}

// ============================================
// Question Actions (admin only)
// ============================================

export async function addQuestionAction(
  projectId: string,
  categoryId: string,
  data: {
    title: string
    question_type: QuestionType
    description?: string
    options?: string[]
    is_required?: boolean
  }
): Promise<{ success: boolean; error?: string; question?: OnboardingQuestion }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    // Get max position within the category using the same client
    const { data: existing, error: fetchError } = await supabase
      .from('onboarding_questions')
      .select('position')
      .eq('category_id', categoryId)
      .order('position', { ascending: false })
      .limit(1)

    if (fetchError) {
      console.error('[addQuestionAction] SELECT failed:', fetchError)
      return { success: false, error: `SELECT failed: ${fetchError.message}` }
    }

    const nextPosition = (existing?.[0]?.position ?? -1) + 1

    // Insert using the same client to avoid permission issues
    const { data: question, error: insertError } = await supabase
      .from('onboarding_questions')
      .insert({
        project_id: projectId,
        category_id: categoryId,
        title: data.title,
        question_type: data.question_type,
        description: data.description || null,
        options: data.options || null,
        is_required: data.is_required ?? false,
        position: nextPosition,
      })
      .select()
      .single()

    if (insertError) {
      console.error('[addQuestionAction] INSERT failed:', insertError)
      return { success: false, error: `INSERT failed: ${insertError.message}` }
    }

    // Skip revalidatePath — caller handles optimistic update
    return { success: true, question: question as OnboardingQuestion }
  } catch (error) {
    console.error('[addQuestionAction] FAILED:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return { success: false, error: `Failed to add question: ${msg}` }
  }
}

export async function updateQuestionAction(
  questionId: string,
  input: UpdateOnboardingQuestionInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    await updateOnboardingQuestion(questionId, input)

    // No revalidate — inline optimistic UI handles this
    return { success: true }
  } catch (error) {
    console.error('[updateQuestionAction] FAILED:', error)
    return { success: false, error: 'Failed to update question' }
  }
}

export async function deleteQuestionAction(
  questionId: string,
  projectId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    await deleteOnboardingQuestion(questionId)

    revalidatePath('/projects/' + projectId)
    return { success: true }
  } catch (error) {
    console.error('[deleteQuestionAction] FAILED:', error)
    return { success: false, error: 'Failed to delete question' }
  }
}

export async function reorderQuestionsAction(
  projectId: string,
  updates: Array<{ id: string; position: number }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    await reorderOnboardingQuestions(updates)

    revalidatePath('/projects/' + projectId)
    return { success: true }
  } catch (error) {
    console.error('[reorderQuestionsAction] FAILED:', error)
    return { success: false, error: 'Failed to reorder questions' }
  }
}

// ============================================
// Completion Action
// ============================================

/**
 * Server-side validation: checks all required questions have answers,
 * then marks the project onboarding as complete.
 * Returns incomplete category IDs if validation fails.
 */
export async function markOnboardingCompleteAction(projectId: string): Promise<{
  success: boolean
  error?: string
  incompleteCategories?: string[]
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    // Fetch all required questions for this project
    const { data: requiredQuestions, error: qError } = await supabase
      .from('onboarding_questions')
      .select('id, category_id')
      .eq('project_id', projectId)
      .eq('is_required', true)

    if (qError) throw qError

    if (!requiredQuestions || requiredQuestions.length === 0) {
      // No required questions — mark complete
      await supabase
        .from('projects')
        .update({ status: 'access_complete' })
        .eq('id', projectId)

      revalidatePath('/projects/' + projectId)
      return { success: true }
    }

    // Fetch existing answers for this project
    const { data: answers, error: aError } = await supabase
      .from('onboarding_answers')
      .select('question_id, value')
      .eq('project_id', projectId)

    if (aError) throw aError

    const answeredQuestionIds = new Set(
      (answers || [])
        .filter((a: { question_id: string; value: unknown }) => a.value !== null && a.value !== undefined && a.value !== '')
        .map((a: { question_id: string; value: unknown }) => a.question_id)
    )

    // Find categories that have unanswered required questions
    const incompleteCategoryIds = new Set<string>()
    for (const q of requiredQuestions) {
      if (!answeredQuestionIds.has(q.id)) {
        incompleteCategoryIds.add(q.category_id)
      }
    }

    if (incompleteCategoryIds.size > 0) {
      return {
        success: false,
        error: 'incomplete',
        incompleteCategories: Array.from(incompleteCategoryIds),
      }
    }

    // All required questions answered — update project status
    const { error: updateError } = await supabase
      .from('projects')
      .update({ status: 'access_complete' })
      .eq('id', projectId)

    if (updateError) throw updateError

    // Log activity
    await supabase.from('activity_log').insert({
      project_id: projectId,
      user_id: user.id,
      action: 'onboarding_form_completed',
      details: {},
    })

    revalidatePath('/projects/' + projectId)
    return { success: true }
  } catch (error) {
    console.error('[markOnboardingCompleteAction] FAILED:', error)
    return { success: false, error: 'Failed to mark onboarding complete' }
  }
}
