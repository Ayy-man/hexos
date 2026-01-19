import type { ZoneInfo } from './types'

// ============================================
// Zone Classification
// ============================================

export function getZone(x: number): ZoneInfo {
  if (x < 50) {
    return {
      zone: 'figuring_out',
      label: 'Figuring Out',
      colorClass: 'text-amber-500',
      bgClass: 'bg-amber-500/15',
    }
  }
  if (x < 90) {
    return {
      zone: 'making_it',
      label: 'Making It',
      colorClass: 'text-cyan-500',
      bgClass: 'bg-cyan-500/15',
    }
  }
  return {
    zone: 'done',
    label: 'Done',
    colorClass: 'text-green-500',
    bgClass: 'bg-green-500/15',
  }
}

// ============================================
// Deadline Helpers
// ============================================

export function getDeadlineInfo(
  dueDate: string | null,
  currentPosition: number
): {
  isOverdue: boolean
  daysRemaining: number | null
  label: string | null
} {
  if (!dueDate) {
    return { isOverdue: false, daysRemaining: null, label: null }
  }

  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const deadline = new Date(dueDate)
  deadline.setHours(0, 0, 0, 0)

  const diffTime = deadline.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  const isOverdue = diffDays < 0 && currentPosition < 100

  let label: string | null = null
  if (isOverdue) {
    label = `${Math.abs(diffDays)}d overdue`
  } else if (diffDays === 0) {
    label = 'Due today'
  } else if (diffDays > 0) {
    label = `${diffDays}d left`
  }

  return { isOverdue, daysRemaining: diffDays, label }
}

// ============================================
// Date Helpers
// ============================================

export function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function getDayNumber(isoString: string): number {
  const date = new Date(isoString)
  return date.getDate()
}

export function getDayOfYear(isoString: string): number {
  const date = new Date(isoString)
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  const oneDay = 1000 * 60 * 60 * 24
  return Math.floor(diff / oneDay)
}

// ============================================
// History Processing
// ============================================

export function wasLoggedToday(
  history: Array<{ timestamp: string }>,
  today: Date = new Date()
): boolean {
  const todayStart = new Date(today)
  todayStart.setHours(0, 0, 0, 0)

  return history.some((h) => {
    const entryDate = new Date(h.timestamp)
    entryDate.setHours(0, 0, 0, 0)
    return entryDate.getTime() === todayStart.getTime()
  })
}

// ============================================
// Hill Chart Math
// ============================================

// Snap zones for position updates
export const SNAP_ZONES = [0, 50, 100]
export const SNAP_THRESHOLD = 5

// Stacking for overlapping dots
export const STACK_TOLERANCE = 3
export const STACK_OFFSET = 24

export function snapToZone(x: number): number {
  for (const snap of SNAP_ZONES) {
    if (Math.abs(x - snap) < SNAP_THRESHOLD) {
      return snap
    }
  }
  return x
}

export function clampPosition(x: number): number {
  return Math.max(0, Math.min(100, Math.round(x)))
}
