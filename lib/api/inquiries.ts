import { createClient } from '@/lib/supabase/server'
import type { CreateInquiryData } from '@/features/inquiries/types'

export type { CreateInquiryData }

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
export type ProposalStage = 'unopened' | 'admin_reviewed' | 'in_queue' | 'working' | 'on_hold' | 'final_review' | 'ready'
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

  const { error } = await supabase
    .from('inquiries')
    .update({
      proposal_submitted_at: new Date().toISOString(),
      proposal_submitted_by: user.id,
    })
    .eq('id', id)

  if (error) throw error
}

// Unsubmit proposal (undo send) - admin only
export async function unsubmitProposalFromDfy(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('inquiries')
    .update({
      proposal_submitted_at: null,
      proposal_submitted_by: null,
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
