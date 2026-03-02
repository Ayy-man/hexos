import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import type { CreateInquiryData } from '@/features/inquiries/types'
import type { CreateRequirementInput } from './project-requirements'
import { bulkCreateProjectRequirements } from './project-requirements'
import { createNotification } from './notifications'
import { notifyAdmins } from './notification-helpers'

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

  try {
    await notifyAdmins({
      type: 'inquiry_created',
      title: 'New Inquiry Submitted',
      message: `New inquiry from ${inquiry.prospect_company_name || 'Unknown'}: ${inquiry.form_data?.project_type || 'General'}`,
    })
  } catch (notifyErr) {
    console.error('[createInquiry] Notification failed:', notifyErr)
  }

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

// Mark inquiry as viewed by admin (sets admin_viewed_at if not already set)
export async function markInquiryAsViewed(id: string) {
  const supabase = await createClient()

  // Only set admin_viewed_at if it's not already set (first view only)
  const { error } = await supabase
    .from('inquiries')
    .update({
      admin_viewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .is('admin_viewed_at', null)

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
    .select('proposal_stage, stage_history, assigned_to, submitted_by, prospect_company_name')
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

  // Notify relevant users about stage change
  const stageLabels: Record<string, string> = {
    unopened: 'Unopened',
    admin_reviewed: 'Admin Reviewed',
    in_queue: 'In Queue',
    working: 'Working',
    on_hold: 'On Hold',
    final_review: 'Final Review',
    ready: 'Ready',
    sent: 'Sent',
    closed: 'Closed (Won)',
    lost: 'Lost',
  }

  // Notify assigned user if different from current user
  if (inquiry?.assigned_to && inquiry.assigned_to !== user?.id) {
    try {
      await createNotification({
        userId: inquiry.assigned_to,
        type: 'stage_changed',
        title: 'Inquiry Stage Updated',
        message: `"${inquiry.prospect_company_name || 'Inquiry'}" moved to ${stageLabels[stage] || stage}.`,
        actorId: user?.id,
      })
    } catch (notifyErr) {
      console.error('[updateInquiryStage] Failed to notify assignee:', notifyErr)
    }
  }

  // Notify DFY partner for key stage changes (sent, closed, lost)
  if (['sent', 'closed', 'lost'].includes(stage) && inquiry?.submitted_by && inquiry.submitted_by !== user?.id) {
    try {
      await createNotification({
        userId: inquiry.submitted_by,
        type: 'stage_changed',
        title: stage === 'closed' ? 'Deal Closed!' : stage === 'lost' ? 'Deal Lost' : 'Proposal Sent',
        message: `"${inquiry.prospect_company_name || 'Your deal'}" has been marked as ${stageLabels[stage] || stage}.`,
        actorId: user?.id,
      })
    } catch (notifyErr) {
      console.error('[updateInquiryStage] Failed to notify DFY partner:', notifyErr)
    }
  }
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
  const { data: { user } } = await supabase.auth.getUser()

  // Get inquiry details for notification
  const { data: inquiry } = await supabase
    .from('inquiries')
    .select('prospect_company_name')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('inquiries')
    .update({ assigned_to: assignedTo })
    .eq('id', id)

  if (error) throw error

  // Notify the newly assigned user
  if (assignedTo && assignedTo !== user?.id) {
    try {
      await createNotification({
        userId: assignedTo,
        type: 'assigned',
        title: 'Inquiry Assigned to You',
        message: `You've been assigned to "${inquiry?.prospect_company_name || 'an inquiry'}".`,
        actorId: user?.id,
      })
    } catch (notifyErr) {
      console.error('[assignInquiry] Failed to create notification:', notifyErr)
    }
  }
}

export async function updateInquiryPriceDfy(id: string, value: number | null) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('inquiries')
    .update({ price_dfy: value })
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
      proposal_content,
      proposal_submitted_at,
      price_dfy,
      price_hexona,
      price_dev,
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

// Update pricing (all price fields + notes)
export async function updateInquiryPricing(
  id: string,
  priceDfy: number | null,
  priceHexona: number | null,
  priceDev: number | null,
  pricingNotes: string | null
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('inquiries')
    .update({
      price_dfy: priceDfy,
      price_hexona: priceHexona,
      price_dev: priceDev,
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

  // Get current stage history and DFY partner info
  const { data: inquiry } = await supabase
    .from('inquiries')
    .select('proposal_stage, stage_history, submitted_by, prospect_company_name')
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

  // Notify the DFY partner that their proposal is ready
  if (inquiry?.submitted_by) {
    try {
      await createNotification({
        userId: inquiry.submitted_by,
        type: 'proposal_ready',
        title: 'Proposal Ready for Review',
        message: `The proposal for "${inquiry.prospect_company_name || 'your deal'}" is ready for your review.`,
        actorId: user.id,
      })
    } catch (notifyErr) {
      console.error('[submitProposalToDfy] Failed to create notification:', notifyErr)
    }
  }

  // Notify admins that a proposal has been sent to DFY
  try {
    await notifyAdmins({
      type: 'proposal_sent',
      title: 'Proposal Sent to DFY',
      message: `Proposal for "${inquiry?.prospect_company_name || 'Unknown'}" has been sent to DFY partner`,
      actorId: user.id,
    })
  } catch (notifyErr) {
    console.error('[submitProposalToDfy] Notification failed:', notifyErr)
  }
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
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('inquiries')
    .update({ deliverables_status: status })
    .eq('id', id)

  if (error) {
    console.error('[updateDeliverablesStatus] Error:', error)
    throw error
  }
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

  // Get current stage history
  const { data: inquiry } = await supabase
    .from('inquiries')
    .select('proposal_stage, stage_history, prospect_company_name')
    .eq('id', id)
    .single()

  const stageHistory = (inquiry?.stage_history as Array<unknown>) || []
  const historyEntry = {
    from: inquiry?.proposal_stage || 'sent',
    to: 'closed',
    changed_by: user.id,
    changed_at: new Date().toISOString(),
    notes: notes || 'Deal closed by DFY partner',
  }

  const { error } = await supabase
    .from('inquiries')
    .update({
      closed_at: new Date().toISOString(),
      closed_by: user.id,
      closed_notes: notes || null,
      client_email: clientEmail || null,
      proposal_stage: 'closed',
      stage_entered_at: new Date().toISOString(),
      stage_history: [...stageHistory, historyEntry],
    })
    .eq('id', id)

  if (error) throw error

  try {
    await notifyAdmins({
      type: 'inquiry_won',
      title: 'Inquiry Won',
      message: `"${inquiry?.prospect_company_name || 'Unknown'}" has been marked as won`,
      actorId: user.id,
    })
  } catch (notifyErr) {
    console.error('[markInquiryAsClosed] Notification failed:', notifyErr)
  }
}

// Undo mark as closed
export async function unmarkInquiryAsClosed(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Get current stage history
  const { data: inquiry } = await supabase
    .from('inquiries')
    .select('proposal_stage, stage_history')
    .eq('id', id)
    .single()

  const stageHistory = (inquiry?.stage_history as Array<unknown>) || []
  const historyEntry = {
    from: inquiry?.proposal_stage || 'closed',
    to: 'sent',
    changed_by: user.id,
    changed_at: new Date().toISOString(),
    notes: 'Closed status undone',
  }

  const { error } = await supabase
    .from('inquiries')
    .update({
      closed_at: null,
      closed_by: null,
      closed_notes: null,
      client_email: null,
      proposal_stage: 'sent',
      stage_entered_at: new Date().toISOString(),
      stage_history: [...stageHistory, historyEntry],
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
  price_dfy?: number
  notes?: string
  payment_structure?: '100_upfront' | '50_50' | '40_30_30' | 'custom'
  custom_milestones?: Array<{ label: string; percentage: number }>
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

  // Check if a project already exists for this inquiry (prevent duplicates)
  const { data: existingProject } = await supabase
    .from('projects')
    .select('id, project_name')
    .eq('source_inquiry_id', inquiryId)
    .maybeSingle()

  if (existingProject) {
    // Return existing project instead of creating duplicate
    return existingProject
  }

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
      price_dfy: projectData.price_dfy || null,
      notes: projectData.notes || null,
      payment_structure: projectData.payment_structure || '50_50',
      dfy_partner_id: inquiry.submitted_by,
      matched_blueprint_id: inquiry.blueprint_id,
      source_inquiry_id: inquiryId,
      status: 'deliverables_pending', // Start with sign-off flow
    })
    .select()
    .single()

  if (projectError) throw projectError

  try {
    // 1b. Create payment milestones based on structure
    const priceDfy = projectData.price_dfy || 0
    const paymentStructure = projectData.payment_structure || '50_50'

    let milestones: Array<{ label: string; amount: number; sort_order: number }> = []

    if (paymentStructure === '100_upfront') {
      milestones = [{ label: 'Full Payment', amount: priceDfy, sort_order: 0 }]
    } else if (paymentStructure === '50_50') {
      milestones = [
        { label: 'Deposit (50%)', amount: priceDfy * 0.5, sort_order: 0 },
        { label: 'Final Payment (50%)', amount: priceDfy * 0.5, sort_order: 1 },
      ]
    } else if (paymentStructure === '40_30_30') {
      milestones = [
        { label: 'Deposit (40%)', amount: priceDfy * 0.4, sort_order: 0 },
        { label: 'Midpoint (30%)', amount: priceDfy * 0.3, sort_order: 1 },
        { label: 'Final Payment (30%)', amount: priceDfy * 0.3, sort_order: 2 },
      ]
    } else if (paymentStructure === 'custom' && projectData.custom_milestones) {
      milestones = projectData.custom_milestones.map((m, i) => ({
        label: m.label,
        amount: priceDfy * (m.percentage / 100),
        sort_order: i,
      }))
    }

    if (milestones.length > 0) {
      const { error: milestoneError } = await supabase
        .from('payment_milestones')
        .insert(milestones.map(m => ({ ...m, project_id: project.id })))

      if (milestoneError) throw milestoneError
    }

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
          price: d.change_status === 'counter_accepted' ? (d.counter_price ?? d.price) : d.price,
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
  } catch (error) {
    // Rollback: delete the project we just created to avoid orphaned records
    await supabase.from('projects').delete().eq('id', project.id)
    throw error
  }

  return project
}

// Get inquiries by proposal stage (for sidebar hover drill-down)
export async function getInquiriesByStage(stage: string, limit = 5) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('inquiries')
    .select('id, prospect_company_name, form_data')
    .eq('proposal_stage', stage)
    .is('deleted_at', null)
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .limit(limit)
  return data || []
}

// Get counts of inquiries by proposal stage (for sidebar tooltip)
export async function getInquiryStatusCounts(): Promise<Record<ProposalStage, number>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inquiries')
    .select('proposal_stage')
    .is('deleted_at', null)
    .is('archived_at', null)

  if (error) {
    console.error('[getInquiryStatusCounts] Error:', error)
    return {
      unopened: 0,
      admin_reviewed: 0,
      in_queue: 0,
      working: 0,
      on_hold: 0,
      final_review: 0,
      ready: 0,
      sent: 0,
      closed: 0,
      lost: 0,
    }
  }

  const counts: Record<ProposalStage, number> = {
    unopened: 0,
    admin_reviewed: 0,
    in_queue: 0,
    working: 0,
    on_hold: 0,
    final_review: 0,
    ready: 0,
    sent: 0,
    closed: 0,
    lost: 0,
  }

  for (const inquiry of data || []) {
    const stage = (inquiry.proposal_stage || 'unopened') as ProposalStage
    counts[stage]++
  }

  return counts
}
