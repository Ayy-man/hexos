import { createClient } from '@/lib/supabase/server'

// ============================================
// Types
// ============================================

export type QuestionType = 'text' | 'textarea' | 'select' | 'multi_select' | 'boolean'

export interface OnboardingQuestion {
  id: string
  project_id: string
  category_id: string
  title: string
  description: string | null
  question_type: QuestionType
  options: string[] | null
  is_required: boolean
  position: number
  created_at: string
}

export interface CreateOnboardingQuestionInput {
  project_id: string
  category_id: string
  title: string
  description?: string
  question_type: QuestionType
  options?: string[]
  is_required?: boolean
  position?: number
}

export interface UpdateOnboardingQuestionInput {
  title?: string
  description?: string | null
  question_type?: QuestionType
  options?: string[] | null
  is_required?: boolean
  position?: number
}

// ============================================
// Query Functions
// ============================================

export async function getOnboardingQuestions(
  projectId: string
): Promise<OnboardingQuestion[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('onboarding_questions')
    .select('*')
    .eq('project_id', projectId)
    .order('position', { ascending: true })

  if (error) throw error
  return (data || []) as OnboardingQuestion[]
}

export async function getOnboardingQuestionsByCategory(
  categoryId: string
): Promise<OnboardingQuestion[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('onboarding_questions')
    .select('*')
    .eq('category_id', categoryId)
    .order('position', { ascending: true })

  if (error) throw error
  return (data || []) as OnboardingQuestion[]
}

// ============================================
// Create Operations
// ============================================

export async function createOnboardingQuestion(
  input: CreateOnboardingQuestionInput
): Promise<OnboardingQuestion> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('onboarding_questions')
    .insert({
      project_id: input.project_id,
      category_id: input.category_id,
      title: input.title,
      description: input.description || null,
      question_type: input.question_type,
      options: input.options || null,
      is_required: input.is_required ?? false,
      position: input.position ?? 0,
    })
    .select()
    .single()

  if (error) throw error
  return data as OnboardingQuestion
}

// ============================================
// Update Operations
// ============================================

export async function updateOnboardingQuestion(
  id: string,
  input: UpdateOnboardingQuestionInput
): Promise<OnboardingQuestion> {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = {}

  if (input.title !== undefined) updateData.title = input.title
  if (input.description !== undefined) updateData.description = input.description
  if (input.question_type !== undefined) updateData.question_type = input.question_type
  if (input.options !== undefined) updateData.options = input.options
  if (input.is_required !== undefined) updateData.is_required = input.is_required
  if (input.position !== undefined) updateData.position = input.position

  const { data, error } = await supabase
    .from('onboarding_questions')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as OnboardingQuestion
}

export async function reorderOnboardingQuestions(
  updates: Array<{ id: string; position: number }>
): Promise<void> {
  const supabase = await createClient()

  for (const update of updates) {
    const { error } = await supabase
      .from('onboarding_questions')
      .update({ position: update.position })
      .eq('id', update.id)

    if (error) throw error
  }
}

// ============================================
// Delete Operations
// ============================================

export async function deleteOnboardingQuestion(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('onboarding_questions')
    .delete()
    .eq('id', id)

  if (error) throw error
}
