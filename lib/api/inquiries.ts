import { createClient } from '@/lib/supabase/server'
import type { CreateInquiryData } from '@/features/inquiries/types'
import type { CreateRequirementInput } from './project-requirements'
import { bulkCreateProjectRequirements } from './project-requirements'

export type { CreateInquiryData }

// Deliverables negotiation status
export type DeliverablesNegotiationStatus =
  | 'none'
  | 'parsing'
  | 'dfy_editing'
  | 'dfy_submitted'
  | 'int_reviewing'
  | 'approved'
  | 'needs_revision'

export async function createInquiry(data: CreateInquiryData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: inquiry, error } = await supabase
    .from('inquiries')
    .insert({
      submitted_by: user?.id,
      partner_name: data.partner_name,
      submission_type: data.submission_type,
      deal_type: data.deal_type,
      form_path: data.form_path,
      prospect_company_name: data.prospect_company_name,
      prospect_website: data.prospect_website,
      industry: data.industry,
      blueprint_id: data.blueprint_id || null,
      form_data: data.form_data,
      forward_emails: data.forward_emails || [],
    })
    .select()
    .single()

  if (error) throw error
  return inquiry
}

export type InquiryFilter = 'active' | 'archived' | 'all'
export type ProposalStage = 'unopened' | 'admin_reviewed' | 'in_queue' | 'working' | 'on_hold' | 'final_review' | 'ready' | 'sent' | 'closed' | 'lost'
export type Priority = 'low' | 'normal' | 'high' | 'urgent'

export async function getInquiries(filter: InquiryFilter = 'active') {
  const supabase = await createClient()

  let query = supabase
    .from('inquiries')
    .select(`
      *,
      blueprint:blueprints(name),
      submitter:profiles!submitted_by(name, email),
      assignee:profiles!assigned_to(id, name, email),
      project:projects!converted_to_project_id(id, project_name)
    `)
    .is('deleted_at', null) // Never show soft-deleted

  // Filter by archive status
  if (filter === 'active') {
    query = query.is('archived_at', null)
  } else if (filter === 'archived') {
    query = query.not('archived_at', 'is', null)
  }
  // 'all' shows both archived and active

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getInquiry(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inquiries')
    .select(`
      *,
      blueprint:blueprints(name, description),
      submitter:profiles!submitted_by(name, email),
      assignee:profiles!assigned_to(id, name, email),
      project:projects!converted_to_project_id(id, project_name)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function updateInquiryStatus(id: string, status: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('inquiries')
    .update({ status })
    .eq('id', id)

  if (error) throw error
}

export async function convertInquiryToProject(inquiryId: string, projectId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('inquiries')
    .update({
      status: 'converted',
      converted_to_project_id: projectId,
    })
    .eq('id', inquiryId)

  if (error) throw error
}

// Document content operations for Plate.js editor
export async function updateInquiryDocument(
  id: string,
  documentContent: unknown,
  inlineDiscussions?: unknown
) {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = { document_content: documentContent }
  if (inlineDiscussions !== undefined) {
    updateData.inline_discussions = inlineDiscussions
  }

  const { error } = await supabase
    .from('inquiries')
    .update(updateData)
    .eq('id', id)

  if (error) throw error
}

export async function getInquiryDocument(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inquiries')
    .select('id, document_content, inline_discussions')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

// Archive/Unarchive/Delete operations
export async function archiveInquiry(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('inquiries')
    .update({
      archived_at: new Date().toISOString(),
      archived_by: user?.id,
    })
    .eq('id', id)

  if (error) throw error
}

export async function unarchiveInquiry(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('inquiries')
    .update({
      archived_at: null,
      archived_by: null,
    })
    .eq('id', id)

  if (error) throw error
}

export async function deleteInquiry(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Soft delete
  const { error } = await supabase
    .from('inquiries')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: user?.id,
    })
    .eq('id', id)

  if (error) throw error
}

export async function restoreInquiry(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('inquiries')
    .update({
      deleted_at: null,
      deleted_by: null,
    })
    .eq('id', id)

  if (error) throw error
}

// Proposal stage management
export async function updateInquiryStage(
  id: string,
  stage: ProposalStage,
  notes?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get current inquiry to update stage history
  const { data: inquiry } = await supabase
    .from('inquiries')
    .select('proposal_stage, stage_history')
    .eq('id', id)
    .single()

  const stageHistory = (inquiry?.stage_history as unknown[]) || []
  const historyEntry = {
    from: inquiry?.proposal_stage || 'unopened',
    to: stage,
    changed_by: user?.id,
    changed_at: new Date().toISOString(),
    notes: notes || null,
  }

  const { error } = await supabase
    .from('inquiries')
    .update({
      proposal_stage: stage,
      stage_entered_at: new Date().toISOString(),
      stage_history: [...stageHistory, historyEntry],
    })
    .eq('id', id)

  if (error) throw error
}

export async function updateInquiryPriority(id: string, priority: Priority) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('inquiries')
    .update({ priority })
    .eq('id', id)

  if (error) throw error
}

export async function updateInquiryDueDate(id: string, dueDate: Date | null) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('inquiries')
    .update({ due_date: dueDate?.toISOString().split('T')[0] || null })
    .eq('id', id)

  if (error) throw error
}

export async function assignInquiry(id: string, assignedTo: string | null) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('inquiries')
    .update({ assigned_to: assignedTo })
    .eq('id', id)

  if (error) throw error
}

export async function updateInquiryEstimatedValue(id: string, value: number | null) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('inquiries')
    .update({ estimated_value: value })
    .eq('id', id)

  if (error) throw error
}

// Bulk operations
export async function bulkUpdateInquiryStage(ids: string[], stage: ProposalStage) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Update each inquiry with stage history
  for (const id of ids) {
    await updateInquiryStage(id, stage, 'Bulk stage update')
  }
}

// Get inquiry by public token (for client view)
export async function getInquiryByPublicToken(token: string) {
  const supabase = await createClient()

  // First get the inquiry to check if it exists
  const { data, error } = await supabase
    .from('inquiries')
    .select(`
      id,
      prospect_company_name,
      partner_name,
      submission_type,
      form_path,
      document_content,
      estimated_value,
      pricing_notes,
      blueprint:blueprints(name, description, pricing_tiers),
      partner:profiles!submitted_by(logo_url),
      created_at,
      client_view_count
    `)
    .eq('public_token', token)
    .is('deleted_at', null)
    .single()

  if (error) throw error
  if (!data) return null

  // Increment view count
  await supabase
    .from('inquiries')
    .update({
      client_view_count: (data.client_view_count || 0) + 1,
      client_viewed_at: new Date().toISOString(),
    })
    .eq('public_token', token)

  return data
}

// Update pricing (estimated_value + pricing_notes)
export async function updateInquiryPricing(
  id: string,
  estimatedValue: number | null,
  pricingNotes: string | null
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('inquiries')
    .update({
      estimated_value: estimatedValue,
      pricing_notes: pricingNotes,
    })
    .eq('id', id)

  if (error) throw error
}

// Get public token for sharing
export async function getInquiryPublicToken(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inquiries')
    .select('public_token')
    .eq('id', id)
    .single()

  if (error) throw error
  return data?.public_token
}

// ============================================
// Proposal Tab Functions
// ============================================

// Save proposal content (admin only - auto-save)
export async function updateInquiryProposal(
  id: string,
  content: unknown,
  discussions: unknown
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('inquiries')
    .update({
      proposal_content: content,
      proposal_discussions: discussions,
    })
    .eq('id', id)

  if (error) throw error
}

// Submit proposal to DFY partner
export async function submitProposalToDfy(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get current stage history
  const { data: inquiry } = await supabase
    .from('inquiries')
    .select('proposal_stage, stage_history')
    .eq('id', id)
    .single()

  const stageHistory = (inquiry?.stage_history as Array<unknown>) || []
  const historyEntry = {
    from: inquiry?.proposal_stage || 'ready',
    to: 'sent',
    changed_by: user.id,
    changed_at: new Date().toISOString(),
    notes: 'Proposal sent to DFY partner',
  }

  const { error } = await supabase
    .from('inquiries')
    .update({
      proposal_submitted_at: new Date().toISOString(),
      proposal_submitted_by: user.id,
      proposal_stage: 'sent',
      stage_entered_at: new Date().toISOString(),
      stage_history: [...stageHistory, historyEntry],
    })
    .eq('id', id)

  if (error) throw error
}

// Unsubmit proposal (undo send) - admin only
export async function unsubmitProposalFromDfy(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get current stage history
  const { data: inquiry } = await supabase
    .from('inquiries')
    .select('proposal_stage, stage_history')
    .eq('id', id)
    .single()

  const stageHistory = (inquiry?.stage_history as Array<unknown>) || []
  const historyEntry = {
    from: inquiry?.proposal_stage || 'sent',
    to: 'ready',
    changed_by: user.id,
    changed_at: new Date().toISOString(),
    notes: 'Proposal submission undone',
  }

  const { error } = await supabase
    .from('inquiries')
    .update({
      proposal_submitted_at: null,
      proposal_submitted_by: null,
      proposal_stage: 'ready',
      stage_entered_at: new Date().toISOString(),
      stage_history: [...stageHistory, historyEntry],
    })
    .eq('id', id)

  if (error) throw error
}

// Save DFY's private version
export async function updateDfyVersion(id: string, content: unknown) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('inquiries')
    .update({
      dfy_version_content: content,
    })
    .eq('id', id)

  if (error) throw error
}

// Copy proposal content to DFY version
export async function copyProposalToDfyVersion(id: string) {
  const supabase = await createClient()

  // First get the proposal content
  const { data, error: fetchError } = await supabase
    .from('inquiries')
    .select('proposal_content')
    .eq('id', id)
    .single()

  if (fetchError) throw fetchError

  // Then copy it to dfy_version_content
  const { error: updateError } = await supabase
    .from('inquiries')
    .update({
      dfy_version_content: data.proposal_content,
    })
    .eq('id', id)

  if (updateError) throw updateError
}

// ============================================
// Deliverables Negotiation Functions
// ============================================

// Update deliverables negotiation status
export async function updateDeliverablesStatus(
  id: string,
  status: DeliverablesNegotiationStatus
) {
  // Use admin client to bypass RLS - status updates are triggered by system actions
  const { createClient: createAdminClient } = await import('@/lib/supabase/admin')
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('inquiries')
    .update({ deliverables_status: status })
    .eq('id', id)

  if (error) throw error
}

// Mark inquiry as closed by DFY
export async function markInquiryAsClosed(
  id: string,
  notes?: string,
  clientEmail?: string
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('inquiries')
    .update({
      closed_at: new Date().toISOString(),
      closed_by: user.id,
      closed_notes: notes || null,
      client_email: clientEmail || null,
    })
    .eq('id', id)

  if (error) throw error
}

// Undo mark as closed
export async function unmarkInquiryAsClosed(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('inquiries')
    .update({
      closed_at: null,
      closed_by: null,
      closed_notes: null,
      client_email: null,
    })
    .eq('id', id)

  if (error) throw error
}

// Reopen a closed/lost inquiry back to sent stage (admin only)
export async function reopenInquiry(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Get current stage history
  const { data: inquiry } = await supabase
    .from('inquiries')
    .select('proposal_stage, stage_history, status')
    .eq('id', id)
    .single()

  // Only allow reopening closed or lost inquiries
  if (inquiry?.proposal_stage !== 'closed' && inquiry?.proposal_stage !== 'lost') {
    throw new Error('Can only reopen closed or lost inquiries')
  }

  const stageHistory = (inquiry?.stage_history as Array<unknown>) || []
  const historyEntry = {
    from: inquiry?.proposal_stage,
    to: 'sent',
    changed_by: user.id,
    changed_at: new Date().toISOString(),
    notes: 'Inquiry reopened by admin',
  }

  const { error } = await supabase
    .from('inquiries')
    .update({
      proposal_stage: 'sent',
      stage_entered_at: new Date().toISOString(),
      stage_history: [...stageHistory, historyEntry],
      // Clear conversion if it was converted
      status: inquiry?.status === 'converted' ? 'pending' : inquiry?.status,
      converted_to_project_id: null,
      // Clear closed fields
      closed_at: null,
      closed_by: null,
      closed_notes: null,
    })
    .eq('id', id)

  if (error) throw error
}

// ============================================
// Project Conversion Functions
// ============================================

export interface ConvertToProjectInput {
  project_name: string
  client_name: string
  client_email?: string
  client_business?: string
  project_type?: string
  operational_mode?: string
  target_delivery_date?: string
  quoted_price?: number
  notes?: string
}

// Convert inquiry to project with deliverables and requirements
export async function convertInquiryToProjectFull(
  inquiryId: string,
  projectData: ConvertToProjectInput,
  deliverableIds: string[],
  requirements: Array<{ title: string; description?: string }>
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Get the inquiry to extract source info
  const { data: inquiry, error: inquiryError } = await supabase
    .from('inquiries')
    .select('submitted_by, blueprint_id')
    .eq('id', inquiryId)
    .single()

  if (inquiryError) throw inquiryError

  // 1. Create the project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      project_name: projectData.project_name,
      client_name: projectData.client_name,
      client_email: projectData.client_email || null,
      client_business: projectData.client_business || null,
      project_type: projectData.project_type || 'blueprint',
      operational_mode: projectData.operational_mode || 'hexona_devs_dfy',
      target_delivery_date: projectData.target_delivery_date || null,
      quoted_price: projectData.quoted_price || null,
      notes: projectData.notes || null,
      dfy_partner_id: inquiry.submitted_by,
      matched_blueprint_id: inquiry.blueprint_id,
      source_inquiry_id: inquiryId,
      status: 'deliverables_pending', // Start with sign-off flow
    })
    .select()
    .single()

  if (projectError) throw projectError

  // 2. Copy deliverables from proposal_deliverables to project deliverables
  if (deliverableIds.length > 0) {
    // Get the proposal deliverables
    const { data: proposalDeliverables, error: delError } = await supabase
      .from('proposal_deliverables')
      .select('*')
      .in('id', deliverableIds)

    if (delError) throw delError

    // Create project deliverables
    const projectDeliverables = proposalDeliverables
      .filter((d) => d.change_status !== 'removed' && d.change_status !== 'rejected')
      .map((d, index) => ({
        project_id: project.id,
        name: d.name,
        description: d.description,
        price: d.counter_price ?? d.price, // Use counter if exists
        status: 'pending',
        sort_order: index,
      }))

    if (projectDeliverables.length > 0) {
      const { error: insertDelError } = await supabase
        .from('deliverables')
        .insert(projectDeliverables)

      if (insertDelError) throw insertDelError
    }
  }

  // 3. Create project requirements
  if (requirements.length > 0) {
    await bulkCreateProjectRequirements(project.id, requirements)
  }

  // 4. Update the inquiry to link to the project and set stage to 'closed'
  // Get current stage history
  const { data: currentInquiry } = await supabase
    .from('inquiries')
    .select('proposal_stage, stage_history')
    .eq('id', inquiryId)
    .single()

  const stageHistory = (currentInquiry?.stage_history as Array<unknown>) || []
  const historyEntry = {
    from: currentInquiry?.proposal_stage || 'sent',
    to: 'closed',
    changed_by: user.id,
    changed_at: new Date().toISOString(),
    notes: 'Deal closed - converted to project',
  }

  const { error: updateError } = await supabase
    .from('inquiries')
    .update({
      status: 'converted',
      converted_to_project_id: project.id,
      proposal_stage: 'closed',
      stage_entered_at: new Date().toISOString(),
      stage_history: [...stageHistory, historyEntry],
    })
    .eq('id', inquiryId)

  if (updateError) throw updateError

  return project
}
