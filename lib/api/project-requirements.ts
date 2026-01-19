import { createClient } from '@/lib/supabase/server'

// ============================================
// Types
// ============================================

export type RequirementStatus = 'pending' | 'in_progress' | 'completed' | 'blocked'
export type RequirementRole = 'admin' | 'client'

export interface RequirementDependency {
  id: string
  requirement_id: string
  depends_on_id: string
  created_at: string
  depends_on?: ProjectRequirement
}

export interface ProjectRequirement {
  id: string
  project_id: string
  title: string
  description: string | null
  status: RequirementStatus
  file_id: string | null
  response: string | null
  completed_at: string | null
  completed_by: string | null
  sort_order: number
  created_at: string
  // Assignment fields
  assigned_role: RequirementRole
  assigned_to: string | null
  // Dependencies (populated via join)
  dependencies?: RequirementDependency[]
}

export interface CreateRequirementInput {
  project_id: string
  title: string
  description?: string
  sort_order?: number
  assigned_role?: RequirementRole
  assigned_to?: string
  depends_on_ids?: string[]
}

export interface UpdateRequirementInput {
  title?: string
  description?: string
  status?: RequirementStatus
  response?: string
  file_id?: string
  sort_order?: number
  assigned_role?: RequirementRole
  assigned_to?: string
}

// ============================================
// Query Functions
// ============================================

export async function getProjectRequirements(
  projectId: string
): Promise<ProjectRequirement[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('project_requirements')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data || []
}

// Get requirements with dependency data (for UI)
export async function getProjectRequirementsWithDependencies(
  projectId: string
): Promise<ProjectRequirement[]> {
  const supabase = await createClient()

  // Get requirements
  const { data: requirements, error: reqError } = await supabase
    .from('project_requirements')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })

  if (reqError) throw reqError
  if (!requirements || requirements.length === 0) return []

  // Get all dependencies for these requirements
  const reqIds = requirements.map((r) => r.id)
  const { data: dependencies, error: depError } = await supabase
    .from('requirement_dependencies')
    .select('*')
    .in('requirement_id', reqIds)

  if (depError) throw depError

  // Create a map of requirements by id for dependency lookup
  const reqMap = new Map(requirements.map((r) => [r.id, r]))

  // Attach dependencies to each requirement with the depends_on requirement data
  return requirements.map((req) => ({
    ...req,
    dependencies: (dependencies || [])
      .filter((d) => d.requirement_id === req.id)
      .map((d) => ({
        ...d,
        depends_on: reqMap.get(d.depends_on_id),
      })),
  }))
}

export async function getProjectRequirement(
  id: string
): Promise<ProjectRequirement | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('project_requirements')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

// ============================================
// Create Operations
// ============================================

export async function createProjectRequirement(
  input: CreateRequirementInput
): Promise<ProjectRequirement> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('project_requirements')
    .insert({
      project_id: input.project_id,
      title: input.title,
      description: input.description || null,
      sort_order: input.sort_order || 0,
      assigned_role: input.assigned_role || 'admin',
      assigned_to: input.assigned_to || null,
    })
    .select()
    .single()

  if (error) throw error

  // Add dependencies if provided
  if (input.depends_on_ids && input.depends_on_ids.length > 0) {
    const depRecords = input.depends_on_ids.map((dependsOnId) => ({
      requirement_id: data.id,
      depends_on_id: dependsOnId,
    }))
    await supabase.from('requirement_dependencies').insert(depRecords)
  }

  return data
}

// Bulk create requirements (for conversion wizard)
export async function bulkCreateProjectRequirements(
  projectId: string,
  requirements: Array<{ title: string; description?: string; assigned_role?: RequirementRole }>
): Promise<ProjectRequirement[]> {
  const supabase = await createClient()

  const records = requirements.map((r, index) => ({
    project_id: projectId,
    title: r.title,
    description: r.description || null,
    sort_order: index,
    assigned_role: r.assigned_role || 'admin',
  }))

  const { data, error } = await supabase
    .from('project_requirements')
    .insert(records)
    .select()

  if (error) throw error
  return data || []
}

// ============================================
// Update Operations
// ============================================

export async function updateProjectRequirement(
  id: string,
  input: UpdateRequirementInput
): Promise<ProjectRequirement> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const updateData: Record<string, unknown> = {}

  if (input.title !== undefined) updateData.title = input.title
  if (input.description !== undefined) updateData.description = input.description
  if (input.sort_order !== undefined) updateData.sort_order = input.sort_order
  if (input.file_id !== undefined) updateData.file_id = input.file_id
  if (input.response !== undefined) updateData.response = input.response
  if (input.assigned_role !== undefined) updateData.assigned_role = input.assigned_role
  if (input.assigned_to !== undefined) updateData.assigned_to = input.assigned_to

  if (input.status !== undefined) {
    updateData.status = input.status
    if (input.status === 'completed') {
      updateData.completed_at = new Date().toISOString()
      updateData.completed_by = user?.id
    } else {
      // Clear completed fields if changing away from completed
      updateData.completed_at = null
      updateData.completed_by = null
    }
  }

  const { data, error } = await supabase
    .from('project_requirements')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Reorder requirements
export async function reorderProjectRequirements(
  updates: Array<{ id: string; sort_order: number }>
): Promise<void> {
  const supabase = await createClient()

  // Update each requirement's sort_order
  for (const update of updates) {
    const { error } = await supabase
      .from('project_requirements')
      .update({ sort_order: update.sort_order })
      .eq('id', update.id)

    if (error) throw error
  }
}

// ============================================
// Delete Operations
// ============================================

export async function deleteProjectRequirement(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('project_requirements')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ============================================
// Utility Functions
// ============================================

export async function getRequirementsProgress(projectId: string): Promise<{
  total: number
  completed: number
  pending: number
  blocked: number
  percentComplete: number
}> {
  const requirements = await getProjectRequirements(projectId)

  const total = requirements.length
  const completed = requirements.filter((r) => r.status === 'completed').length
  const pending = requirements.filter(
    (r) => r.status === 'pending' || r.status === 'in_progress'
  ).length
  const blocked = requirements.filter((r) => r.status === 'blocked').length

  const percentComplete = total > 0 ? Math.round((completed / total) * 100) : 0

  return { total, completed, pending, blocked, percentComplete }
}

// ============================================
// Dependency Functions
// ============================================

// Check if a requirement can be completed (all dependencies met)
export async function canCompleteRequirement(
  requirementId: string
): Promise<{ canComplete: boolean; blockedBy: string[] }> {
  const supabase = await createClient()

  // Get dependencies for this requirement
  const { data: dependencies, error } = await supabase
    .from('requirement_dependencies')
    .select('depends_on_id')
    .eq('requirement_id', requirementId)

  if (error) throw error
  if (!dependencies || dependencies.length === 0) {
    return { canComplete: true, blockedBy: [] }
  }

  // Get the status of each dependency
  const dependsOnIds = dependencies.map((d) => d.depends_on_id)
  const { data: depRequirements, error: reqError } = await supabase
    .from('project_requirements')
    .select('id, title, status')
    .in('id', dependsOnIds)

  if (reqError) throw reqError

  const blockedBy = (depRequirements || [])
    .filter((r) => r.status !== 'completed')
    .map((r) => r.title)

  return {
    canComplete: blockedBy.length === 0,
    blockedBy,
  }
}

// Get requirements that are blocked by a specific requirement
export async function getRequirementsBlockedBy(
  requirementId: string
): Promise<string[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('requirement_dependencies')
    .select('requirement_id')
    .eq('depends_on_id', requirementId)

  if (error) throw error
  return (data || []).map((d) => d.requirement_id)
}

// Add a dependency
export async function addRequirementDependency(
  requirementId: string,
  dependsOnId: string
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase.from('requirement_dependencies').insert({
    requirement_id: requirementId,
    depends_on_id: dependsOnId,
  })

  if (error) throw error
}

// Remove a dependency
export async function removeRequirementDependency(
  requirementId: string,
  dependsOnId: string
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('requirement_dependencies')
    .delete()
    .eq('requirement_id', requirementId)
    .eq('depends_on_id', dependsOnId)

  if (error) throw error
}

// Update all dependencies for a requirement (replace current with new set)
export async function updateRequirementDependencies(
  requirementId: string,
  dependsOnIds: string[]
): Promise<void> {
  const supabase = await createClient()

  // Get current dependencies
  const { data: current, error: fetchError } = await supabase
    .from('requirement_dependencies')
    .select('depends_on_id')
    .eq('requirement_id', requirementId)

  if (fetchError) throw fetchError

  const currentIds = new Set((current || []).map((d) => d.depends_on_id))
  const newIds = new Set(dependsOnIds)

  // Add new dependencies
  const toAdd = dependsOnIds.filter((id) => !currentIds.has(id))
  if (toAdd.length > 0) {
    const records = toAdd.map((dependsOnId) => ({
      requirement_id: requirementId,
      depends_on_id: dependsOnId,
    }))
    const { error: insertError } = await supabase
      .from('requirement_dependencies')
      .insert(records)
    if (insertError) throw insertError
  }

  // Remove old dependencies
  const toRemove = [...currentIds].filter((id) => !newIds.has(id))
  if (toRemove.length > 0) {
    const { error: deleteError } = await supabase
      .from('requirement_dependencies')
      .delete()
      .eq('requirement_id', requirementId)
      .in('depends_on_id', toRemove)
    if (deleteError) throw deleteError
  }
}
