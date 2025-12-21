import { createClient } from '@/lib/supabase/server'

export interface Deliverable {
  id: string
  project_id: string
  title: string
  description: string | null
  status: string
  estimated_hours: number | null
  start_date: string | null
  due_date: string | null
  completed_at: string | null
  sort_order: number
  created_at: string
}

export interface CreateDeliverableInput {
  project_id: string
  title: string
  description?: string
  estimated_hours?: number
  start_date?: string
  due_date?: string
  sort_order?: number
}

export interface UpdateDeliverableInput {
  title?: string
  description?: string
  status?: string
  estimated_hours?: number
  start_date?: string
  due_date?: string
  sort_order?: number
}

// Get all deliverables for a project
export async function getDeliverables(projectId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('deliverables')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data as Deliverable[]
}

// Get single deliverable
export async function getDeliverable(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('deliverables')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Deliverable
}

// Create deliverable
export async function createDeliverable(input: CreateDeliverableInput) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('deliverables')
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data as Deliverable
}

// Update deliverable
export async function updateDeliverable(id: string, input: UpdateDeliverableInput) {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = { ...input }

  // Set completed_at when status changes to done
  if (input.status === 'done') {
    updateData.completed_at = new Date().toISOString()
  } else if (input.status && input.status !== 'done') {
    updateData.completed_at = null
  }

  const { data, error } = await supabase
    .from('deliverables')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Deliverable
}

// Delete deliverable
export async function deleteDeliverable(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('deliverables')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Bulk update sort order
export async function reorderDeliverables(updates: { id: string; sort_order: number }[]) {
  const supabase = await createClient()

  // Update each deliverable's sort order
  const promises = updates.map(({ id, sort_order }) =>
    supabase
      .from('deliverables')
      .update({ sort_order })
      .eq('id', id)
  )

  const results = await Promise.all(promises)
  const errors = results.filter((r) => r.error)

  if (errors.length > 0) {
    throw errors[0].error
  }
}
