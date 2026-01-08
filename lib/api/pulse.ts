import { createClient } from '@/lib/supabase/server'
import type { PulseEvent, PulseEventType, PulseSourceType, PulseStats, DailyPointsMap, PulseSettings } from '@/lib/types/pulse'
import { PULSE_POINTS } from '@/lib/types/pulse'



// ============================================================================
// Core Logging Function
// ============================================================================

export async function logPulseEvent(
  userId: string,
  eventType: PulseEventType,
  sourceType: PulseSourceType,
  sourceId?: string
): Promise<PulseEvent | null> {
  const supabase = await createClient()
  const points = PULSE_POINTS[eventType]

  const { data, error } = await supabase
    .from('pulse_events')
    .insert({
      user_id: userId,
      event_type: eventType,
      points,
      source_type: sourceType,
      source_id: sourceId || null,
    })
    .select()
    .single()

  if (error) {
    console.error('[Pulse] Failed to log event:', error)
    return null
  }

  return data as PulseEvent
}

// ============================================================================
// Stats Fetching
// ============================================================================

export async function getPulseStats(userId: string): Promise<PulseStats> {
  const supabase = await createClient()
  const now = new Date()
  const today = now.toISOString().split('T')[0]

  // Get start of week (Monday)
  const dayOfWeek = now.getDay()
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - daysToMonday)
  weekStart.setHours(0, 0, 0, 0)

  // Get 30 days ago for average calculation
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(now.getDate() - 30)

  // Fetch all events from the last 30 days in one query
  const { data: events, error } = await supabase
    .from('pulse_events')
    .select('points, created_at')
    .eq('user_id', userId)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[Pulse] Failed to fetch stats:', error)
    return {
      streak: 0,
      todayPoints: 0,
      weekPoints: 0,
      averageDaily: 0,
      longestStreak: 0,
    }
  }

  // Calculate points by day
  const dailyPoints: DailyPointsMap = {}
  let todayPoints = 0
  let weekPoints = 0

  for (const event of events || []) {
    const eventDate = event.created_at.split('T')[0]
    dailyPoints[eventDate] = (dailyPoints[eventDate] || 0) + event.points

    if (eventDate === today) {
      todayPoints += event.points
    }

    const eventTime = new Date(event.created_at)
    if (eventTime >= weekStart) {
      weekPoints += event.points
    }
  }

  // Get user's min pulse setting
  const { data: settings } = await supabase
    .from('pulse_settings')
    .select('min_daily_pulse')
    .eq('user_id', userId)
    .single()

  const minPulse = settings?.min_daily_pulse || 10

  // Calculate streak
  const streak = calculateStreak(dailyPoints, minPulse)

  // Calculate average (excluding today)
  const daysWithPoints = Object.keys(dailyPoints).filter(d => d !== today).length
  const totalPointsExcludingToday = Object.entries(dailyPoints)
    .filter(([date]) => date !== today)
    .reduce((sum, [, pts]) => sum + pts, 0)
  const averageDaily = daysWithPoints > 0
    ? Math.round(totalPointsExcludingToday / daysWithPoints)
    : 0

  // Get longest streak from all time (simplified - would need more data for accuracy)
  const longestStreak = streak // For now, use current streak

  return {
    streak,
    todayPoints,
    weekPoints,
    averageDaily,
    longestStreak,
  }
}

// ============================================================================
// Streak Calculation
// ============================================================================

function calculateStreak(dailyPoints: DailyPointsMap, minPulse: number): number {
  const now = new Date()
  let streak = 0

  // Start from yesterday (today is still in progress)
  const checkDate = new Date(now)
  checkDate.setDate(now.getDate() - 1)
  checkDate.setHours(0, 0, 0, 0)

  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0]
    const points = dailyPoints[dateStr] || 0
    const dayOfWeek = checkDate.getDay() // 0 = Sunday

    if (dayOfWeek === 0) {
      // Sunday is optional
      // If they worked, count it; if not, skip but don't break streak
      if (points > 0) {
        streak++
      }
      // Either way, continue checking previous day
    } else {
      // Mon-Sat: must meet minimum
      if (points >= minPulse) {
        streak++
      } else {
        // Streak broken
        break
      }
    }

    // Move to previous day
    checkDate.setDate(checkDate.getDate() - 1)

    // Safety limit - don't check more than 365 days
    if (streak > 365) break
  }

  return streak
}

// ============================================================================
// Heatmap Data
// ============================================================================

export async function getHeatmapData(
  userId: string,
  weeks: number = 12
): Promise<DailyPointsMap> {
  const supabase = await createClient()
  const now = new Date()

  // Calculate start date (weeks * 7 days ago, aligned to Monday)
  const startDate = new Date(now)
  const daysBack = weeks * 7
  startDate.setDate(now.getDate() - daysBack)

  // Align to Monday
  const dayOfWeek = startDate.getDay()
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  startDate.setDate(startDate.getDate() - daysToMonday)
  startDate.setHours(0, 0, 0, 0)

  const { data: events, error } = await supabase
    .from('pulse_events')
    .select('points, created_at')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[Pulse] Failed to fetch heatmap data:', error)
    return {}
  }

  const dailyPoints: DailyPointsMap = {}

  for (const event of events || []) {
    const dateStr = event.created_at.split('T')[0]
    dailyPoints[dateStr] = (dailyPoints[dateStr] || 0) + event.points
  }

  return dailyPoints
}

// ============================================================================
// Settings
// ============================================================================

export async function getPulseSettings(userId: string): Promise<PulseSettings | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pulse_settings')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('[Pulse] Failed to fetch settings:', error)
    return null
  }

  // Return default if no settings exist
  if (!data) {
    return {
      user_id: userId,
      min_daily_pulse: 10,
      updated_at: new Date().toISOString(),
    }
  }

  return data as PulseSettings
}

export async function updatePulseSettings(
  userId: string,
  minDailyPulse: number
): Promise<PulseSettings | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pulse_settings')
    .upsert({
      user_id: userId,
      min_daily_pulse: minDailyPulse,
    })
    .select()
    .single()

  if (error) {
    console.error('[Pulse] Failed to update settings:', error)
    return null
  }

  return data as PulseSettings
}

// ============================================================================
// Quick Stats (for sidebar badge)
// ============================================================================

export async function getStreak(userId: string): Promise<number> {
  const stats = await getPulseStats(userId)
  return stats.streak
}

export async function getLifetimePoints(userId: string): Promise<number> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pulse_events')
    .select('points')
    .eq('user_id', userId)

  if (error) {
    console.error('[Pulse] Failed to fetch lifetime points:', error)
    return 0
  }

  return (data || []).reduce((sum, event) => sum + event.points, 0)
}
