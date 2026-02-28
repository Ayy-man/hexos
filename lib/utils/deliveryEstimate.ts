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
  // If override is set, use it but still check against today
  if (overrideDate) {
    const override = new Date(overrideDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    override.setHours(0, 0, 0, 0)
    const pastDays = Math.floor((today.getTime() - override.getTime()) / (1000 * 60 * 60 * 24))
    const delayDays = Math.max(0, pastDays)
    return {
      estimatedDate: new Date(overrideDate),
      targetDate: targetDate ? new Date(targetDate) : null,
      delayDays,
      status: getDeliveryStatus(delayDays),
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
  const { delayDays: deliverableDelayDays, overdueCount } = calculateDelayFromDeliverables(deliverables)
  const target = new Date(targetDate)
  const estimated = new Date(target)
  estimated.setDate(estimated.getDate() + deliverableDelayDays)

  // Also check if the estimated date itself is in the past
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  estimated.setHours(0, 0, 0, 0)
  const pastDays = Math.floor((today.getTime() - estimated.getTime()) / (1000 * 60 * 60 * 24))
  const delayDays = Math.max(deliverableDelayDays, pastDays)

  return {
    estimatedDate: new Date(target.getTime() + deliverableDelayDays * 24 * 60 * 60 * 1000),
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
