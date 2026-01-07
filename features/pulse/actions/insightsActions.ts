'use server'

import { createClient } from '@/lib/supabase/server'
import { getInsights } from '@/lib/api/pulse-insights'

export async function getInsightsData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  return getInsights(user.id)
}
