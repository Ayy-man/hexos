import { createClient } from '@/lib/supabase/server'

// ============================================
// Types
// ============================================

export interface OnboardingAnswer {
  id: string
  question_id: string
  project_id: string
  answered_by: string | null
  value: string | boolean | string[] | null
  answered_at: string
  updated_at: string
}

// ============================================
// Query Functions
// ============================================

export async function getOnboardingAnswers(
  projectId: string
): Promise<OnboardingAnswer[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('onboarding_answers')
    .select('*')
    .eq('project_id', projectId)
    .order('answered_at', { ascending: true })

  if (error) throw error
  return (data || []) as OnboardingAnswer[]
}

// ============================================
// Upsert Operations
// ============================================

export async function upsertOnboardingAnswer(input: {
  question_id: string
  project_id: string
  answered_by: string
  value: string | boolean | string[] | null
}): Promise<OnboardingAnswer> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('onboarding_answers')
    .upsert(
      {
        ...input,
        answered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'question_id,project_id' }
    )
    .select()
    .single()

  if (error) throw error
  return data as OnboardingAnswer
}
