'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getPulseStats } from '@/lib/api/pulse'
import { getWeeklyReviewForWeek, upsertWeeklyReview } from '@/lib/api/pulse-reviews'

async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

function getLastWeekStart(): string {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const daysToLastMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const lastMonday = new Date(now)
  lastMonday.setDate(now.getDate() - daysToLastMonday - 7)
  return lastMonday.toISOString().split('T')[0]
}

export async function getWeeklyReviewAction() {
  const user = await getUser()
  if (!user) return null

  const lastWeekStart = getLastWeekStart()
  const existingReview = await getWeeklyReviewForWeek(user.id, lastWeekStart)

  if (existingReview) {
    return {
      tasksCompleted: existingReview.tasks_completed || 0,
      pointsEarned: existingReview.points_earned || 0,
      streakLength: existingReview.streak_length || 0,
      focusText: existingReview.focus_text || '',
      dismissed: !!existingReview.dismissed_at,
    }
  }

  // Calculate stats for last week
  const stats = await getPulseStats(user.id)

  return {
    tasksCompleted: 0,
    pointsEarned: stats.weekPoints,
    streakLength: stats.streak,
    focusText: '',
    dismissed: false,
  }
}

export async function saveWeeklyReviewAction(focusText: string) {
  const user = await getUser()
  if (!user) return

  const lastWeekStart = getLastWeekStart()
  await upsertWeeklyReview(user.id, lastWeekStart, {
    focus_text: focusText,
  })

  revalidatePath('/pulse')
}

export async function dismissWeeklyReviewAction() {
  const user = await getUser()
  if (!user) return

  const lastWeekStart = getLastWeekStart()
  await upsertWeeklyReview(user.id, lastWeekStart, {
    dismissed_at: new Date().toISOString(),
  })

  revalidatePath('/pulse')
}
