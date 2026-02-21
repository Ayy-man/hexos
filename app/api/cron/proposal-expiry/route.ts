import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/admin'

// Threshold for stale proposal detection
const STALE_DAYS = 14 // Proposals pending for 14+ days are considered stale

// Deduplication window: do not re-notify within 7 days (weekly reminder)
const DEDUP_DAYS = 7

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')

  if (authHeader !== `Bearer ${process.env.CRON_SECRET || ''}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient()

  const now = new Date()
  const staleCutoff = new Date(now.getTime() - STALE_DAYS * 24 * 60 * 60 * 1000)
  const dedupCutoff = new Date(now.getTime() - DEDUP_DAYS * 24 * 60 * 60 * 1000).toISOString()

  // Find stale proposals: stage='sent', sent more than STALE_DAYS ago, not deleted/archived
  const { data: staleProposals, error: proposalsError } = await supabase
    .from('inquiries')
    .select('id, prospect_company_name, proposal_submitted_at, submitted_by')
    .eq('proposal_stage', 'sent')
    .lt('proposal_submitted_at', staleCutoff.toISOString())
    .is('deleted_at', null)
    .is('archived_at', null)

  if (proposalsError) {
    console.error('[proposal-expiry] Failed to fetch stale proposals:', proposalsError)
    return NextResponse.json({ error: proposalsError.message }, { status: 500 })
  }

  if (!staleProposals || staleProposals.length === 0) {
    return NextResponse.json({ processed: 0, notified: 0 })
  }

  // Fetch admin and internal user IDs
  const { data: admins, error: adminsError } = await supabase
    .from('profiles')
    .select('id')
    .in('role', ['admin', 'internal'])

  if (adminsError) {
    console.error('[proposal-expiry] Failed to fetch admins:', adminsError)
    return NextResponse.json({ error: adminsError.message }, { status: 500 })
  }

  const adminIds = (admins ?? []).map((a) => a.id)

  let processed = 0
  let notifiedCount = 0

  for (const inquiry of staleProposals) {
    processed++

    const companyName = inquiry.prospect_company_name ?? 'Unknown'

    // Deduplication: check if we already sent a stale proposal notification for this inquiry
    // We use the company name in the message as a proxy since notifications has no inquiry_id FK
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('type', 'proposal_ready')
      .like('message', `%${companyName}%`)
      .gte('created_at', dedupCutoff)
      .limit(1)

    if (existing && existing.length > 0) {
      // Already notified for this inquiry in the dedup window
      continue
    }

    const daysSince = Math.floor(
      (now.getTime() - new Date(inquiry.proposal_submitted_at).getTime()) / (24 * 60 * 60 * 1000)
    )

    // Build deduplicated recipient set: DFY partner (submitted_by) + admins
    const recipientSet = new Set<string>()

    const dfyPartnerId = inquiry.submitted_by
    if (dfyPartnerId) {
      recipientSet.add(dfyPartnerId)
    }

    for (const adminId of adminIds) {
      recipientSet.add(adminId)
    }

    const inserts = Array.from(recipientSet).map((userId) => {
      const isDfy = userId === dfyPartnerId
      return {
        user_id: userId,
        type: 'proposal_ready',
        title: isDfy ? 'Proposal Follow-up Needed' : 'Stale Proposal Alert',
        message: isDfy
          ? `Proposal for "${companyName}" has been pending for ${daysSince} days. Consider following up with the prospect.`
          : `Proposal for "${companyName}" pending for ${daysSince} days — may need admin attention.`,
      }
    })

    if (inserts.length > 0) {
      const { error: insertError } = await supabase.from('notifications').insert(inserts)

      if (insertError) {
        console.error(
          `[proposal-expiry] Failed to insert notifications for inquiry ${inquiry.id}:`,
          insertError
        )
      } else {
        notifiedCount += inserts.length
      }
    }
  }

  return NextResponse.json({
    processed,
    notified: notifiedCount,
  })
}
