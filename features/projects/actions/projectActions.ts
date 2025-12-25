'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// ============================================
// Deliverables Sign-off Flow
// ============================================

export async function confirmDeliverablesAction(projectId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase
    .from('projects')
    .update({
      status: 'deliverables_pending',
      deliverables_confirmed_at: new Date().toISOString(),
      deliverables_confirmed_by: user.id,
    })
    .eq('id', projectId)

  // Log activity
  await supabase.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'deliverables_confirmed',
    details: {},
  })

  revalidatePath(`/projects/${projectId}`)
}

export async function sendForSignoffAction(projectId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase
    .from('projects')
    .update({
      status: 'awaiting_signoff',
      signoff_sent_at: new Date().toISOString(),
      signoff_sent_by: user.id,
    })
    .eq('id', projectId)

  // Log activity
  await supabase.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'signoff_sent',
    details: {},
  })

  revalidatePath(`/projects/${projectId}`)
}

export async function signOffDeliverablesAction(projectId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase
    .from('projects')
    .update({
      status: 'signed_off',
      signed_off_at: new Date().toISOString(),
      signed_off_by: user.id,
    })
    .eq('id', projectId)

  // Log activity
  await supabase.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'signed_off',
    details: {},
  })

  revalidatePath(`/projects/${projectId}`)
}

// ============================================
// Requirements
// ============================================

export async function updateRequirementStatusAction(
  requirementId: string,
  status: 'pending' | 'in_progress' | 'completed' | 'blocked'
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const updateData: Record<string, unknown> = { status }
  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString()
    updateData.completed_by = user.id
  } else {
    updateData.completed_at = null
    updateData.completed_by = null
  }

  const { data: requirement } = await supabase
    .from('project_requirements')
    .update(updateData)
    .eq('id', requirementId)
    .select('project_id')
    .single()

  if (requirement) {
    // Log activity
    await supabase.from('activity_log').insert({
      project_id: requirement.project_id,
      user_id: user.id,
      action: status === 'completed' ? 'requirement_completed' : 'requirement_updated',
      details: { requirement_id: requirementId, status },
    })

    revalidatePath(`/projects/${requirement.project_id}`)
  }
}

// ============================================
// Dev Assignment
// ============================================

export async function assignDevAction(projectId: string, devId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get dev name for activity log
  const { data: dev } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', devId)
    .single()

  await supabase
    .from('projects')
    .update({ assigned_dev_id: devId })
    .eq('id', projectId)

  // Log activity
  await supabase.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'dev_assigned',
    details: { dev_id: devId, dev_name: dev?.name },
  })

  revalidatePath(`/projects/${projectId}`)
}
