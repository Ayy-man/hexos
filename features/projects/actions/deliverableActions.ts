'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// ============================================
// Deliverable CRUD Actions
// ============================================

export async function addDeliverableAction(
  projectId: string,
  data: {
    title: string
    description?: string
    estimated_hours?: number
    due_date?: string
  }
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get max sort_order
  const { data: existing } = await supabase
    .from('deliverables')
    .select('sort_order')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextSortOrder = (existing?.[0]?.sort_order ?? -1) + 1

  // Insert deliverable
  const { data: deliverable, error } = await supabase
    .from('deliverables')
    .insert({
      project_id: projectId,
      title: data.title,
      description: data.description || null,
      estimated_hours: data.estimated_hours || null,
      due_date: data.due_date || null,
      status: 'pending',
      sort_order: nextSortOrder,
    })
    .select('id, title')
    .single()

  if (error) throw error

  // Log activity
  await supabase.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'deliverable_added',
    details: {
      deliverable_id: deliverable.id,
      title: deliverable.title,
    },
  })

  revalidatePath(`/projects/${projectId}`)
}

export async function updateDeliverableAction(
  deliverableId: string,
  projectId: string,
  data: {
    title?: string
    description?: string
    estimated_hours?: number
    due_date?: string
  }
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('deliverables')
    .update({
      title: data.title,
      description: data.description,
      estimated_hours: data.estimated_hours,
      due_date: data.due_date,
    })
    .eq('id', deliverableId)

  if (error) throw error

  // Log activity
  await supabase.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'deliverable_edited',
    details: {
      deliverable_id: deliverableId,
      fields_changed: Object.keys(data).filter(k => data[k as keyof typeof data] !== undefined),
    },
  })

  revalidatePath(`/projects/${projectId}`)
}

export async function updateDeliverableStatusAction(
  deliverableId: string,
  projectId: string,
  status: 'pending' | 'in_progress' | 'blocked' | 'done'
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get current status for logging
  const { data: current } = await supabase
    .from('deliverables')
    .select('status, title')
    .eq('id', deliverableId)
    .single()

  const oldStatus = current?.status

  // Build update data
  const updateData: Record<string, unknown> = { status }
  if (status === 'done') {
    updateData.completed_at = new Date().toISOString()
  } else {
    updateData.completed_at = null
  }

  const { error } = await supabase
    .from('deliverables')
    .update(updateData)
    .eq('id', deliverableId)

  if (error) throw error

  // Log activity
  await supabase.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'deliverable_status_changed',
    details: {
      deliverable_id: deliverableId,
      title: current?.title,
      old_status: oldStatus,
      new_status: status,
    },
  })

  revalidatePath(`/projects/${projectId}`)
}

export async function deleteDeliverableAction(
  deliverableId: string,
  projectId: string
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get deliverable title for logging before deletion
  const { data: deliverable } = await supabase
    .from('deliverables')
    .select('title')
    .eq('id', deliverableId)
    .single()

  const { error } = await supabase
    .from('deliverables')
    .delete()
    .eq('id', deliverableId)

  if (error) throw error

  // Log activity
  await supabase.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'deliverable_deleted',
    details: {
      deliverable_id: deliverableId,
      title: deliverable?.title,
    },
  })

  revalidatePath(`/projects/${projectId}`)
}
