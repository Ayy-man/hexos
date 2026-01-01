// Shared types and utilities for requirement templates
// This file can be imported by both server and client components

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
// Utility Functions (no server dependency)
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
