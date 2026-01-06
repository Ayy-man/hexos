import { createClient } from '@/lib/supabase/server'
import { logPulseEvent } from './pulse'

// ============================================================================
// Types
// ============================================================================

export type TargetStatus = 'not_started' | 'in_progress' | 'completed'
export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4'

export interface PulseTarget {
  id: string
  goal_id: string | null
  quarter: Quarter
  title: string
  status: TargetStatus
  due_date: string | null
  completed_at: string | null
  position: number
  created_at: string
  updated_at: string
}

export interface PulseTargetWithOwners extends PulseTarget {
  owners: Array<{
    id: string
    name: string
    email: string
  }>
  actions: PulseAction[]
}

export interface PulseAction {
  id: string
  target_id: string
  title: string
  owner_id: string | null
  due_date: string | null
  completed_at: string | null
  position: number
  created_at: string
  owner?: {
    id: string
    name: string
    email: string
  }
}

export interface CreateTargetInput {
  goal_id?: string
  quarter: Quarter
  title: string
  due_date?: string
  owner_ids?: string[]
}

export interface UpdateTargetInput {
  title?: string
  quarter?: Quarter
  status?: TargetStatus
  due_date?: string | null
  position?: number
}

export interface CreateActionInput {
  target_id: string
  title: string
  owner_id?: string
  due_date?: string
}

export interface UpdateActionInput {
  title?: string
  owner_id?: string | null
  due_date?: string | null
  position?: number
}

// ============================================================================
// Target CRUD
// ============================================================================

export async function getTargetsForQuarter(
  goalId: string | null,
  quarter: Quarter
): Promise<PulseTargetWithOwners[]> {
  const supabase = await createClient()

  let query = supabase
    .from('pulse_targets')
    .select(`
      *,
      pulse_target_owners (
        user_id,
        profiles:user_id (
          id,
          name,
          email
        )
      ),
      pulse_actions (
        *,
        owner:owner_id (
          id,
          name,
          email
        )
      )
    `)
    .eq('quarter', quarter)
    .order('position', { ascending: true })

  if (goalId) {
    query = query.eq('goal_id', goalId)
  }

  const { data, error } = await query

  if (error) {
    console.error('[Pulse Targets] Failed to fetch targets:', error)
    return []
  }

  // Transform the data
  return (data || []).map(target => ({
    ...target,
    owners: (target.pulse_target_owners || []).map((o: { profiles: { id: string; name: string; email: string } }) => o.profiles),
    actions: (target.pulse_actions || []).sort((a: PulseAction, b: PulseAction) => a.position - b.position),
  })) as PulseTargetWithOwners[]
}

export async function getTargetById(targetId: string): Promise<PulseTargetWithOwners | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pulse_targets')
    .select(`
      *,
      pulse_target_owners (
        user_id,
        profiles:user_id (
          id,
          name,
          email
        )
      ),
      pulse_actions (
        *,
        owner:owner_id (
          id,
          name,
          email
        )
      )
    `)
    .eq('id', targetId)
    .single()

  if (error) {
    console.error('[Pulse Targets] Failed to fetch target:', error)
    return null
  }

  return {
    ...data,
    owners: (data.pulse_target_owners || []).map((o: { profiles: { id: string; name: string; email: string } }) => o.profiles),
    actions: (data.pulse_actions || []).sort((a: PulseAction, b: PulseAction) => a.position - b.position),
  } as PulseTargetWithOwners
}

export async function createTarget(input: CreateTargetInput): Promise<PulseTarget | null> {
  const supabase = await createClient()

  // Get max position for this quarter
  const { data: existing } = await supabase
    .from('pulse_targets')
    .select('position')
    .eq('quarter', input.quarter)
    .order('position', { ascending: false })
    .limit(1)

  const nextPosition = (existing?.[0]?.position ?? -1) + 1

  const { data, error } = await supabase
    .from('pulse_targets')
    .insert({
      goal_id: input.goal_id || null,
      quarter: input.quarter,
      title: input.title,
      due_date: input.due_date || null,
      position: nextPosition,
    })
    .select()
    .single()

  if (error) {
    console.error('[Pulse Targets] Failed to create target:', error)
    return null
  }

  // Add owners if provided
  if (input.owner_ids?.length) {
    const ownerInserts = input.owner_ids.map(userId => ({
      target_id: data.id,
      user_id: userId,
    }))

    await supabase.from('pulse_target_owners').insert(ownerInserts)
  }

  return data as PulseTarget
}

export async function updateTarget(
  targetId: string,
  input: UpdateTargetInput
): Promise<PulseTarget | null> {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = { ...input }

  // If completing, set completed_at
  if (input.status === 'completed') {
    updateData.completed_at = new Date().toISOString()
  } else if (input.status) {
    // Status is not 'completed', clear completed_at
    updateData.completed_at = null
  }

  const { data, error } = await supabase
    .from('pulse_targets')
    .update(updateData)
    .eq('id', targetId)
    .select()
    .single()

  if (error) {
    console.error('[Pulse Targets] Failed to update target:', error)
    return null
  }

  return data as PulseTarget
}

export async function deleteTarget(targetId: string): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('pulse_targets')
    .delete()
    .eq('id', targetId)

  if (error) {
    console.error('[Pulse Targets] Failed to delete target:', error)
    return false
  }

  return true
}

// ============================================================================
// Target Owners
// ============================================================================

export async function setTargetOwners(
  targetId: string,
  ownerIds: string[]
): Promise<boolean> {
  const supabase = await createClient()

  // Delete existing owners
  await supabase
    .from('pulse_target_owners')
    .delete()
    .eq('target_id', targetId)

  if (ownerIds.length === 0) return true

  // Insert new owners
  const ownerInserts = ownerIds.map(userId => ({
    target_id: targetId,
    user_id: userId,
  }))

  const { error } = await supabase
    .from('pulse_target_owners')
    .insert(ownerInserts)

  if (error) {
    console.error('[Pulse Targets] Failed to set owners:', error)
    return false
  }

  return true
}

// ============================================================================
// Action CRUD
// ============================================================================

export async function createAction(input: CreateActionInput): Promise<PulseAction | null> {
  const supabase = await createClient()

  // Get max position for this target
  const { data: existing } = await supabase
    .from('pulse_actions')
    .select('position')
    .eq('target_id', input.target_id)
    .order('position', { ascending: false })
    .limit(1)

  const nextPosition = (existing?.[0]?.position ?? -1) + 1

  const { data, error } = await supabase
    .from('pulse_actions')
    .insert({
      target_id: input.target_id,
      title: input.title,
      owner_id: input.owner_id || null,
      due_date: input.due_date || null,
      position: nextPosition,
    })
    .select()
    .single()

  if (error) {
    console.error('[Pulse Actions] Failed to create action:', error)
    return null
  }

  // Set target to in_progress if it was not_started
  await supabase
    .from('pulse_targets')
    .update({ status: 'in_progress' })
    .eq('id', input.target_id)
    .eq('status', 'not_started')

  return data as PulseAction
}

export async function updateAction(
  actionId: string,
  input: UpdateActionInput
): Promise<PulseAction | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pulse_actions')
    .update(input)
    .eq('id', actionId)
    .select()
    .single()

  if (error) {
    console.error('[Pulse Actions] Failed to update action:', error)
    return null
  }

  return data as PulseAction
}

export async function completeAction(
  actionId: string,
  userId: string
): Promise<PulseAction | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pulse_actions')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', actionId)
    .select('*, target_id')
    .single()

  if (error) {
    console.error('[Pulse Actions] Failed to complete action:', error)
    return null
  }

  // Log pulse event
  await logPulseEvent(userId, 'action_completed', 'action', actionId)

  // Check if all actions for the target are complete
  await checkAndCompleteTarget(data.target_id, userId)

  return data as PulseAction
}

export async function uncompleteAction(actionId: string): Promise<PulseAction | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pulse_actions')
    .update({ completed_at: null })
    .eq('id', actionId)
    .select()
    .single()

  if (error) {
    console.error('[Pulse Actions] Failed to uncomplete action:', error)
    return null
  }

  return data as PulseAction
}

export async function deleteAction(actionId: string): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('pulse_actions')
    .delete()
    .eq('id', actionId)

  if (error) {
    console.error('[Pulse Actions] Failed to delete action:', error)
    return false
  }

  return true
}

// ============================================================================
// Reordering
// ============================================================================

export async function reorderTargets(
  quarter: Quarter,
  targetIds: string[]
): Promise<boolean> {
  const supabase = await createClient()

  const updates = targetIds.map((id, index) =>
    supabase
      .from('pulse_targets')
      .update({ position: index })
      .eq('id', id)
      .eq('quarter', quarter)
  )

  try {
    await Promise.all(updates)
    return true
  } catch (error) {
    console.error('[Pulse Targets] Failed to reorder targets:', error)
    return false
  }
}

export async function reorderActions(
  targetId: string,
  actionIds: string[]
): Promise<boolean> {
  const supabase = await createClient()

  const updates = actionIds.map((id, index) =>
    supabase
      .from('pulse_actions')
      .update({ position: index })
      .eq('id', id)
      .eq('target_id', targetId)
  )

  try {
    await Promise.all(updates)
    return true
  } catch (error) {
    console.error('[Pulse Actions] Failed to reorder actions:', error)
    return false
  }
}

export async function moveTargetToQuarter(
  targetId: string,
  newQuarter: Quarter
): Promise<PulseTarget | null> {
  const supabase = await createClient()

  // Get max position for new quarter
  const { data: existing } = await supabase
    .from('pulse_targets')
    .select('position')
    .eq('quarter', newQuarter)
    .order('position', { ascending: false })
    .limit(1)

  const newPosition = (existing?.[0]?.position ?? -1) + 1

  const { data, error } = await supabase
    .from('pulse_targets')
    .update({
      quarter: newQuarter,
      position: newPosition,
    })
    .eq('id', targetId)
    .select()
    .single()

  if (error) {
    console.error('[Pulse Targets] Failed to move target:', error)
    return null
  }

  return data as PulseTarget
}

// ============================================================================
// Progress Calculation
// ============================================================================

export function calculateTargetProgress(target: PulseTargetWithOwners): number {
  if (!target.actions?.length) return 0

  const completed = target.actions.filter(a => a.completed_at != null).length
  return Math.round((completed / target.actions.length) * 100)
}

// ============================================================================
// Helper Functions
// ============================================================================

async function checkAndCompleteTarget(targetId: string, userId: string): Promise<void> {
  const supabase = await createClient()

  // Check if all actions for this target are complete
  const { data: actions } = await supabase
    .from('pulse_actions')
    .select('completed_at')
    .eq('target_id', targetId)

  const allComplete = actions?.every(a => a.completed_at != null)

  if (allComplete && actions && actions.length > 0) {
    // Complete the target
    await supabase
      .from('pulse_targets')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', targetId)

    // Log target completion event
    await logPulseEvent(userId, 'target_completed', 'target', targetId)
  }
}

// ============================================================================
// Utilities
// ============================================================================

export function getCurrentQuarter(): Quarter {
  const month = new Date().getMonth() + 1 // 1-12
  if (month <= 3) return 'Q1'
  if (month <= 6) return 'Q2'
  if (month <= 9) return 'Q3'
  return 'Q4'
}

export function getQuarterDateRange(
  year: number,
  quarter: Quarter
): { start: string; end: string } {
  const quarterMap: Record<Quarter, { startMonth: number; endMonth: number }> = {
    Q1: { startMonth: 0, endMonth: 2 },
    Q2: { startMonth: 3, endMonth: 5 },
    Q3: { startMonth: 6, endMonth: 8 },
    Q4: { startMonth: 9, endMonth: 11 },
  }

  const { startMonth, endMonth } = quarterMap[quarter]
  const start = new Date(year, startMonth, 1)
  const end = new Date(year, endMonth + 1, 0) // Last day of end month

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}
