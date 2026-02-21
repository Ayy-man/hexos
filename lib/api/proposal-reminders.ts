import { createClient } from '@/lib/supabase/server'
import { notifyAdmins } from './notification-helpers'

// Constants
export const REMINDER_DAYS = 21 // 3 weeks
export const SECONDARY_REMINDER_DAYS = 35 // 5 weeks
export const ESCALATION_DAYS = 49 // 7 weeks
export const SNOOZE_DAYS = 14 // 2 weeks per snooze
export const MAX_SNOOZES = 3

// Types
export interface StaleProposal {
  id: string
  prospect_company_name: string | null
  proposal_submitted_at: string
  days_since_sent: number
  reminder_snooze_count: number
  reminder_snoozed_until: string | null
  reminder_escalated_at: string | null
  admin_update_requested_at: string | null
  dfy_partner: {
    id: string
    name: string | null
    email: string
  } | null
  price_dfy: number | null
  blueprint: {
    name: string
  } | null
}

// Type for bundled proposals grouped by DFY partner
export interface BundledProposalRequest {
  dfyPartnerId: string
  dfyPartnerName: string | null
  dfyPartnerEmail: string
  proposals: StaleProposal[]
}

/**
 * Get stale proposals for a specific DFY partner
 * Stale = sent > REMINDER_DAYS ago AND (not snoozed OR snooze expired)
 */
export async function getStaleProposalsForDfy(dfyId: string): Promise<StaleProposal[]> {
  const supabase = await createClient()
  const now = new Date()
  const cutoff = new Date(now.getTime() - REMINDER_DAYS * 24 * 60 * 60 * 1000)

  const { data, error } = await supabase
    .from('inquiries')
    .select(`
      id,
      prospect_company_name,
      proposal_submitted_at,
      reminder_snooze_count,
      reminder_snoozed_until,
      reminder_escalated_at,
      admin_update_requested_at,
      price_dfy,
      blueprint:blueprints(name),
      dfy_partner:profiles!submitted_by(id, name, email)
    `)
    .eq('proposal_stage', 'sent')
    .eq('submitted_by', dfyId)
    .lt('proposal_submitted_at', cutoff.toISOString())
    .or(`reminder_snoozed_until.is.null,reminder_snoozed_until.lt.${now.toISOString()}`)
    .is('deleted_at', null)
    .is('archived_at', null)
    .order('proposal_submitted_at', { ascending: true })

  if (error) throw error

  // Calculate days since sent and normalize relations for each proposal
  return (data || []).map((proposal) => {
    // Supabase returns arrays for relations, extract first element
    const dfyPartner = Array.isArray(proposal.dfy_partner)
      ? proposal.dfy_partner[0] || null
      : proposal.dfy_partner
    const blueprint = Array.isArray(proposal.blueprint)
      ? proposal.blueprint[0] || null
      : proposal.blueprint

    return {
      id: proposal.id,
      prospect_company_name: proposal.prospect_company_name,
      proposal_submitted_at: proposal.proposal_submitted_at,
      reminder_snooze_count: proposal.reminder_snooze_count || 0,
      reminder_snoozed_until: proposal.reminder_snoozed_until,
      reminder_escalated_at: proposal.reminder_escalated_at,
      admin_update_requested_at: proposal.admin_update_requested_at,
      price_dfy: proposal.price_dfy,
      dfy_partner: dfyPartner,
      blueprint: blueprint,
      days_since_sent: proposal.proposal_submitted_at
        ? Math.floor(
            (now.getTime() - new Date(proposal.proposal_submitted_at).getTime()) /
              (24 * 60 * 60 * 1000)
          )
        : 0,
    }
  }) as StaleProposal[]
}

/**
 * Get all stale proposals (admin view)
 */
export async function getAllStaleProposals(): Promise<StaleProposal[]> {
  const supabase = await createClient()
  const now = new Date()
  const cutoff = new Date(now.getTime() - REMINDER_DAYS * 24 * 60 * 60 * 1000)

  const { data, error } = await supabase
    .from('inquiries')
    .select(`
      id,
      prospect_company_name,
      proposal_submitted_at,
      reminder_snooze_count,
      reminder_snoozed_until,
      reminder_escalated_at,
      admin_update_requested_at,
      price_dfy,
      blueprint:blueprints(name),
      dfy_partner:profiles!submitted_by(id, name, email)
    `)
    .eq('proposal_stage', 'sent')
    .lt('proposal_submitted_at', cutoff.toISOString())
    .or(`reminder_snoozed_until.is.null,reminder_snoozed_until.lt.${now.toISOString()}`)
    .is('deleted_at', null)
    .is('archived_at', null)
    .order('proposal_submitted_at', { ascending: true })

  if (error) throw error

  // Calculate days since sent and normalize relations for each proposal
  return (data || []).map((proposal) => {
    const dfyPartner = Array.isArray(proposal.dfy_partner)
      ? proposal.dfy_partner[0] || null
      : proposal.dfy_partner
    const blueprint = Array.isArray(proposal.blueprint)
      ? proposal.blueprint[0] || null
      : proposal.blueprint

    return {
      id: proposal.id,
      prospect_company_name: proposal.prospect_company_name,
      proposal_submitted_at: proposal.proposal_submitted_at,
      reminder_snooze_count: proposal.reminder_snooze_count || 0,
      reminder_snoozed_until: proposal.reminder_snoozed_until,
      reminder_escalated_at: proposal.reminder_escalated_at,
      admin_update_requested_at: proposal.admin_update_requested_at,
      price_dfy: proposal.price_dfy,
      dfy_partner: dfyPartner,
      blueprint: blueprint,
      days_since_sent: proposal.proposal_submitted_at
        ? Math.floor(
            (now.getTime() - new Date(proposal.proposal_submitted_at).getTime()) /
              (24 * 60 * 60 * 1000)
          )
        : 0,
    }
  }) as StaleProposal[]
}

/**
 * Get escalated proposals (admin attention needed)
 */
export async function getEscalatedProposals(): Promise<StaleProposal[]> {
  const supabase = await createClient()
  const now = new Date()

  const { data, error } = await supabase
    .from('inquiries')
    .select(`
      id,
      prospect_company_name,
      proposal_submitted_at,
      reminder_snooze_count,
      reminder_snoozed_until,
      reminder_escalated_at,
      admin_update_requested_at,
      price_dfy,
      blueprint:blueprints(name),
      dfy_partner:profiles!submitted_by(id, name, email)
    `)
    .eq('proposal_stage', 'sent')
    .not('reminder_escalated_at', 'is', null)
    .is('deleted_at', null)
    .is('archived_at', null)
    .order('reminder_escalated_at', { ascending: true })

  if (error) throw error

  // Calculate days since sent and normalize relations for each proposal
  return (data || []).map((proposal) => {
    const dfyPartner = Array.isArray(proposal.dfy_partner)
      ? proposal.dfy_partner[0] || null
      : proposal.dfy_partner
    const blueprint = Array.isArray(proposal.blueprint)
      ? proposal.blueprint[0] || null
      : proposal.blueprint

    return {
      id: proposal.id,
      prospect_company_name: proposal.prospect_company_name,
      proposal_submitted_at: proposal.proposal_submitted_at,
      reminder_snooze_count: proposal.reminder_snooze_count || 0,
      reminder_snoozed_until: proposal.reminder_snoozed_until,
      reminder_escalated_at: proposal.reminder_escalated_at,
      admin_update_requested_at: proposal.admin_update_requested_at,
      price_dfy: proposal.price_dfy,
      dfy_partner: dfyPartner,
      blueprint: blueprint,
      days_since_sent: proposal.proposal_submitted_at
        ? Math.floor(
            (now.getTime() - new Date(proposal.proposal_submitted_at).getTime()) /
              (24 * 60 * 60 * 1000)
          )
        : 0,
    }
  }) as StaleProposal[]
}

/**
 * Snooze reminder for SNOOZE_DAYS
 * Returns false if max snoozes reached
 */
export async function snoozeReminder(inquiryId: string): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient()

  // First check current snooze count
  const { data: inquiry, error: fetchError } = await supabase
    .from('inquiries')
    .select('reminder_snooze_count')
    .eq('id', inquiryId)
    .single()

  if (fetchError) throw fetchError

  const currentCount = inquiry?.reminder_snooze_count || 0

  if (currentCount >= MAX_SNOOZES) {
    // Auto-escalate instead of snoozing
    await escalateToAdmin(inquiryId)
    return {
      success: false,
      message: `Maximum snoozes (${MAX_SNOOZES}) reached. This has been escalated to admin.`,
    }
  }

  const snoozeUntil = new Date()
  snoozeUntil.setDate(snoozeUntil.getDate() + SNOOZE_DAYS)

  const { error } = await supabase
    .from('inquiries')
    .update({
      reminder_snoozed_until: snoozeUntil.toISOString(),
      reminder_snooze_count: currentCount + 1,
    })
    .eq('id', inquiryId)

  if (error) throw error

  const remaining = MAX_SNOOZES - (currentCount + 1)
  return {
    success: true,
    message: remaining > 0
      ? `Reminder snoozed for 2 weeks. ${remaining} snooze${remaining !== 1 ? 's' : ''} remaining.`
      : 'Reminder snoozed. This is your last snooze - next time it will escalate to admin.',
  }
}

/**
 * Mark proposal as lost with optional reason
 */
export async function markProposalLost(inquiryId: string, reason?: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Get current inquiry for stage history
  const { data: inquiry, error: fetchError } = await supabase
    .from('inquiries')
    .select('stage_history, proposal_stage, prospect_company_name')
    .eq('id', inquiryId)
    .single()

  if (fetchError) throw fetchError

  // Build updated stage history
  const stageHistory = (inquiry?.stage_history as Array<Record<string, unknown>>) || []
  stageHistory.push({
    from: inquiry?.proposal_stage,
    to: 'lost',
    changed_by: user?.id,
    changed_at: new Date().toISOString(),
    notes: reason || 'Marked as lost via reminder',
  })

  const { error } = await supabase
    .from('inquiries')
    .update({
      proposal_stage: 'lost',
      lost_reason: reason || null,
      stage_history: stageHistory,
      stage_entered_at: new Date().toISOString(),
      // Clear reminder state
      reminder_snoozed_until: null,
      reminder_escalated_at: null,
    })
    .eq('id', inquiryId)

  if (error) throw error

  try {
    await notifyAdmins({
      type: 'inquiry_lost',
      title: 'Proposal Lost',
      message: `"${inquiry?.prospect_company_name || 'Unknown'}" has been marked as lost. Reason: ${reason || 'Not specified'}`,
      actorId: user?.id,
    })
  } catch (notifyErr) {
    console.error('[markProposalLost] Notification failed:', notifyErr)
  }
}

/**
 * Escalate proposal to admin attention
 */
export async function escalateToAdmin(inquiryId: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Fetch inquiry details for notification message
  const { data: inquiry } = await supabase
    .from('inquiries')
    .select('prospect_company_name')
    .eq('id', inquiryId)
    .single()

  const { error } = await supabase
    .from('inquiries')
    .update({
      reminder_escalated_at: new Date().toISOString(),
      reminder_snoozed_until: null, // Clear snooze
    })
    .eq('id', inquiryId)

  if (error) throw error

  try {
    await notifyAdmins({
      type: 'escalation_admin',
      title: 'DFY Needs Admin Help',
      message: `DFY partner has requested admin assistance for "${inquiry?.prospect_company_name || 'Unknown'}"`,
      actorId: user?.id,
    })
  } catch (notifyErr) {
    console.error('[escalateToAdmin] Notification failed:', notifyErr)
  }
}

/**
 * Track when DFY first views a sent proposal
 */
export async function trackDfyProposalView(inquiryId: string): Promise<void> {
  const supabase = await createClient()

  // Only set if not already set
  const { error } = await supabase
    .from('inquiries')
    .update({
      dfy_first_viewed_at: new Date().toISOString(),
    })
    .eq('id', inquiryId)
    .is('dfy_first_viewed_at', null)

  if (error) throw error
}

/**
 * Clear escalation (admin handled it)
 */
export async function clearEscalation(inquiryId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('inquiries')
    .update({
      reminder_escalated_at: null,
    })
    .eq('id', inquiryId)

  if (error) throw error
}

/**
 * Get count of stale proposals for a DFY partner (for badges)
 */
export async function getStaleProposalCount(dfyId: string): Promise<number> {
  const supabase = await createClient()
  const now = new Date()
  const cutoff = new Date(now.getTime() - REMINDER_DAYS * 24 * 60 * 60 * 1000)

  const { count, error } = await supabase
    .from('inquiries')
    .select('*', { count: 'exact', head: true })
    .eq('proposal_stage', 'sent')
    .eq('submitted_by', dfyId)
    .lt('proposal_submitted_at', cutoff.toISOString())
    .or(`reminder_snoozed_until.is.null,reminder_snoozed_until.lt.${now.toISOString()}`)
    .is('deleted_at', null)
    .is('archived_at', null)

  if (error) throw error
  return count || 0
}

/**
 * Admin: Request status updates for multiple proposals
 * Marks them with admin_update_requested_at timestamp
 */
export async function requestProposalUpdates(inquiryIds: string[]): Promise<{ success: boolean; count: number }> {
  const supabase = await createClient()

  const { error, count } = await supabase
    .from('inquiries')
    .update({
      admin_update_requested_at: new Date().toISOString(),
    })
    .in('id', inquiryIds)

  if (error) throw error
  return { success: true, count: count || inquiryIds.length }
}

/**
 * Bundle stale proposals by DFY partner for grouped notifications
 */
export function bundleProposalsByDfy(proposals: StaleProposal[]): BundledProposalRequest[] {
  const bundles = new Map<string, BundledProposalRequest>()

  for (const proposal of proposals) {
    if (!proposal.dfy_partner) continue

    const dfyId = proposal.dfy_partner.id
    if (!bundles.has(dfyId)) {
      bundles.set(dfyId, {
        dfyPartnerId: dfyId,
        dfyPartnerName: proposal.dfy_partner.name,
        dfyPartnerEmail: proposal.dfy_partner.email,
        proposals: [],
      })
    }
    bundles.get(dfyId)!.proposals.push(proposal)
  }

  return Array.from(bundles.values())
}

/**
 * Admin: Get all sent proposals (regardless of staleness) for manual selection
 */
export async function getAllSentProposals(): Promise<StaleProposal[]> {
  const supabase = await createClient()
  const now = new Date()

  const { data, error } = await supabase
    .from('inquiries')
    .select(`
      id,
      prospect_company_name,
      proposal_submitted_at,
      reminder_snooze_count,
      reminder_snoozed_until,
      reminder_escalated_at,
      admin_update_requested_at,
      price_dfy,
      blueprint:blueprints(name),
      dfy_partner:profiles!submitted_by(id, name, email)
    `)
    .eq('proposal_stage', 'sent')
    .is('deleted_at', null)
    .is('archived_at', null)
    .order('proposal_submitted_at', { ascending: false })

  if (error) throw error

  return (data || []).map((proposal) => {
    const dfyPartner = Array.isArray(proposal.dfy_partner)
      ? proposal.dfy_partner[0] || null
      : proposal.dfy_partner
    const blueprint = Array.isArray(proposal.blueprint)
      ? proposal.blueprint[0] || null
      : proposal.blueprint

    return {
      id: proposal.id,
      prospect_company_name: proposal.prospect_company_name,
      proposal_submitted_at: proposal.proposal_submitted_at,
      reminder_snooze_count: proposal.reminder_snooze_count || 0,
      reminder_snoozed_until: proposal.reminder_snoozed_until,
      reminder_escalated_at: proposal.reminder_escalated_at,
      admin_update_requested_at: proposal.admin_update_requested_at,
      price_dfy: proposal.price_dfy,
      dfy_partner: dfyPartner,
      blueprint: blueprint,
      days_since_sent: proposal.proposal_submitted_at
        ? Math.floor(
            (now.getTime() - new Date(proposal.proposal_submitted_at).getTime()) /
              (24 * 60 * 60 * 1000)
          )
        : 0,
    }
  }) as StaleProposal[]
}
