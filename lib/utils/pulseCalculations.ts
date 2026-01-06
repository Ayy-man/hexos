// ============================================================================
// Pulse Calculations Utility
// Helper functions for streak calculation, date handling, and rollover logic
// ============================================================================

// ============================================================================
// Date Utilities
// ============================================================================

export function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

export function getYesterday(): string {
  const date = new Date()
  date.setDate(date.getDate() - 1)
  return date.toISOString().split('T')[0]
}

export function formatDateForDisplay(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function getDayOfWeek(dateStr: string): number {
  const date = new Date(dateStr + 'T00:00:00')
  return date.getDay() // 0 = Sunday, 6 = Saturday
}

export function isToday(dateStr: string): boolean {
  return dateStr === getToday()
}

export function isPast(dateStr: string): boolean {
  return dateStr < getToday()
}

export function isFuture(dateStr: string): boolean {
  return dateStr > getToday()
}

// ============================================================================
// Week Calculations
// ============================================================================

export interface WeekRange {
  start: string // Monday
  end: string // Sunday
  dates: string[]
}

export function getWeekRange(referenceDate?: string): WeekRange {
  const date = referenceDate
    ? new Date(referenceDate + 'T00:00:00')
    : new Date()

  // Find Monday of this week
  const dayOfWeek = date.getDay()
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1

  const monday = new Date(date)
  monday.setDate(date.getDate() - daysToMonday)

  const dates: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    dates.push(d.toISOString().split('T')[0])
  }

  return {
    start: dates[0],
    end: dates[6],
    dates,
  }
}

export function getPreviousWeek(currentWeekStart: string): WeekRange {
  const date = new Date(currentWeekStart + 'T00:00:00')
  date.setDate(date.getDate() - 7)
  return getWeekRange(date.toISOString().split('T')[0])
}

export function getNextWeek(currentWeekStart: string): WeekRange {
  const date = new Date(currentWeekStart + 'T00:00:00')
  date.setDate(date.getDate() + 7)
  return getWeekRange(date.toISOString().split('T')[0])
}

// ============================================================================
// Heatmap Calculations
// ============================================================================

export type HeatmapIntensity = 0 | 1 | 2 | 3

export interface HeatmapDay {
  date: string
  points: number
  intensity: HeatmapIntensity
  dayOfWeek: number // 0-6
  weekIndex: number
}

export function getHeatmapIntensity(points: number): HeatmapIntensity {
  if (points === 0) return 0
  if (points < 10) return 1
  if (points < 25) return 2
  return 3
}

export function generateHeatmapGrid(
  dailyPoints: Record<string, number>,
  weeks: number = 12
): HeatmapDay[][] {
  const today = new Date()

  // Find the Monday of the current week
  const dayOfWeek = today.getDay()
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const currentMonday = new Date(today)
  currentMonday.setDate(today.getDate() - daysToMonday)

  // Go back `weeks` weeks
  const startDate = new Date(currentMonday)
  startDate.setDate(currentMonday.getDate() - (weeks - 1) * 7)

  const grid: HeatmapDay[][] = []

  for (let w = 0; w < weeks; w++) {
    const week: HeatmapDay[] = []

    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(startDate)
      cellDate.setDate(startDate.getDate() + w * 7 + d)
      const dateStr = cellDate.toISOString().split('T')[0]
      const points = dailyPoints[dateStr] || 0

      week.push({
        date: dateStr,
        points,
        intensity: getHeatmapIntensity(points),
        dayOfWeek: d,
        weekIndex: w,
      })
    }

    grid.push(week)
  }

  return grid
}

// ============================================================================
// Streak Calculations (Client-side helper)
// ============================================================================

export interface StreakInfo {
  current: number
  isActiveToday: boolean
  lastActiveDate: string | null
}

export function calculateStreakFromPoints(
  dailyPoints: Record<string, number>,
  minPulse: number = 10
): StreakInfo {
  const today = getToday()
  const todayPoints = dailyPoints[today] || 0
  const isActiveToday = todayPoints >= minPulse

  let streak = 0
  let lastActiveDate: string | null = null

  // Start checking from yesterday
  const checkDate = new Date()
  checkDate.setDate(checkDate.getDate() - 1)

  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0]
    const points = dailyPoints[dateStr] || 0
    const dayOfWeek = checkDate.getDay() // 0 = Sunday

    if (dayOfWeek === 0) {
      // Sunday is optional
      if (points > 0) {
        streak++
        if (!lastActiveDate) lastActiveDate = dateStr
      }
      // Continue regardless
    } else {
      // Mon-Sat: must meet minimum
      if (points >= minPulse) {
        streak++
        if (!lastActiveDate) lastActiveDate = dateStr
      } else {
        break
      }
    }

    // Move to previous day
    checkDate.setDate(checkDate.getDate() - 1)

    // Safety limit
    if (streak > 365) break

    // Don't check more than 2 years back
    const daysBack = Math.floor(
      (new Date().getTime() - checkDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    if (daysBack > 730) break
  }

  return {
    current: streak,
    isActiveToday,
    lastActiveDate,
  }
}

// ============================================================================
// Task Rollover Calculations
// ============================================================================

export function shouldRolloverTasks(
  lastViewedDate: string | null,
  currentDate: string = getToday()
): boolean {
  if (!lastViewedDate) return false
  return lastViewedDate < currentDate
}

export function getDatesToRollover(
  lastViewedDate: string,
  currentDate: string = getToday()
): string[] {
  const dates: string[] = []
  const start = new Date(lastViewedDate + 'T00:00:00')
  const end = new Date(currentDate + 'T00:00:00')

  // Get all dates between lastViewed (exclusive) and current (exclusive)
  const current = new Date(start)
  current.setDate(current.getDate() + 1)

  while (current < end) {
    dates.push(current.toISOString().split('T')[0])
    current.setDate(current.getDate() + 1)
  }

  return dates
}

// ============================================================================
// Quarter Utilities
// ============================================================================

export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4'

export function getCurrentQuarter(): Quarter {
  const month = new Date().getMonth() + 1
  if (month <= 3) return 'Q1'
  if (month <= 6) return 'Q2'
  if (month <= 9) return 'Q3'
  return 'Q4'
}

export function getQuarterLabel(quarter: Quarter): string {
  const labels: Record<Quarter, string> = {
    Q1: 'Q1 (Jan-Mar)',
    Q2: 'Q2 (Apr-Jun)',
    Q3: 'Q3 (Jul-Sep)',
    Q4: 'Q4 (Oct-Dec)',
  }
  return labels[quarter]
}

export function getAllQuarters(): Quarter[] {
  return ['Q1', 'Q2', 'Q3', 'Q4']
}

// ============================================================================
// Point Thresholds
// ============================================================================

export const HEATMAP_THRESHOLDS = {
  low: 10, // Below this: intensity 1
  medium: 25, // Below this: intensity 2, above: intensity 3
}

export const DEFAULT_MIN_DAILY_PULSE = 10

// ============================================================================
// Formatting
// ============================================================================

export function formatPoints(points: number): string {
  if (points === 1) return '1 pt'
  return `${points} pts`
}

export function formatStreak(streak: number): string {
  if (streak === 0) return 'No streak'
  if (streak === 1) return '1 day'
  return `${streak} days`
}
