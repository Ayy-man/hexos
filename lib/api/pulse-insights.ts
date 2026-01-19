import { createClient } from '@/lib/supabase/server'
import type { PulseInsights, DailyPointsMap } from '@/lib/types/pulse'
import { startOfWeek, subWeeks, format } from 'date-fns'

export async function getInsights(userId: string): Promise<PulseInsights | null> {
  const supabase = await createClient()
  const now = new Date()

  // Fetch all events for this year
  const yearStart = new Date(now.getFullYear(), 0, 1)

  const { data: events, error } = await supabase
    .from('pulse_events')
    .select('points, created_at')
    .eq('user_id', userId)
    .gte('created_at', yearStart.toISOString())
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[Pulse] Failed to fetch insights:', error)
    return null
  }

  // Fetch tasks for completion analysis
  const { data: tasks } = await supabase
    .from('pulse_daily_tasks')
    .select('date, completed_at, times_rolled, is_focus')
    .eq('user_id', userId)
    .gte('date', yearStart.toISOString().split('T')[0])

  // Calculate daily points
  const dailyPoints: DailyPointsMap = {}
  for (const event of events || []) {
    const dateStr = event.created_at.split('T')[0]
    dailyPoints[dateStr] = (dailyPoints[dateStr] || 0) + event.points
  }

  // Calculate streaks
  const { currentStreak, longestStreak, streaksThisYear, avgStreakLength, streakBreaks, breakDays } =
    calculateStreakStats(dailyPoints, 10)

  // Find most common break day
  const dayCount: Record<string, number> = {}
  for (const day of breakDays) {
    const dayName = format(new Date(day), 'EEEE')
    dayCount[dayName] = (dayCount[dayName] || 0) + 1
  }
  const mostCommonBreakDay = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null

  // Calculate personal records
  const bestDay = findBestDay(dailyPoints)
  const bestWeek = findBestWeek(dailyPoints)
  const bestMonth = findBestMonth(dailyPoints)

  // Calculate task completion breakdown
  const taskStats = calculateTaskStats(tasks || [])

  // This week vs last week
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 })
  const lastWeekStart = subWeeks(thisWeekStart, 1)

  const thisWeekPoints = Object.entries(dailyPoints)
    .filter(([date]) => new Date(date) >= thisWeekStart)
    .reduce((sum, [, pts]) => sum + pts, 0)

  const lastWeekPoints = Object.entries(dailyPoints)
    .filter(([date]) => {
      const d = new Date(date)
      return d >= lastWeekStart && d < thisWeekStart
    })
    .reduce((sum, [, pts]) => sum + pts, 0)

  const weekPointsDelta = lastWeekPoints > 0
    ? Math.round(((thisWeekPoints - lastWeekPoints) / lastWeekPoints) * 100)
    : 0

  const thisWeekTasks = (tasks || []).filter(t => new Date(t.date) >= thisWeekStart).length
  const lastWeekTasks = (tasks || []).filter(t => {
    const d = new Date(t.date)
    return d >= lastWeekStart && d < thisWeekStart
  }).length

  return {
    currentStreak,
    longestStreak,
    streaksThisYear,
    averageStreakLength: avgStreakLength,
    streakBreaks,
    mostCommonBreakDay,
    bestDay,
    bestWeek,
    bestMonth,
    ...taskStats,
    weekPoints: thisWeekPoints,
    weekPointsDelta,
    weekTasks: thisWeekTasks,
    weekTasksDelta: thisWeekTasks - lastWeekTasks,
    focusHitRate: taskStats.focusHitRate,
    topProject: null, // Would require project tagging
  }
}

function calculateStreakStats(dailyPoints: DailyPointsMap, minPulse: number) {
  const dates = Object.keys(dailyPoints).sort()
  const breakDays: string[] = []

  if (dates.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      streaksThisYear: 0,
      avgStreakLength: 0,
      streakBreaks: 0,
      breakDays,
    }
  }

  let currentStreak = 0
  let longestStreak = 0
  let tempStreak = 0
  let streaksThisYear = 0
  let totalStreakDays = 0

  // Check each day from the first event to today
  const startDate = new Date(dates[0])
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let prevDate: Date | null = null

  for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    const dayOfWeek = d.getDay()
    const points = dailyPoints[dateStr] || 0
    const metGoal = points >= minPulse
    const isSunday = dayOfWeek === 0

    // Sunday is optional - doesn't break streak but counts if worked
    if (isSunday) {
      if (metGoal) {
        tempStreak++
        totalStreakDays++
      }
      // Sunday doesn't break streak regardless
    } else if (metGoal) {
      tempStreak++
      totalStreakDays++
    } else {
      // Missed a non-Sunday - streak breaks
      if (tempStreak > 0) {
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak
        }
        streaksThisYear++
        breakDays.push(dateStr)
      }
      tempStreak = 0
    }

    prevDate = new Date(d)
  }

  // Current streak is the temp streak if it's still going
  currentStreak = tempStreak
  if (tempStreak > longestStreak) {
    longestStreak = tempStreak
  }
  if (tempStreak > 0) {
    streaksThisYear++ // Count current streak
  }

  const avgStreakLength = streaksThisYear > 0 ? Math.round(totalStreakDays / streaksThisYear) : 0

  return {
    currentStreak,
    longestStreak,
    streaksThisYear,
    avgStreakLength,
    streakBreaks: breakDays.length,
    breakDays,
  }
}

function findBestDay(dailyPoints: DailyPointsMap) {
  let best = { points: 0, date: '' }
  for (const [date, points] of Object.entries(dailyPoints)) {
    if (points > best.points) {
      best = { points, date }
    }
  }
  return best.points > 0 ? best : null
}

function findBestWeek(dailyPoints: DailyPointsMap) {
  const dates = Object.keys(dailyPoints).sort()
  if (dates.length === 0) return null

  let best = { points: 0, startDate: '' }

  // Calculate rolling 7-day totals
  for (let i = 0; i <= dates.length - 7; i++) {
    const weekStart = dates[i]
    let weekTotal = 0

    // Sum points for 7 days starting from this date
    const startDate = new Date(weekStart)
    for (let j = 0; j < 7; j++) {
      const checkDate = new Date(startDate)
      checkDate.setDate(startDate.getDate() + j)
      const dateStr = checkDate.toISOString().split('T')[0]
      weekTotal += dailyPoints[dateStr] || 0
    }

    if (weekTotal > best.points) {
      best = { points: weekTotal, startDate: weekStart }
    }
  }

  return best.points > 0 ? best : null
}

function findBestMonth(dailyPoints: DailyPointsMap) {
  const monthTotals: Record<string, number> = {}
  for (const [date, points] of Object.entries(dailyPoints)) {
    const month = date.slice(0, 7) // YYYY-MM
    monthTotals[month] = (monthTotals[month] || 0) + points
  }

  let best = { points: 0, month: '' }
  for (const [month, points] of Object.entries(monthTotals)) {
    if (points > best.points) {
      best = { points, month: format(new Date(month + '-01'), 'MMMM yyyy') }
    }
  }
  return best.points > 0 ? best : null
}

function calculateTaskStats(tasks: Array<{ date: string; completed_at: string | null; times_rolled: number; is_focus: boolean }>) {
  const total = tasks.length
  if (total === 0) {
    return {
      sameDay: 0,
      nextDay: 0,
      rolledMultiple: 0,
      abandoned: 0,
      avgTimesRolled: 0,
      focusHitRate: 0,
    }
  }

  let sameDay = 0
  let nextDay = 0
  let rolledMultiple = 0
  let abandoned = 0
  let totalRolls = 0

  for (const task of tasks) {
    if (!task.completed_at) {
      abandoned++
    } else if (task.times_rolled === 0) {
      sameDay++
    } else if (task.times_rolled === 1) {
      nextDay++
    } else {
      rolledMultiple++
    }
    totalRolls += task.times_rolled
  }

  const focusTasks = tasks.filter(t => t.is_focus)
  const focusCompleted = focusTasks.filter(t => t.completed_at).length
  const focusHitRate = focusTasks.length > 0
    ? Math.round((focusCompleted / focusTasks.length) * 100)
    : 0

  return {
    sameDay: Math.round((sameDay / total) * 100),
    nextDay: Math.round((nextDay / total) * 100),
    rolledMultiple: Math.round((rolledMultiple / total) * 100),
    abandoned: Math.round((abandoned / total) * 100),
    avgTimesRolled: total > 0 ? totalRolls / total : 0,
    focusHitRate,
  }
}
