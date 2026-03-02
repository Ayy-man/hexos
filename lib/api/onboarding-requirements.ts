import { createClient } from '@/lib/supabase/server'

// ============================================
// Types
// ============================================

export type RequirementOwner = 'hexona' | 'dfy' | 'client'
export type RequirementBlocker = 'none' | 'partial' | 'absolute'
export type OnboardingRequirementStatus = 'pending' | 'in_progress' | 'submitted' | 'approved' | 'blocked'

export interface RequirementAttachment {
  id: string
  requirement_id: string
  file_name: string
  file_path: string
  file_size: number | null
  file_type: string | null
  uploaded_by: string | null
  uploaded_at: string
}

export interface OnboardingRequirement {
  id: string
  project_id: string
  parent_id: string | null
  title: string
  description: string | null
  notes: string | null
  owner_type: RequirementOwner
  blocker_type: RequirementBlocker
  status: OnboardingRequirementStatus
  loom_url: string | null
  resource_url: string | null
  position: number
  category_id: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
  completed_by: string | null
  attachments?: RequirementAttachment[]
}

export interface CreateOnboardingRequirementInput {
  project_id: string
  parent_id?: string | null
  title: string
  description?: string
  notes?: string
  owner_type?: RequirementOwner
  blocker_type?: RequirementBlocker
  loom_url?: string
  resource_url?: string
  position?: number
  category_id?: string | null
}

export interface UpdateOnboardingRequirementInput {
  parent_id?: string | null
  title?: string
  description?: string | null
  notes?: string | null
  owner_type?: RequirementOwner
  blocker_type?: RequirementBlocker
  status?: OnboardingRequirementStatus
  loom_url?: string | null
  resource_url?: string | null
  position?: number
  category_id?: string | null
}

// For tree building
export interface RequirementTreeNode extends OnboardingRequirement {
  children: RequirementTreeNode[]
}

// ============================================
// Query Functions
// ============================================

export async function getOnboardingRequirements(
  projectId: string
): Promise<OnboardingRequirement[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('onboarding_requirements')
    .select(`
      *,
      attachments:requirement_attachments(*)
    `)
    .eq('project_id', projectId)
    .order('position', { ascending: true })

  if (error) throw error
  return (data || []) as OnboardingRequirement[]
}

export async function getOnboardingRequirement(
  id: string
): Promise<OnboardingRequirement | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('onboarding_requirements')
    .select(`
      *,
      attachments:requirement_attachments(*)
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data as OnboardingRequirement
}

export async function getRequirementsByCategory(
  categoryId: string
): Promise<OnboardingRequirement[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('onboarding_requirements')
    .select(`
      *,
      attachments:requirement_attachments(*)
    `)
    .eq('category_id', categoryId)
    .order('position', { ascending: true })

  if (error) throw error
  return (data || []) as OnboardingRequirement[]
}

// ============================================
// Create Operations
// ============================================

export async function createOnboardingRequirement(
  input: CreateOnboardingRequirementInput
): Promise<OnboardingRequirement> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('onboarding_requirements')
    .insert({
      project_id: input.project_id,
      parent_id: input.parent_id || null,
      title: input.title,
      description: input.description || null,
      notes: input.notes || null,
      owner_type: input.owner_type || 'hexona',
      blocker_type: input.blocker_type || 'none',
      loom_url: input.loom_url || null,
      resource_url: input.resource_url || null,
      position: input.position ?? 0,
      category_id: input.category_id || null,
    })
    .select()
    .single()

  if (error) throw error
  return data as OnboardingRequirement
}

// Bulk create for initial project setup
export async function bulkCreateOnboardingRequirements(
  projectId: string,
  requirements: Array<{
    parent_id?: string | null
    title: string
    description?: string
    notes?: string
    owner_type?: RequirementOwner
    blocker_type?: RequirementBlocker
    loom_url?: string
    resource_url?: string
    position?: number
  }>
): Promise<OnboardingRequirement[]> {
  // Handle empty array - return early
  if (!requirements || requirements.length === 0) {
    return []
  }

  const supabase = await createClient()

  const records = requirements.map((r, index) => ({
    project_id: projectId,
    parent_id: r.parent_id || null,
    title: r.title,
    description: r.description || null,
    notes: r.notes || null,
    owner_type: r.owner_type || 'hexona',
    blocker_type: r.blocker_type || 'none',
    loom_url: r.loom_url || null,
    resource_url: r.resource_url || null,
    position: r.position ?? index,
  }))

  const { data, error } = await supabase
    .from('onboarding_requirements')
    .insert(records)
    .select()

  if (error) throw error
  return (data || []) as OnboardingRequirement[]
}

// ============================================
// Update Operations
// ============================================

export async function updateOnboardingRequirement(
  id: string,
  input: UpdateOnboardingRequirementInput
): Promise<OnboardingRequirement> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (input.parent_id !== undefined) updateData.parent_id = input.parent_id
  if (input.title !== undefined) updateData.title = input.title
  if (input.description !== undefined) updateData.description = input.description
  if (input.notes !== undefined) updateData.notes = input.notes
  if (input.owner_type !== undefined) updateData.owner_type = input.owner_type
  if (input.blocker_type !== undefined) updateData.blocker_type = input.blocker_type
  if (input.loom_url !== undefined) updateData.loom_url = input.loom_url
  if (input.resource_url !== undefined) updateData.resource_url = input.resource_url
  if (input.position !== undefined) updateData.position = input.position

  if (input.status !== undefined) {
    updateData.status = input.status
    if (input.status === 'approved') {
      updateData.completed_at = new Date().toISOString()
      updateData.completed_by = user?.id || null
    } else {
      updateData.completed_at = null
      updateData.completed_by = null
    }
  }

  if (input.category_id !== undefined) updateData.category_id = input.category_id

  const { data, error } = await supabase
    .from('onboarding_requirements')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  return data as OnboardingRequirement
}

// Batch reorder/reparent requirements
export async function reorderOnboardingRequirements(
  updates: Array<{ id: string; position: number; parent_id?: string | null }>
): Promise<void> {
  const supabase = await createClient()

  for (const update of updates) {
    const updateData: Record<string, unknown> = {
      position: update.position,
      updated_at: new Date().toISOString(),
    }
    if (update.parent_id !== undefined) {
      updateData.parent_id = update.parent_id
    }

    const { error } = await supabase
      .from('onboarding_requirements')
      .update(updateData)
      .eq('id', update.id)

    if (error) throw error
  }
}

// Mark requirement as complete
export async function markRequirementComplete(
  id: string
): Promise<OnboardingRequirement> {
  return updateOnboardingRequirement(id, { status: 'approved' })
}

// ============================================
// Delete Operations
// ============================================

export async function deleteOnboardingRequirement(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('onboarding_requirements')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ============================================
// Tree Helpers
// ============================================

// Build tree structure from flat array
export function buildRequirementTree(
  requirements: OnboardingRequirement[]
): RequirementTreeNode[] {
  const map = new Map<string, RequirementTreeNode>()
  const roots: RequirementTreeNode[] = []

  // First pass: create all nodes
  for (const req of requirements) {
    map.set(req.id, { ...req, children: [] })
  }

  // Second pass: build tree
  for (const req of requirements) {
    const node = map.get(req.id)!
    if (req.parent_id && map.has(req.parent_id)) {
      map.get(req.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  // Sort children by position
  const sortChildren = (nodes: RequirementTreeNode[]) => {
    nodes.sort((a, b) => a.position - b.position)
    for (const node of nodes) {
      sortChildren(node.children)
    }
  }
  sortChildren(roots)

  return roots
}

// Get all descendant IDs of a requirement (for cascade delete in UI)
export function getDescendantIds(
  requirements: OnboardingRequirement[],
  parentId: string
): string[] {
  const ids: string[] = []
  const children = requirements.filter(r => r.parent_id === parentId)

  for (const child of children) {
    ids.push(child.id)
    ids.push(...getDescendantIds(requirements, child.id))
  }

  return ids
}

// Check if dropping node onto target would create circular reference
export function canDropOnTarget(
  requirements: OnboardingRequirement[],
  dragId: string,
  targetId: string
): boolean {
  if (dragId === targetId) return false

  // Check if targetId is a descendant of dragId
  const descendants = getDescendantIds(requirements, dragId)
  return !descendants.includes(targetId)
}

// Flatten tree back to array with updated positions
export function flattenRequirementTree(
  tree: RequirementTreeNode[],
  parentId: string | null = null
): Array<{ id: string; position: number; parent_id: string | null }> {
  const result: Array<{ id: string; position: number; parent_id: string | null }> = []

  tree.forEach((node, index) => {
    result.push({
      id: node.id,
      position: index,
      parent_id: parentId,
    })
    result.push(...flattenRequirementTree(node.children, node.id))
  })

  return result
}

// ============================================
// Utility Functions
// ============================================

export async function getRequirementsProgress(projectId: string): Promise<{
  total: number
  approved: number
  pending: number
  blocked: number
  percentComplete: number
}> {
  const requirements = await getOnboardingRequirements(projectId)

  const total = requirements.length
  const approved = requirements.filter(r => r.status === 'approved').length
  const pending = requirements.filter(r =>
    r.status === 'pending' || r.status === 'in_progress' || r.status === 'submitted'
  ).length
  const blocked = requirements.filter(r => r.status === 'blocked').length

  const percentComplete = total > 0 ? Math.round((approved / total) * 100) : 0

  return { total, approved, pending, blocked, percentComplete }
}
