import { createClient } from '@/lib/supabase/server'

// ============================================
// Types
// ============================================

export type DeliverableChangeStatus =
  | 'original'
  | 'edited'
  | 'added'
  | 'removed'
  | 'approved'
  | 'rejected'
  | 'countered'
  | 'counter_accepted'  // DFY accepted the counter
  | 'counter_rejected'  // DFY rejected the counter, needs re-review

export type DeliverableSource = 'ai_parsed' | 'blueprint_tier' | 'custom'

export interface ProposalDeliverable {
  id: string
  inquiry_id: string
  name: string
  description: string | null
  price: number | null
  source: DeliverableSource
  source_blueprint_id: string | null
  source_tier_name: string | null
  ai_confidence: number | null
  ai_source_text: string | null
  change_status: DeliverableChangeStatus
  original_name: string | null
  original_description: string | null
  original_price: number | null
  counter_name: string | null
  counter_description: string | null
  counter_price: number | null
  counter_note: string | null
  created_by: string | null
  created_at: string
  updated_by: string | null
  updated_at: string
  sort_order: number
}

export interface DeliverableComment {
  id: string
  deliverable_id: string
  content: string
  author_id: string
  author?: { id: string; name: string; email: string }
  created_at: string
}

export interface CreateDeliverableInput {
  inquiry_id: string
  name: string
  description?: string
  price?: number
  source?: DeliverableSource
  source_blueprint_id?: string
  source_tier_name?: string
  ai_confidence?: number
  ai_source_text?: string
  sort_order?: number
}

export interface UpdateDeliverableInput {
  name?: string
  description?: string
  price?: number
  change_status?: DeliverableChangeStatus
  counter_name?: string
  counter_description?: string
  counter_price?: number
  counter_note?: string
  sort_order?: number
}

// ============================================
// History Types
// ============================================

export type HistoryAction =
  | 'created'
  | 'dfy_edited'
  | 'dfy_removed'
  | 'dfy_added'
  | 'int_approved'
  | 'int_rejected'
  | 'int_countered'
  | 'dfy_accepted_counter'
  | 'dfy_rejected_counter'
  | 'reverted'

export interface DeliverableHistoryEntry {
  id: string
  deliverable_id: string
  version: number
  name: string
  description: string | null
  price: number | null
  change_status: string | null
  counter_name: string | null
  counter_description: string | null
  counter_price: number | null
  counter_note: string | null
  action: HistoryAction
  actor_id: string | null
  actor_role: 'dfy' | 'admin' | 'system'
  note: string | null
  created_at: string
}

// ============================================
// Query Functions
// ============================================

export async function getProposalDeliverables(
  inquiryId: string
): Promise<ProposalDeliverable[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('proposal_deliverables')
    .select('*')
    .eq('inquiry_id', inquiryId)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getProposalDeliverable(
  id: string
): Promise<ProposalDeliverable | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('proposal_deliverables')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

// ============================================
// Create Operations
// ============================================

export async function createProposalDeliverable(
  input: CreateDeliverableInput
): Promise<ProposalDeliverable> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('proposal_deliverables')
    .insert({
      inquiry_id: input.inquiry_id,
      name: input.name,
      description: input.description || null,
      price: input.price || null,
      source: input.source || 'custom',
      source_blueprint_id: input.source_blueprint_id || null,
      source_tier_name: input.source_tier_name || null,
      ai_confidence: input.ai_confidence || null,
      ai_source_text: input.ai_source_text || null,
      change_status: input.source === 'ai_parsed' ? 'original' : 'added',
      created_by: user?.id,
      sort_order: input.sort_order || 0,
    })
    .select()
    .single()

  if (error) throw error

  // Log history for new deliverable
  const action: HistoryAction = input.source === 'ai_parsed' ? 'created' : 'dfy_added'
  const actorRole: 'dfy' | 'admin' | 'system' = input.source === 'ai_parsed' ? 'system' : 'dfy'
  await insertHistory(supabase, data.id, data, action, user?.id || null, actorRole)

  return data
}

// Bulk create deliverables from AI parsing
export async function bulkCreateDeliverablesFromAI(
  inquiryId: string,
  deliverables: Array<{
    name: string
    description?: string
    price?: number
    confidence: number
    sourceText: string
  }>
): Promise<ProposalDeliverable[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const records = deliverables.map((d, index) => ({
    inquiry_id: inquiryId,
    name: d.name,
    description: d.description || null,
    price: d.price || null,
    source: 'ai_parsed' as DeliverableSource,
    ai_confidence: d.confidence,
    ai_source_text: d.sourceText,
    change_status: 'original' as DeliverableChangeStatus,
    created_by: user?.id,
    sort_order: index,
  }))

  const { data, error } = await supabase
    .from('proposal_deliverables')
    .insert(records)
    .select()

  if (error) throw error

  // Log history for each created deliverable
  if (data) {
    await Promise.all(
      data.map((d) => insertHistory(supabase, d.id, d, 'created', user?.id || null, 'system'))
    )
  }

  return data || []
}

// Add all features from a blueprint tier as deliverables
export async function bulkCreateFromBlueprintTier(
  inquiryId: string,
  blueprintId: string,
  tierName: string,
  tierPrice: number,
  features: string[]
): Promise<ProposalDeliverable[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Get current max sort_order
  const { data: existing } = await supabase
    .from('proposal_deliverables')
    .select('sort_order')
    .eq('inquiry_id', inquiryId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const startOrder = (existing?.[0]?.sort_order || 0) + 1

  const records = features.map((feature, index) => ({
    inquiry_id: inquiryId,
    name: feature,
    description: null,
    price: index === 0 ? tierPrice : null, // Put tier price on first item
    source: 'blueprint_tier' as DeliverableSource,
    source_blueprint_id: blueprintId,
    source_tier_name: tierName,
    change_status: 'added' as DeliverableChangeStatus,
    created_by: user?.id,
    sort_order: startOrder + index,
  }))

  const { data, error } = await supabase
    .from('proposal_deliverables')
    .insert(records)
    .select()

  if (error) throw error

  // Log history for each created deliverable
  if (data) {
    await Promise.all(
      data.map((d) => insertHistory(supabase, d.id, d, 'dfy_added', user?.id || null, 'dfy'))
    )
  }

  return data || []
}

// ============================================
// Update Operations
// ============================================

export async function updateProposalDeliverable(
  id: string,
  input: UpdateDeliverableInput
): Promise<ProposalDeliverable> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Get current deliverable to preserve original values
  const { data: current } = await supabase
    .from('proposal_deliverables')
    .select('*')
    .eq('id', id)
    .single()

  if (!current) throw new Error('Deliverable not found')

  // Build update object
  const updateData: Record<string, unknown> = {
    updated_by: user?.id,
    updated_at: new Date().toISOString(),
  }

  // Track if this is an edit (vs just status change)
  let isEdit = false

  if (input.name !== undefined && input.name !== current.name) {
    updateData.name = input.name
    if (!current.original_name) {
      updateData.original_name = current.name
    }
    isEdit = true
  }

  if (input.description !== undefined && input.description !== current.description) {
    updateData.description = input.description
    if (!current.original_description) {
      updateData.original_description = current.description
    }
    isEdit = true
  }

  if (input.price !== undefined && input.price !== current.price) {
    updateData.price = input.price
    if (current.original_price === null && current.price !== null) {
      updateData.original_price = current.price
    }
    isEdit = true
  }

  // If edited and was original, mark as edited
  if (isEdit && current.change_status === 'original') {
    updateData.change_status = 'edited'
  }

  // Allow explicit status changes
  if (input.change_status !== undefined) {
    updateData.change_status = input.change_status
  }

  // Counter-offer fields
  if (input.counter_name !== undefined) {
    updateData.counter_name = input.counter_name
  }
  if (input.counter_description !== undefined) {
    updateData.counter_description = input.counter_description
  }
  if (input.counter_price !== undefined) {
    updateData.counter_price = input.counter_price
  }
  if (input.counter_note !== undefined) {
    updateData.counter_note = input.counter_note
  }

  if (input.sort_order !== undefined) {
    updateData.sort_order = input.sort_order
  }

  const { data, error } = await supabase
    .from('proposal_deliverables')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  // Log history if this was an actual edit (not just status/counter update)
  console.log('[updateProposalDeliverable] isEdit:', isEdit, 'for deliverable:', id)
  if (isEdit) {
    console.log('[updateProposalDeliverable] Calling insertHistory...')
    await insertHistory(supabase, id, data, 'dfy_edited', user?.id || null, 'dfy')
  }

  return data
}

// Revert a deliverable to its original values
export async function revertDeliverable(id: string): Promise<ProposalDeliverable> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: current } = await supabase
    .from('proposal_deliverables')
    .select('*')
    .eq('id', id)
    .single()

  if (!current) throw new Error('Deliverable not found')

  const { data, error } = await supabase
    .from('proposal_deliverables')
    .update({
      name: current.original_name || current.name,
      description: current.original_description || current.description,
      price: current.original_price ?? current.price,
      change_status: 'original',
      original_name: null,
      original_description: null,
      original_price: null,
      updated_by: user?.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  // Log history for revert
  await insertHistory(supabase, id, data, 'reverted', user?.id || null, 'dfy')

  return data
}

// ============================================
// Review Operations (INT)
// ============================================

export async function reviewDeliverable(
  id: string,
  decision: 'approved' | 'rejected' | 'countered',
  counterName?: string,
  counterDescription?: string,
  counterPrice?: number,
  counterNote?: string
): Promise<ProposalDeliverable> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Get current state for history logging
  const { data: current } = await supabase
    .from('proposal_deliverables')
    .select('*')
    .eq('id', id)
    .single()

  if (!current) throw new Error('Deliverable not found')

  const updateData: Record<string, unknown> = {
    change_status: decision,
    updated_by: user?.id,
    updated_at: new Date().toISOString(),
  }

  if (decision === 'countered') {
    // Set counter fields (only if provided or explicitly changing)
    updateData.counter_name = counterName ?? null
    updateData.counter_description = counterDescription ?? null
    updateData.counter_price = counterPrice ?? null
    updateData.counter_note = counterNote ?? null
  }

  const { data, error } = await supabase
    .from('proposal_deliverables')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  // Log history
  const actionMap = {
    approved: 'int_approved',
    rejected: 'int_rejected',
    countered: 'int_countered',
  } as const
  await insertHistory(supabase, id, data, actionMap[decision], user?.id || null, 'admin', counterNote)

  return data
}

export async function bulkApproveDeliverables(ids: string[]): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('proposal_deliverables')
    .update({
      change_status: 'approved',
      updated_by: user?.id,
      updated_at: new Date().toISOString(),
    })
    .in('id', ids)

  if (error) throw error
}

// ============================================
// Delete Operations
// ============================================

export async function deleteProposalDeliverable(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('proposal_deliverables')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Soft delete - mark as removed (used by DFY)
export async function markDeliverableRemoved(id: string): Promise<ProposalDeliverable> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('proposal_deliverables')
    .update({
      change_status: 'removed',
      updated_by: user?.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  // Log history for removal
  await insertHistory(supabase, id, data, 'dfy_removed', user?.id || null, 'dfy')

  return data
}

// ============================================
// Comment Operations
// ============================================

export async function getDeliverableComments(
  deliverableId: string
): Promise<DeliverableComment[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('proposal_deliverable_comments')
    .select(
      `
      *,
      author:profiles!author_id(id, name, email)
    `
    )
    .eq('deliverable_id', deliverableId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

export async function addDeliverableComment(
  deliverableId: string,
  content: string
): Promise<DeliverableComment> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('proposal_deliverable_comments')
    .insert({
      deliverable_id: deliverableId,
      content,
      author_id: user.id,
    })
    .select(
      `
      *,
      author:profiles!author_id(id, name, email)
    `
    )
    .single()

  if (error) throw error
  return data
}

export async function deleteDeliverableComment(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('proposal_deliverable_comments')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ============================================
// Utility Functions
// ============================================

// Get deliverables summary for an inquiry
export async function getDeliverablesSummary(inquiryId: string): Promise<{
  total: number
  originalTotal: number
  hasChanges: boolean
  pendingReview: number
}> {
  const deliverables = await getProposalDeliverables(inquiryId)

  const activeDeliverables = deliverables.filter(
    (d) => d.change_status !== 'removed' && d.change_status !== 'rejected'
  )

  const total = activeDeliverables.reduce((sum, d) => sum + (d.price || 0), 0)

  const originalTotal = deliverables
    .filter((d) => d.source === 'ai_parsed' && d.change_status !== 'removed')
    .reduce((sum, d) => sum + (d.original_price ?? d.price ?? 0), 0)

  const hasChanges = deliverables.some(
    (d) =>
      d.change_status === 'edited' ||
      d.change_status === 'added' ||
      d.change_status === 'removed'
  )

  const pendingReview = deliverables.filter(
    (d) =>
      d.change_status === 'edited' ||
      d.change_status === 'added' ||
      d.change_status === 'removed'
  ).length

  return { total, originalTotal, hasChanges, pendingReview }
}

// ============================================
// History Functions
// ============================================

// Helper to insert history - takes supabase client as param to use the same authenticated client
async function insertHistory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  deliverableId: string,
  deliverable: ProposalDeliverable,
  action: HistoryAction,
  actorId: string | null,
  actorRole: 'dfy' | 'admin' | 'system',
  note?: string
): Promise<void> {
  // Get next version number
  const { data: lastVersion } = await supabase
    .from('proposal_deliverable_history')
    .select('version')
    .eq('deliverable_id', deliverableId)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  const nextVersion = (lastVersion?.version || 0) + 1

  console.log('[insertHistory] Inserting version', nextVersion, 'for', deliverableId, 'action:', action)

  const { error } = await supabase.from('proposal_deliverable_history').insert({
    deliverable_id: deliverableId,
    version: nextVersion,
    name: deliverable.name,
    description: deliverable.description,
    price: deliverable.price,
    change_status: deliverable.change_status,
    counter_name: deliverable.counter_name,
    counter_description: deliverable.counter_description,
    counter_price: deliverable.counter_price,
    counter_note: deliverable.counter_note,
    action,
    actor_id: actorId,
    actor_role: actorRole,
    note: note || null,
  })

  if (error) {
    console.error('[insertHistory] FAILED:', error.message, error.details, error.hint)
  } else {
    console.log('[insertHistory] SUCCESS: version', nextVersion)
  }
}

export async function getDeliverableHistory(
  deliverableId: string
): Promise<DeliverableHistoryEntry[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('proposal_deliverable_history')
    .select('*')
    .eq('deliverable_id', deliverableId)
    .order('version', { ascending: false })

  if (error) throw error
  return (data || []) as DeliverableHistoryEntry[]
}

// ============================================
// DFY Counter Response Functions
// ============================================

export async function acceptCounter(id: string): Promise<ProposalDeliverable> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Get current deliverable to apply counter values
  const { data: current, error: fetchError } = await supabase
    .from('proposal_deliverables')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !current) throw new Error('Deliverable not found')

  // Apply counter values as new values
  const updateData: Record<string, unknown> = {
    change_status: 'counter_accepted',
    updated_by: user?.id,
    updated_at: new Date().toISOString(),
  }

  // Apply counter name if it exists
  if (current.counter_name) {
    updateData.name = current.counter_name
  }
  // Apply counter description if it exists
  if (current.counter_description) {
    updateData.description = current.counter_description
  }
  // Apply counter price if it exists
  if (current.counter_price !== null) {
    updateData.price = current.counter_price
  }

  // Clear counter fields after accepting
  updateData.counter_name = null
  updateData.counter_description = null
  updateData.counter_price = null
  updateData.counter_note = null

  const { data, error } = await supabase
    .from('proposal_deliverables')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  // Log history
  await insertHistory(supabase, id, data, 'dfy_accepted_counter', user?.id || null, 'dfy')

  return data
}

export async function rejectCounter(id: string, reason?: string): Promise<ProposalDeliverable> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Keep the current values but change status to counter_rejected
  // This signals to admin they need to re-review
  const { data, error } = await supabase
    .from('proposal_deliverables')
    .update({
      change_status: 'counter_rejected',
      updated_by: user?.id,
      updated_at: new Date().toISOString(),
      // Keep counter values visible so admin can see what was rejected
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  // Log history
  await insertHistory(supabase, id, data, 'dfy_rejected_counter', user?.id || null, 'dfy', reason)

  return data
}
