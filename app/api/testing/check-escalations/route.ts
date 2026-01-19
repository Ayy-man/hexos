import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')

  if (authHeader !== 'Bearer ' + (process.env.CRON_SECRET || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data: staleTests, error } = await supabase
    .from('deliverable_tests')
    .select('id, deliverable_id, started_at, deliverables(title)')
    .eq('stage', 'client')
    .eq('status', 'in_progress')
    .lt('started_at', sevenDaysAgo.toISOString())

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!staleTests || staleTests.length === 0) {
    return NextResponse.json({ escalated: 0, eligibleForEscalation: 0 })
  }

  await Promise.all(
    (staleTests as any[]).map(test =>
      supabase
        .from('deliverable_tests')
        .update({
          notes: '[ELIGIBLE FOR ESCALATION] Started ' + new Date(test.started_at).toLocaleDateString(),
        })
        .eq('id', test.id)
    )
  )

  return NextResponse.json({
    escalated: 0,
    eligibleForEscalation: staleTests.length,
    tests: (staleTests as any[]).map(t => ({
      testId: t.id,
      deliverableId: t.deliverable_id,
      startedAt: t.started_at,
    })),
  })
}
