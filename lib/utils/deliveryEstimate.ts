/**
 * Delivery Estimate Calculations
 *
 * Calculates estimated delivery date based on:
 * 1. Manual override (if set)
 * 2. Target delivery date + cumulative delay from overdue deliverables
 */

// Status thresholds (in days)
const AT_RISK_THRESHOLD = 3
const DELAYED_THRESHOLD = 7

export type DeliveryStatus = 'on_track' | 'at_risk' | 'delayed'

export interface DeliveryEstimate {
  estimatedDate: Date | null
  targetDate: Date | null
  delayDays: number
  status: DeliveryStatus
  overdueCount: number
  isOverride: boolean
}

interface DeliverableForEstimate {
  due_date: string | null
  status: string
  completed_at?: string | null
}

/**
 * Get delivery status based on delay days
 */
export function getDeliveryStatus(delayDays: number): DeliveryStatus {
  if (delayDays >= DELAYED_THRESHOLD) return 'delayed'
  if (delayDays >= AT_RISK_THRESHOLD) return 'at_risk'
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
    case 'on_track':
      return {
        border: 'border-emerald-500',
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-600 dark:text-emerald-400',
        pill: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
      }
    case 'at_risk':
      return {
        border: 'border-amber-500',
        bg: 'bg-amber-500/10',
        text: 'text-amber-600 dark:text-amber-400',
        pill: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
      }
    case 'delayed':
      return {
        border: 'border-red-500',
        bg: 'bg-red-500/10',
        text: 'text-red-600 dark:text-red-400',
        pill: 'bg-red-500/20 text-red-700 dark:text-red-300',
      }
  }
}

/**
 * Get human-readable status label
 */
export function getStatusLabel(status: DeliveryStatus): string {
  switch (status) {
    case 'on_track':
      return 'On Track'
    case 'at_risk':
      return 'At Risk'
    case 'delayed':
      return 'Delayed'
  }
}

/**
 * Calculate the total delay days from overdue deliverables
 * An overdue deliverable is one where:
 * - due_date < today
 * - status is not 'done'
 */
function calculateDelayFromDeliverables(
  deliverables: DeliverableForEstimate[]
): { delayDays: number; overdueCount: number } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let totalDelayDays = 0
  let overdueCount = 0

  for (const deliverable of deliverables) {
    // Skip if no due date or already completed
    if (!deliverable.due_date || deliverable.status === 'done') continue

    const dueDate = new Date(deliverable.due_date)
    dueDate.setHours(0, 0, 0, 0)

    // Calculate days overdue
    const diffTime = today.getTime() - dueDate.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays > 0) {
      totalDelayDays += diffDays
      overdueCount++
    }
  }

  return { delayDays: totalDelayDays, overdueCount }
}

/**
 * Calculate the estimated delivery date
 *
 * Logic:
 * 1. If override is set, use that directly
 * 2. Otherwise, take target_delivery_date + sum of overdue days
 */
export function calculateDeliveryEstimate(
  targetDate: string | null,
  overrideDate: string | null,
  deliverables: DeliverableForEstimate[]
): DeliveryEstimate {
  // If override is set, use it directly
  if (overrideDate) {
    const override = new Date(overrideDate)
    return {
      estimatedDate: override,
      targetDate: targetDate ? new Date(targetDate) : null,
      delayDays: 0,
      status: 'on_track',
      overdueCount: 0,
      isOverride: true,
    }
  }

  // No target date set
  if (!targetDate) {
    const { delayDays, overdueCount } = calculateDelayFromDeliverables(deliverables)
    return {
      estimatedDate: null,
      targetDate: null,
      delayDays,
      status: getDeliveryStatus(delayDays),
      overdueCount,
      isOverride: false,
    }
  }

  // Calculate based on target + delays
  const { delayDays, overdueCount } = calculateDelayFromDeliverables(deliverables)
  const target = new Date(targetDate)
  const estimated = new Date(target)
  estimated.setDate(estimated.getDate() + delayDays)

  return {
    estimatedDate: estimated,
    targetDate: target,
    delayDays,
    status: getDeliveryStatus(delayDays),
    overdueCount,
    isOverride: false,
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
