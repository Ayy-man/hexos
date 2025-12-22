import { createClient } from '@/lib/supabase/server'

// ============================================
// Types
// ============================================

export type RequirementStatus = 'pending' | 'in_progress' | 'completed' | 'blocked'

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
}

export interface CreateRequirementInput {
  project_id: string
  title: string
  description?: string
  sort_order?: number
}

export interface UpdateRequirementInput {
  title?: string
  description?: string
  status?: RequirementStatus
  response?: string
  file_id?: string
  sort_order?: number
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
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Bulk create requirements (for conversion wizard)
export async function bulkCreateProjectRequirements(
  projectId: string,
  requirements: Array<{ title: string; description?: string }>
): Promise<ProjectRequirement[]> {
  const supabase = await createClient()

  const records = requirements.map((r, index) => ({
    project_id: projectId,
    title: r.title,
    description: r.description || null,
    sort_order: index,
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
