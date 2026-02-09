/**
 * Project Phase Detection Utilities
 * Centralized phase logic for tab visibility, progress calculation, and UI state
 */

import type { ProjectStatus } from '@/lib/api/projects'

// Phase definitions with all possible statuses
export const STATUS_PHASES = {
  signoff: ['deliverables_pending', 'awaiting_signoff', 'signed_off'],
  agreement: ['agreement_sent', 'agreement_signed'],
  payment: ['payment_pending', 'payment_partial', 'payment_paid'],
  onboarding: ['collecting_access', 'access_complete', 'dev_assigned'],
  development: [
    'in_progress',
    'blocked_client',
    'blocked_internal',
    'review_checkpoint',
    'revisions',
    'final_qa',
  ],
  delivery: ['delivered', 'acceptance_pending', 'accepted'],
  retainer: ['retainer'],
  closed: ['completed', 'cancelled', 'on_hold'],
} as const

export const PHASE_ORDER = [
  'signoff',
  'agreement',
  'payment',
  'onboarding',
  'development',
  'delivery',
  'retainer',
  'closed',
] as const

export type ProjectPhase = (typeof PHASE_ORDER)[number]

/**
 * Get the phase for a given project status
 */
export function getPhaseForStatus(status: string): ProjectPhase {
  for (const [phase, statuses] of Object.entries(STATUS_PHASES)) {
    if (statuses.includes(status as never)) {
      return phase as ProjectPhase
    }
  }
  return 'signoff' // Default fallback
}

/**
 * Get the phase index (0-based) for progress calculations
 */
export function getPhaseIndex(phase: ProjectPhase): number {
  return PHASE_ORDER.indexOf(phase)
}

/**
 * Check if a project is in the onboarding phases (Sign-off through Onboarding)
 * Used to determine Onboarding tab visibility
 */
export function isOnboardingPhase(status: string): boolean {
  const phase = getPhaseForStatus(status)
  return ['signoff', 'agreement', 'payment', 'onboarding'].includes(phase)
}

/**
 * Check if a project is in active development (Development phase)
 * Used for Hill Chart editability
 */
export function isDevelopmentPhase(status: string): boolean {
  return getPhaseForStatus(status) === 'development'
}

/**
 * Check if a project is in a phase where deliverables are locked
 * After sign-off, deliverables can only be edited with scope change logging
 */
export function isDeliverablesLocked(status: string): boolean {
  const lockedStatuses = [
    'signed_off',
    'collecting_access',
    'access_complete',
    'dev_assigned',
    'in_progress',
    'blocked_client',
    'blocked_internal',
    'review_checkpoint',
    'revisions',
    'final_qa',
    'delivered',
    'acceptance_pending',
    'accepted',
    'completed',
  ]
  return lockedStatuses.includes(status)
}

/**
 * Check if a project has passed the sign-off phase
 * Used to determine if baseline should exist
 */
export function isPastSignoff(status: string): boolean {
  const phase = getPhaseForStatus(status)
  const phaseIndex = getPhaseIndex(phase)
  const signoffIndex = getPhaseIndex('signoff')
  // Status is 'signed_off' or any phase after signoff
  return status === 'signed_off' || phaseIndex > signoffIndex
}

/**
 * Check if Hill Chart should be editable
 * Only editable during development phase
 */
export function isHillChartEditable(status: string): boolean {
  return isDevelopmentPhase(status)
}

/**
 * Check if Hill Chart should be shown at all
 * Hidden during early phases (Sign-off, Agreement, Payment)
 */
export function shouldShowHillChart(status: string): boolean {
  const phase = getPhaseForStatus(status)
  return !['signoff', 'agreement', 'payment'].includes(phase)
}

/**
 * Get human-readable phase name
 */
export function getPhaseName(phase: ProjectPhase): string {
  const names: Record<ProjectPhase, string> = {
    signoff: 'Sign-off',
    agreement: 'Agreement',
    payment: 'Payment',
    onboarding: 'Onboarding',
    development: 'Development',
    delivery: 'Delivery',
    retainer: 'Retainer',
    closed: 'Closed',
  }
  return names[phase]
}

/**
 * Calculate phase-based progress percentage
 */
export function calculatePhaseProgress(status: string): number {
  const phase = getPhaseForStatus(status)
  const phaseIndex = getPhaseIndex(phase)
  return Math.round(((phaseIndex + 1) / PHASE_ORDER.length) * 100)
}

/**
 * Check if a project is in the retainer phase
 */
export function isRetainerPhase(status: string): boolean {
  return getPhaseForStatus(status) === 'retainer'
}

/**
 * Check if a project has been completed
 */
export function isCompletedPhase(status: string): boolean {
  return status === 'completed'
}

/**
 * Check if a project is in post-delivery phase (retainer or closed)
 */
export function isPostDeliveryPhase(status: string): boolean {
  const phase = getPhaseForStatus(status)
  return phase === 'retainer' || phase === 'closed'
}
