import { createClient } from '@/lib/supabase/server'

// Types
export type BidStatus = 'pending' | 'shortlisted' | 'accepted' | 'rejected' | 'withdrawn'

export interface DevOpportunityBid {
  id: string
  opportunity_id: string
  dev_id: string
  proposed_weeks: number
  proposed_price: number | null
  cover_message: string | null
  status: BidStatus
  reviewed_by: string | null
  reviewed_at: string | null
  review_notes: string | null
  created_at: string
  updated_at: string
  // Joined fields
  dev?: { id: string; name: string; email: string }
  opportunity?: { id: string; title: string }
}

// ============================================================================
// BID OPERATIONS
// ============================================================================

/**
 * Submit a bid on an opportunity (dev action)
 */
export async function submitBid(params: {
  opportunityId: string
  proposedWeeks: number
  proposedPrice?: number
  coverMessage?: string
}): Promise<DevOpportunityBid> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('dev_opportunity_bids')
    .insert({
      opportunity_id: params.opportunityId,
      dev_id: user.id,
      proposed_weeks: params.proposedWeeks,
      proposed_price: params.proposedPrice || null,
      cover_message: params.coverMessage || null,
    })
    .select()
    .single()

  if (error) throw error
  return data as DevOpportunityBid
}

/**
 * Withdraw a bid (dev action - sets status to 'withdrawn')
 */
export async function withdrawBid(bidId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('dev_opportunity_bids')
    .update({
      status: 'withdrawn',
      updated_at: new Date().toISOString(),
    })
    .eq('id', bidId)
    .eq('dev_id', user.id) // Ensure dev can only withdraw their own bids

  if (error) throw error
}

/**
 * Get current dev's bids with opportunity join
 */
export async function getMyBids(): Promise<DevOpportunityBid[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const { data, error } = await supabase
    .from('dev_opportunity_bids')
    .select(`
      *,
      opportunity:project_opportunities(id, title)
    `)
    .eq('dev_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map(normalizeBidRelations)
}

/**
 * Get all bids for an opportunity with dev join (admin action)
 */
export async function getBidsForOpportunity(opportunityId: string): Promise<DevOpportunityBid[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('dev_opportunity_bids')
    .select(`
      *,
      dev:profiles(id, name, email)
    `)
    .eq('opportunity_id', opportunityId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map(normalizeBidRelations)
}

/**
 * Update bid status (admin action)
 */
export async function updateBidStatus(
  bidId: string,
  status: BidStatus,
  notes?: string
): Promise<DevOpportunityBid> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('dev_opportunity_bids')
    .update({
      status,
      review_notes: notes || null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', bidId)
    .select()
    .single()

  if (error) throw error
  return data as DevOpportunityBid
}

/**
 * Get count of active bids for an opportunity
 */
export async function getBidCount(opportunityId: string): Promise<number> {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from('dev_opportunity_bids')
    .select('*', { count: 'exact', head: true })
    .eq('opportunity_id', opportunityId)
    .in('status', ['pending', 'shortlisted']) // Only active bids

  if (error) throw error
  return count || 0
}

// ============================================================================
// HELPERS
// ============================================================================

function normalizeBidRelations(bid: Record<string, unknown>): DevOpportunityBid {
  const dev = Array.isArray(bid.dev) ? bid.dev[0] : bid.dev
  const opportunity = Array.isArray(bid.opportunity) ? bid.opportunity[0] : bid.opportunity

  return { ...bid, dev, opportunity } as DevOpportunityBid
}
