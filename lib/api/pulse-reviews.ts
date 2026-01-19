import { createClient } from '@/lib/supabase/server'
import type { PulseWeeklyReview } from '@/lib/types/pulse'

export async function getWeeklyReviewForWeek(
  userId: string,
  weekStart: string
): Promise<PulseWeeklyReview | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pulse_weekly_reviews')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('[Pulse] Failed to fetch weekly review:', error)
    return null
  }

  return data as PulseWeeklyReview | null
}

export async function upsertWeeklyReview(
  userId: string,
  weekStart: string,
  data: {
    tasks_completed?: number
    points_earned?: number
    streak_length?: number
    focus_text?: string
    dismissed_at?: string | null
  }
): Promise<PulseWeeklyReview | null> {
  const supabase = await createClient()

  const { data: result, error } = await supabase
    .from('pulse_weekly_reviews')
    .upsert({
      user_id: userId,
      week_start: weekStart,
      ...data,
    })
    .select()
    .single()

  if (error) {
    console.error('[Pulse] Failed to upsert weekly review:', error)
    return null
  }

  return result as PulseWeeklyReview
}
