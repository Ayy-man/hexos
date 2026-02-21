'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { hasBaseline, autoFlagScopeChange, getBaseline } from '@/lib/api/scope-monitoring'
import { notifyProjectStakeholders } from '@/lib/api/notification-helpers'
import type { ScopeChangeTrigger, ScopeChangeDelta } from '@/lib/types/scope-monitoring'

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

  // Get user profile for scope flagging
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, role')
    .eq('id', user.id)
    .single()

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

  // Auto-flag scope change if baseline exists
  try {
    const baselineExists = await hasBaseline(projectId)
    if (baselineExists && profile) {
      await autoFlagScopeChange(
        {
          project_id: projectId,
          trigger_type: 'deliverable_added',
          affected_deliverable_id: deliverable.id,
          deliverable_title: deliverable.title,
          change_delta: {
            field: 'deliverable',
            before: null,
            after: deliverable.title,
            deliverable_title: deliverable.title,
          },
          hours_delta: data.estimated_hours || 0,
        },
        user.id,
        profile.email,
        profile.role
      )
    }
  } catch (e) {
    console.error('Failed to auto-flag scope change:', e)
  }

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

  // Get user profile and current state for scope change detection
  const [{ data: profile }, { data: current }, baseline] = await Promise.all([
    supabase.from('profiles').select('email, role').eq('id', user.id).single(),
    supabase.from('deliverables').select('title, description, estimated_hours, due_date').eq('id', deliverableId).single(),
    getBaseline(projectId),
  ])

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

  // Auto-flag scope changes if baseline exists
  if (baseline && current && profile) {
    try {
      // Check for hours increase
      if (
        data.estimated_hours !== undefined &&
        current.estimated_hours !== null &&
        data.estimated_hours > current.estimated_hours
      ) {
        await autoFlagScopeChange(
          {
            project_id: projectId,
            trigger_type: 'hours_increased',
            affected_deliverable_id: deliverableId,
            deliverable_title: data.title || current.title,
            change_delta: {
              field: 'estimated_hours',
              before: current.estimated_hours,
              after: data.estimated_hours,
              deliverable_title: data.title || current.title,
            },
            hours_delta: data.estimated_hours - current.estimated_hours,
          },
          user.id,
          profile.email,
          profile.role
        )
      }

      // Check for timeline extension (due_date pushed back)
      if (
        data.due_date !== undefined &&
        current.due_date !== null &&
        new Date(data.due_date) > new Date(current.due_date)
      ) {
        const daysDelta = Math.ceil(
          (new Date(data.due_date).getTime() - new Date(current.due_date).getTime()) /
            (1000 * 60 * 60 * 24)
        )
        await autoFlagScopeChange(
          {
            project_id: projectId,
            trigger_type: 'timeline_extended',
            affected_deliverable_id: deliverableId,
            deliverable_title: data.title || current.title,
            change_delta: {
              field: 'due_date',
              before: current.due_date,
              after: data.due_date,
              deliverable_title: data.title || current.title,
            },
            timeline_delta_days: daysDelta,
          },
          user.id,
          profile.email,
          profile.role
        )
      }

      // Check for title/description modification (compared to baseline)
      const baselineSnapshot = baseline.deliverables_snapshot as Array<{
        id: string
        title: string
        description: string | null
      }>
      const baselineDeliverable = baselineSnapshot.find((d) => d.id === deliverableId)
      if (baselineDeliverable) {
        const titleChanged = data.title !== undefined && data.title !== baselineDeliverable.title
        const descChanged =
          data.description !== undefined && data.description !== baselineDeliverable.description

        if (titleChanged || descChanged) {
          const field = titleChanged ? 'title' : 'description'
          await autoFlagScopeChange(
            {
              project_id: projectId,
              trigger_type: 'deliverable_modified',
              affected_deliverable_id: deliverableId,
              deliverable_title: data.title || current.title,
              change_delta: {
                field,
                before: titleChanged ? baselineDeliverable.title : baselineDeliverable.description,
                after: titleChanged ? data.title : data.description,
                deliverable_title: data.title || current.title,
              },
            },
            user.id,
            profile.email,
            profile.role
          )
        }
      }
    } catch (e) {
      console.error('Failed to auto-flag scope change:', e)
    }
  }

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

  // Notify project stakeholders of deliverable status change
  try {
    await notifyProjectStakeholders({
      projectId,
      type: 'deliverable_status_change',
      title: `Deliverable ${status}`,
      message: `"${current?.title}" status changed to ${status}`,
      actorId: user.id,
      excludeUserId: user.id,
    })
  } catch (e) {
    console.error('[updateDeliverableStatusAction] Notification failed:', e)
  }

  revalidatePath(`/projects/${projectId}`)
}

export async function deleteDeliverableAction(
  deliverableId: string,
  projectId: string
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get deliverable details and user profile before deletion
  const [{ data: deliverable }, { data: profile }, baseline] = await Promise.all([
    supabase.from('deliverables').select('title, estimated_hours').eq('id', deliverableId).single(),
    supabase.from('profiles').select('email, role').eq('id', user.id).single(),
    getBaseline(projectId),
  ])

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

  // Auto-flag scope change if baseline exists and deliverable was in baseline
  if (baseline && deliverable && profile) {
    try {
      const baselineSnapshot = baseline.deliverables_snapshot as Array<{ id: string; title: string }>
      const wasInBaseline = baselineSnapshot.some((d) => d.id === deliverableId)

      if (wasInBaseline) {
        await autoFlagScopeChange(
          {
            project_id: projectId,
            trigger_type: 'deliverable_removed',
            affected_deliverable_id: deliverableId,
            deliverable_title: deliverable.title,
            change_delta: {
              field: 'deliverable',
              before: deliverable.title,
              after: null,
              deliverable_title: deliverable.title,
            },
            hours_delta: -(deliverable.estimated_hours || 0),
          },
          user.id,
          profile.email,
          profile.role
        )
      }
    } catch (e) {
      console.error('Failed to auto-flag scope change:', e)
    }
  }

  revalidatePath(`/projects/${projectId}`)
}
