import { createClient } from '@/lib/supabase/server'
import type { RequirementOwner, RequirementBlocker } from './onboarding-requirements'

// ============================================
// Types
// ============================================

export interface RequirementTemplate {
  id: string
  name: string
  description: string | null
  loom_url: string | null
  default_owner: RequirementOwner
  default_blocker: RequirementBlocker | null
  category: string
  parent_id: string | null
  position: number
  is_active: boolean
  created_at: string
}

// Tree structure for recursive templates
export interface RequirementTemplateTree extends RequirementTemplate {
  children: RequirementTemplateTree[]
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
// Utility Functions
// ============================================

export function getCategoryLabel(category: string): string {
  const found = TEMPLATE_CATEGORIES.find(c => c.value === category)
  return found ? found.label : category
}

// ============================================
// Tree Building Functions
// ============================================

/**
 * Build a tree structure from flat templates array.
 * Only returns root templates (parent_id = null).
 * Children are nested under their parents.
 */
export function buildTemplateTree(templates: RequirementTemplate[]): RequirementTemplateTree[] {
  const nodeMap = new Map<string, RequirementTemplateTree>()
  const roots: RequirementTemplateTree[] = []

  // First pass: create nodes with empty children arrays
  templates.forEach((t) => {
    nodeMap.set(t.id, { ...t, children: [] })
  })

  // Second pass: build tree by linking children to parents
  templates.forEach((t) => {
    const node = nodeMap.get(t.id)!
    if (t.parent_id && nodeMap.has(t.parent_id)) {
      nodeMap.get(t.parent_id)!.children.push(node)
    } else if (!t.parent_id) {
      roots.push(node)
    }
  })

  // Sort children by position recursively
  const sortChildren = (nodes: RequirementTemplateTree[]) => {
    nodes.sort((a, b) => a.position - b.position)
    nodes.forEach((n) => sortChildren(n.children))
  }
  sortChildren(roots)

  return roots
}

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

/**
 * Flatten a template tree into an array with parent references.
 * Useful for batch creating requirements from a template.
 */
export function flattenTemplateTree(
  template: RequirementTemplateTree,
  parentTempId?: string
): Array<{
  tempId: string
  parentTempId: string | undefined
  template: RequirementTemplate
}> {
  const tempId = crypto.randomUUID()
  const result: Array<{
    tempId: string
    parentTempId: string | undefined
    template: RequirementTemplate
  }> = [{ tempId, parentTempId, template }]

  for (const child of template.children) {
    result.push(...flattenTemplateTree(child, tempId))
  }

  return result
}
