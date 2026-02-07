// Types for bids that can be imported by client components
// This file intentionally does NOT import from lib/supabase/server to avoid server-only dependencies

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
