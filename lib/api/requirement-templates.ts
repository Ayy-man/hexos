import { createClient } from '@/lib/supabase/server'

// Re-export types and utilities from shared file (can be used by client components)
export {
  type RequirementTemplate,
  type RequirementTemplateTree,
  type CreateTemplateInput,
  type UpdateTemplateInput,
  type TemplateCategory,
  TEMPLATE_CATEGORIES,
  getCategoryLabel,
  buildTemplateTree,
  flattenTemplateTree,
} from './requirement-templates.shared'

import type { RequirementTemplate, RequirementTemplateTree, CreateTemplateInput, UpdateTemplateInput } from './requirement-templates.shared'
import { buildTemplateTree } from './requirement-templates.shared'

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
    .order('position', { ascending: true })
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
// Server-side Tree Functions
// ============================================

/**
 * Get templates as a tree structure grouped by category.
 * Only root templates are included; children are nested.
 */
export async function getTemplatesAsTree(): Promise<Map<string, RequirementTemplateTree[]>> {
  const templates = await getRequirementTemplates()
  const tree = buildTemplateTree(templates)

  const grouped = new Map<string, RequirementTemplateTree[]>()
  for (const template of tree) {
    const existing = grouped.get(template.category) || []
    existing.push(template)
    grouped.set(template.category, existing)
  }

  return grouped
}
