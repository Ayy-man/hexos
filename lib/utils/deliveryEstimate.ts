/**
 * Delivery Estimate Calculations
 *
 * Calculates estimated delivery date based on:
 * 1. Manual override (if set)
 * 2. Target delivery date + max delay from overdue deliverables
 *
 * Status is determined by:
 * - Project completion state (delivered / delivered_late)
 * - Days past due relative to project duration (scaled thresholds)
 * - Completion percentage vs time elapsed
 * - Whether estimated date is ahead of target
 */

export type DeliveryStatus =
  | 'ahead'
  | 'on_track'
  | 'at_risk'
  | 'delayed'
  | 'delivered'
  | 'delivered_late'

export interface DeliveryEstimate {
  estimatedDate: Date | null
  targetDate: Date | null
  delayDays: number
  status: DeliveryStatus
  overdueCount: number
  isOverride: boolean
  /** 0-100 based on done deliverables / total deliverables */
  completionPercent: number
}

interface DeliverableForEstimate {
  due_date: string | null
  status: string
  completed_at?: string | null
}

const COMPLETED_STATUSES = ['delivered', 'completed', 'done']

/**
 * Get delivery status using thresholds scaled to project duration.
 *
 * Short projects (< 30 days): at_risk at 2d, delayed at 5d
 * Medium projects (30-90 days): at_risk at 3d, delayed at 7d
 * Long projects (> 90 days): at_risk at 7d, delayed at 14d
 */
function getScaledStatus(delayDays: number, durationDays: number | null): DeliveryStatus {
  if (delayDays <= 0) return 'on_track'

  let atRiskThreshold: number
  let delayedThreshold: number

  if (!durationDays || durationDays <= 0) {
    // Fallback to medium thresholds
    atRiskThreshold = 3
    delayedThreshold = 7
  } else if (durationDays < 30) {
    atRiskThreshold = 2
    delayedThreshold = 5
  } else if (durationDays <= 90) {
    atRiskThreshold = 3
    delayedThreshold = 7
  } else {
    atRiskThreshold = 7
    delayedThreshold = 14
  }

  if (delayDays >= delayedThreshold) return 'delayed'
  if (delayDays >= atRiskThreshold) return 'at_risk'
  return 'on_track'
}

/**
 * Get status color classes for styling
 */
export function getStatusColors(status: DeliveryStatus): {
  border: string
  bg: string
  text: string
  pill: string
} {
  switch (status) {
    case 'ahead':
      return {
        border: 'border-blue-500',
        bg: 'bg-blue-500/10',
        text: 'text-blue-600 dark:text-blue-400',
        pill: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
      }
    case 'on_track':
      return {
        border: 'border-success',
        bg: 'bg-success-muted',
        text: 'text-success',
        pill: 'bg-success-muted text-success-foreground',
      }
    case 'at_risk':
      return {
        border: 'border-warning',
        bg: 'bg-warning-muted',
        text: 'text-warning',
        pill: 'bg-warning-muted text-warning-foreground',
      }
    case 'delayed':
      return {
        border: 'border-error',
        bg: 'bg-error-muted',
        text: 'text-error',
        pill: 'bg-error-muted text-error-foreground',
      }
    case 'delivered':
      return {
        border: 'border-success',
        bg: 'bg-success-muted',
        text: 'text-success',
        pill: 'bg-success-muted text-success-foreground',
      }
    case 'delivered_late':
      return {
        border: 'border-warning',
        bg: 'bg-warning-muted',
        text: 'text-warning',
        pill: 'bg-warning-muted text-warning-foreground',
      }
  }
}

/**
 * Get human-readable status label
 */
export function getStatusLabel(status: DeliveryStatus): string {
  switch (status) {
    case 'ahead':
      return 'Ahead'
    case 'on_track':
      return 'On Track'
    case 'at_risk':
      return 'At Risk'
    case 'delayed':
      return 'Delayed'
    case 'delivered':
      return 'Delivered'
    case 'delivered_late':
      return 'Delivered Late'
  }
}

/**
 * Calculate the max delay from overdue deliverables.
 * Uses max (not sum) because deliverables are typically parallel work —
 * the project is delayed by the worst offender, not the total.
 */
function calculateDelayFromDeliverables(
  deliverables: DeliverableForEstimate[]
): { delayDays: number; overdueCount: number } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let maxDelayDays = 0
  let overdueCount = 0

  for (const deliverable of deliverables) {
    // Skip if no due date or already completed
    if (!deliverable.due_date || deliverable.status === 'done') continue

    const dueDate = new Date(deliverable.due_date)
    dueDate.setHours(0, 0, 0, 0)

    const diffDays = Math.floor(
      (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (diffDays > 0) {
      maxDelayDays = Math.max(maxDelayDays, diffDays)
      overdueCount++
    }
  }

  return { delayDays: maxDelayDays, overdueCount }
}

/**
 * Calculate completion percentage from deliverables
 */
function getCompletionPercent(deliverables: DeliverableForEstimate[]): number {
  if (deliverables.length === 0) return 0
  const done = deliverables.filter((d) => d.status === 'done').length
  return Math.round((done / deliverables.length) * 100)
}

/**
 * Calculate project duration in days from start (earliest deliverable or
 * target minus a reasonable window) to target date.
 */
function getProjectDurationDays(targetDate: Date, deliverables: DeliverableForEstimate[]): number {
  // Find the earliest due date as a proxy for project start
  let earliest: Date | null = null
  for (const d of deliverables) {
    if (d.due_date) {
      const dd = new Date(d.due_date)
      if (!earliest || dd < earliest) earliest = dd
    }
  }
  if (!earliest) return 30 // default to medium
  const diff = Math.floor(
    (targetDate.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24)
  )
  return Math.max(diff, 1)
}

/**
 * Calculate the estimated delivery date
 *
 * Logic:
 * 1. If project is completed/delivered, return delivered or delivered_late
 * 2. If override is set, use it and check against today
 * 3. Otherwise, target + max overdue delay, check against today, scale thresholds
 * 4. If estimated date is well ahead of target, return "ahead"
 */
export function calculateDeliveryEstimate(
  targetDate: string | null,
  overrideDate: string | null,
  deliverables: DeliverableForEstimate[],
  projectStatus?: string | null
): DeliveryEstimate {
  const completionPercent = getCompletionPercent(deliverables)

  // --- Completed project ---
  if (projectStatus && COMPLETED_STATUSES.includes(projectStatus)) {
    const target = targetDate ? new Date(targetDate) : null
    const estimated = overrideDate ? new Date(overrideDate) : target

    if (target && estimated) {
      target.setHours(0, 0, 0, 0)
      const estNorm = new Date(estimated)
      estNorm.setHours(0, 0, 0, 0)
      const pastDays = Math.floor(
        (estNorm.getTime() - target.getTime()) / (1000 * 60 * 60 * 24)
      )
      const wasLate = pastDays > 0
      return {
        estimatedDate: estimated,
        targetDate: target,
        delayDays: Math.max(0, pastDays),
        status: wasLate ? 'delivered_late' : 'delivered',
        overdueCount: 0,
        isOverride: !!overrideDate,
        completionPercent: 100,
      }
    }

    return {
      estimatedDate: estimated,
      targetDate: target,
      delayDays: 0,
      status: 'delivered',
      overdueCount: 0,
      isOverride: !!overrideDate,
      completionPercent: 100,
    }
  }

  // --- Override date ---
  if (overrideDate) {
    const override = new Date(overrideDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const overrideNorm = new Date(override)
    overrideNorm.setHours(0, 0, 0, 0)
    const pastDays = Math.floor(
      (today.getTime() - overrideNorm.getTime()) / (1000 * 60 * 60 * 24)
    )
    const delayDays = Math.max(0, pastDays)
    const target = targetDate ? new Date(targetDate) : null
    const durationDays = target ? getProjectDurationDays(target, deliverables) : null

    return {
      estimatedDate: override,
      targetDate: target,
      delayDays,
      status: getScaledStatus(delayDays, durationDays),
      overdueCount: 0,
      isOverride: true,
      completionPercent,
    }
  }

  // --- No target date ---
  if (!targetDate) {
    const { delayDays, overdueCount } = calculateDelayFromDeliverables(deliverables)
    return {
      estimatedDate: null,
      targetDate: null,
      delayDays,
      status: getScaledStatus(delayDays, null),
      overdueCount,
      isOverride: false,
      completionPercent,
    }
  }

  // --- Standard: target + max overdue delay ---
  const { delayDays: deliverableDelayDays, overdueCount } =
    calculateDelayFromDeliverables(deliverables)
  const target = new Date(targetDate)
  const estimated = new Date(target)
  estimated.setDate(estimated.getDate() + deliverableDelayDays)

  // Check if estimated date is past today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const estimatedNorm = new Date(estimated)
  estimatedNorm.setHours(0, 0, 0, 0)
  const pastDays = Math.floor(
    (today.getTime() - estimatedNorm.getTime()) / (1000 * 60 * 60 * 24)
  )
  const delayDays = Math.max(deliverableDelayDays, pastDays)

  const durationDays = getProjectDurationDays(target, deliverables)

  // Check for "ahead" — estimated is before target and no delay
  if (delayDays <= 0 && deliverableDelayDays === 0) {
    const targetNorm = new Date(target)
    targetNorm.setHours(0, 0, 0, 0)
    const daysAhead = Math.floor(
      (targetNorm.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    )

    // "Ahead" if completion % is higher than time elapsed %
    if (daysAhead > 0 && completionPercent > 0) {
      const timeElapsedPercent = Math.round(
        ((durationDays - daysAhead) / durationDays) * 100
      )
      if (completionPercent > timeElapsedPercent + 10) {
        return {
          estimatedDate: estimated,
          targetDate: target,
          delayDays: 0,
          status: 'ahead',
          overdueCount,
          isOverride: false,
          completionPercent,
        }
      }
    }
  }

  return {
    estimatedDate: estimated,
    targetDate: target,
    delayDays,
    status: getScaledStatus(delayDays, durationDays),
    overdueCount,
    isOverride: false,
    completionPercent,
  }
}

/**
 * Format a date for display
 */
export function formatDeliveryDate(date: Date | null): string {
  if (!date) return 'Not set'
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Get day of week from date
 */
export function getDayOfWeek(date: Date | null): string {
  if (!date) return ''
  return date.toLocaleDateString('en-US', { weekday: 'long' })
}
