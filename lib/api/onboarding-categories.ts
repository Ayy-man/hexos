import { createClient } from '@/lib/supabase/server'

// ============================================
// Types
// ============================================

export interface OnboardingCategory {
  id: string
  project_id: string
  title: string
  description: string | null
  position: number
  created_at: string
  updated_at: string
}

export interface CreateOnboardingCategoryInput {
  project_id: string
  title: string
  description?: string
  position?: number
}

export interface UpdateOnboardingCategoryInput {
  title?: string
  description?: string | null
  position?: number
}

// ============================================
// Query Functions
// ============================================

export async function getOnboardingCategories(
  projectId: string
): Promise<OnboardingCategory[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('onboarding_categories')
    .select('*')
    .eq('project_id', projectId)
    .order('position', { ascending: true })

  if (error) throw error
  return (data || []) as OnboardingCategory[]
}

// ============================================
// Create Operations
// ============================================

export async function createOnboardingCategory(
  input: CreateOnboardingCategoryInput
): Promise<OnboardingCategory> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('onboarding_categories')
    .insert({
      project_id: input.project_id,
      title: input.title,
      description: input.description || null,
      position: input.position ?? 0,
    })
    .select()
    .single()

  if (error) throw error
  return data as OnboardingCategory
}

// ============================================
// Update Operations
// ============================================

export async function updateOnboardingCategory(
  id: string,
  input: UpdateOnboardingCategoryInput
): Promise<OnboardingCategory> {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (input.title !== undefined) updateData.title = input.title
  if (input.description !== undefined) updateData.description = input.description
  if (input.position !== undefined) updateData.position = input.position

  const { data, error } = await supabase
    .from('onboarding_categories')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as OnboardingCategory
}

export async function reorderOnboardingCategories(
  updates: Array<{ id: string; position: number }>
): Promise<void> {
  const supabase = await createClient()

  for (const update of updates) {
    const { error } = await supabase
      .from('onboarding_categories')
      .update({
        position: update.position,
        updated_at: new Date().toISOString(),
      })
      .eq('id', update.id)

    if (error) throw error
  }
}

// ============================================
// Delete Operations
// ============================================

export async function deleteOnboardingCategory(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('onboarding_categories')
    .delete()
    .eq('id', id)

  if (error) throw error
}
