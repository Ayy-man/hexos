import { createClient } from '@/lib/supabase/server'

export type ImprovementPriority = 'nice_to_have' | 'important' | 'critical'
export type ImprovementStatus = 'open' | 'converted'

export interface ProjectImprovement {
  id: string
  project_id: string
  title: string
  description: string | null
  priority: ImprovementPriority
  status: ImprovementStatus
  converted_project_id: string | null
  added_by: string
  created_at: string
  author?: {
    id: string
    name: string
  }
  converted_project?: {
    id: string
    project_name: string
  } | null
}

export interface CreateImprovementInput {
  projectId: string
  title: string
  description?: string
  priority?: ImprovementPriority
}

/**
 * Fetch all improvements for a project
 * Joins with profiles for author name and projects for converted project name
 * Orders by: status ASC (open first), then priority (critical, important, nice_to_have), then created_at DESC
 */
export async function getProjectImprovements(projectId: string): Promise<ProjectImprovement[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('project_improvements')
    .select(`
      *,
      author:profiles!project_improvements_added_by_fkey(id, display_name),
      converted_project:projects!project_improvements_converted_project_id_fkey(id, project_name)
    `)
    .eq('project_id', projectId)
    .order('status', { ascending: true }) // 'open' before 'converted'
    .order('priority', { ascending: true }) // Alphabetically: 'critical' < 'important' < 'nice_to_have' (reversed from desired)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getProjectImprovements] Error:', error)
    throw error
  }

  // Map and fix priority ordering (we want critical > important > nice_to_have)
  const improvements = (data || []).map((item: any) => ({
    id: item.id,
    project_id: item.project_id,
    title: item.title,
    description: item.description,
    priority: item.priority as ImprovementPriority,
    status: item.status as ImprovementStatus,
    converted_project_id: item.converted_project_id,
    added_by: item.added_by,
    created_at: item.created_at,
    author: item.author ? {
      id: item.author.id,
      name: item.author.display_name || 'Unknown',
    } : undefined,
    converted_project: item.converted_project ? {
      id: item.converted_project.id,
      project_name: item.converted_project.project_name,
    } : null,
  }))

  // Re-sort by priority in the desired order
  const priorityOrder: Record<ImprovementPriority, number> = {
    critical: 1,
    important: 2,
    nice_to_have: 3,
  }

  improvements.sort((a, b) => {
    // First by status (open < converted)
    if (a.status !== b.status) {
      return a.status === 'open' ? -1 : 1
    }
    // Then by priority (critical > important > nice_to_have)
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
    if (priorityDiff !== 0) {
      return priorityDiff
    }
    // Finally by created_at DESC
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return improvements
}

/**
 * Create a new improvement
 */
export async function createImprovement(input: CreateImprovementInput): Promise<ProjectImprovement> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data, error } = await supabase
    .from('project_improvements')
    .insert({
      project_id: input.projectId,
      title: input.title,
      description: input.description || null,
      priority: input.priority || 'nice_to_have',
      added_by: user.id,
    })
    .select(`
      *,
      author:profiles!project_improvements_added_by_fkey(id, display_name)
    `)
    .single()

  if (error) {
    console.error('[createImprovement] Error:', error)
    throw error
  }

  return {
    id: data.id,
    project_id: data.project_id,
    title: data.title,
    description: data.description,
    priority: data.priority as ImprovementPriority,
    status: data.status as ImprovementStatus,
    converted_project_id: data.converted_project_id,
    added_by: data.added_by,
    created_at: data.created_at,
    author: data.author ? {
      id: data.author.id,
      name: data.author.display_name || 'Unknown',
    } : undefined,
    converted_project: null,
  }
}

/**
 * Update improvement fields (title, description, priority)
 */
export async function updateImprovement(
  id: string,
  input: { title?: string; description?: string; priority?: ImprovementPriority }
): Promise<ProjectImprovement> {
  const supabase = await createClient()

  const updateData: Record<string, any> = {}
  if (input.title !== undefined) updateData.title = input.title
  if (input.description !== undefined) updateData.description = input.description
  if (input.priority !== undefined) updateData.priority = input.priority

  const { data, error } = await supabase
    .from('project_improvements')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      author:profiles!project_improvements_added_by_fkey(id, display_name),
      converted_project:projects!project_improvements_converted_project_id_fkey(id, project_name)
    `)
    .single()

  if (error) {
    console.error('[updateImprovement] Error:', error)
    throw error
  }

  return {
    id: data.id,
    project_id: data.project_id,
    title: data.title,
    description: data.description,
    priority: data.priority as ImprovementPriority,
    status: data.status as ImprovementStatus,
    converted_project_id: data.converted_project_id,
    added_by: data.added_by,
    created_at: data.created_at,
    author: data.author ? {
      id: data.author.id,
      name: data.author.display_name || 'Unknown',
    } : undefined,
    converted_project: data.converted_project ? {
      id: data.converted_project.id,
      project_name: data.converted_project.project_name,
    } : null,
  }
}

/**
 * Mark improvements as converted and link to new project
 * Used when admin creates a new project from selected improvements
 */
export async function markAsConverted(
  improvementIds: string[],
  convertedProjectId: string
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('project_improvements')
    .update({
      status: 'converted',
      converted_project_id: convertedProjectId,
    })
    .in('id', improvementIds)

  if (error) {
    console.error('[markAsConverted] Error:', error)
    throw error
  }
}

/**
 * Get improvement counts for a project
 */
export async function getImprovementCounts(projectId: string): Promise<{
  open: number
  converted: number
  total: number
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('project_improvements')
    .select('status')
    .eq('project_id', projectId)

  if (error) {
    console.error('[getImprovementCounts] Error:', error)
    throw error
  }

  const open = data?.filter(i => i.status === 'open').length || 0
  const converted = data?.filter(i => i.status === 'converted').length || 0

  return {
    open,
    converted,
    total: data?.length || 0,
  }
}
