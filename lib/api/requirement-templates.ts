import { createClient } from '@/lib/supabase/server'
import type { RequirementOwner } from './onboarding-requirements'

// ============================================
// Types
// ============================================

export interface RequirementTemplate {
  id: string
  name: string
  description: string | null
  loom_url: string | null
  default_owner: RequirementOwner
  category: string
  is_active: boolean
  created_at: string
}

export interface CreateTemplateInput {
  name: string
  description?: string
  loom_url?: string
  default_owner?: RequirementOwner
  category: string
}

export interface UpdateTemplateInput {
  name?: string
  description?: string | null
  loom_url?: string | null
  default_owner?: RequirementOwner
  category?: string
  is_active?: boolean
}

// Template categories for grouping
export const TEMPLATE_CATEGORIES = [
  { value: 'platform_access', label: 'Platform Access' },
  { value: 'credentials', label: 'Credentials' },
  { value: 'assets', label: 'Assets' },
  { value: 'setup', label: 'Setup' },
  { value: 'payments', label: 'Payments' },
] as const

export type TemplateCategory = typeof TEMPLATE_CATEGORIES[number]['value']

// ============================================
// Query Functions
// ============================================

export async function getRequirementTemplates(): Promise<RequirementTemplate[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('requirement_templates')
    .select('*')
    .eq('is_active', true)
    .order('category', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw error
  return (data || []) as RequirementTemplate[]
}

export async function getTemplatesByCategory(
  category: string
): Promise<RequirementTemplate[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('requirement_templates')
    .select('*')
    .eq('is_active', true)
    .eq('category', category)
    .order('name', { ascending: true })

  if (error) throw error
  return (data || []) as RequirementTemplate[]
}

export async function getRequirementTemplate(
  id: string
): Promise<RequirementTemplate | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('requirement_templates')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data as RequirementTemplate
}

// Get templates grouped by category for UI
export async function getTemplatesGroupedByCategory(): Promise<
  Map<string, RequirementTemplate[]>
> {
  const templates = await getRequirementTemplates()
  const grouped = new Map<string, RequirementTemplate[]>()

  for (const template of templates) {
    const existing = grouped.get(template.category) || []
    existing.push(template)
    grouped.set(template.category, existing)
  }

  return grouped
}

// ============================================
// Admin Operations (Create/Update/Delete)
// ============================================

export async function createRequirementTemplate(
  input: CreateTemplateInput
): Promise<RequirementTemplate> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('requirement_templates')
    .insert({
      name: input.name,
      description: input.description || null,
      loom_url: input.loom_url || null,
      default_owner: input.default_owner || 'hexona',
      category: input.category,
    })
    .select()
    .single()

  if (error) throw error
  return data as RequirementTemplate
}

export async function updateRequirementTemplate(
  id: string,
  input: UpdateTemplateInput
): Promise<RequirementTemplate> {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = {}

  if (input.name !== undefined) updateData.name = input.name
  if (input.description !== undefined) updateData.description = input.description
  if (input.loom_url !== undefined) updateData.loom_url = input.loom_url
  if (input.default_owner !== undefined) updateData.default_owner = input.default_owner
  if (input.category !== undefined) updateData.category = input.category
  if (input.is_active !== undefined) updateData.is_active = input.is_active

  const { data, error } = await supabase
    .from('requirement_templates')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as RequirementTemplate
}

export async function deleteRequirementTemplate(id: string): Promise<void> {
  const supabase = await createClient()

  // Soft delete by setting is_active to false
  const { error } = await supabase
    .from('requirement_templates')
    .update({ is_active: false })
    .eq('id', id)

  if (error) throw error
}

// ============================================
// Utility Functions
// ============================================

export function getCategoryLabel(category: string): string {
  const found = TEMPLATE_CATEGORIES.find(c => c.value === category)
  return found ? found.label : category
}
