/**
 * Project Progress Calculations
 *
 * Calculates project completion based on:
 * 1. Deliverables (primary) - completed / total
 * 2. Phase progression (fallback) - current phase position
 */

// Phase configuration (mirrors ProjectTimeline.tsx)
const STATUS_PHASES = {
  signoff: ['deliverables_pending', 'awaiting_signoff', 'signed_off'],
  agreement: ['agreement_sent', 'agreement_signed'],
  payment: ['payment_pending', 'payment_partial', 'payment_paid'],
  onboarding: ['collecting_access', 'access_complete', 'dev_assigned'],
  development: ['in_progress', 'blocked_client', 'blocked_internal', 'review_checkpoint', 'revisions', 'final_qa'],
  delivery: ['delivered', 'acceptance_pending', 'accepted'],
  closed: ['completed', 'cancelled', 'on_hold'],
} as const

const PHASE_ORDER = ['signoff', 'agreement', 'payment', 'onboarding', 'development', 'delivery', 'closed'] as const
const PHASE_LABELS: Record<string, string> = {
  signoff: 'Sign-off',
  agreement: 'Agreement',
  payment: 'Payment',
  onboarding: 'Onboarding',
  development: 'Development',
  delivery: 'Delivery',
  closed: 'Closed',
}

// Types
export interface DeliverableProgress {
  completed: number
  total: number
  percentage: number
}

export interface PhaseProgress {
  currentPhase: string
  phaseLabel: string
  phaseIndex: number
  totalPhases: number
  percentage: number
}

export interface ProjectProgress {
  percentage: number
  label: string
  type: 'deliverables' | 'phase'
  details: {
    deliverables?: DeliverableProgress
    phase: PhaseProgress
  }
}

// Minimal deliverable type for progress calculation
interface DeliverableMinimal {
  id: string
  status: string
}

/**
 * Calculate progress based on deliverables
 */
export function calculateDeliverableProgress(
  deliverables: DeliverableMinimal[] | undefined | null
): DeliverableProgress | null {
  if (!deliverables || deliverables.length === 0) {
    return null
  }

  const total = deliverables.length
  const completed = deliverables.filter((d) => d.status === 'done').length
  const percentage = Math.round((completed / total) * 100)

  return { completed, total, percentage }
}

/**
 * Get the phase for a given status
 */
function getPhaseForStatus(status: string): string {
  for (const [phase, statuses] of Object.entries(STATUS_PHASES)) {
    if (statuses.includes(status as never)) return phase
  }
  return 'signoff' // Default to first phase
}

/**
 * Calculate progress based on phase position
 */
export function calculatePhaseProgress(status: string): PhaseProgress {
  const currentPhase = getPhaseForStatus(status)
  const phaseIndex = PHASE_ORDER.indexOf(currentPhase as (typeof PHASE_ORDER)[number])
  const totalPhases = PHASE_ORDER.length - 1 // Exclude 'closed' from progress calculation

  // Calculate percentage based on phase position
  // closed = 100%, otherwise based on position
  let percentage: number
  if (currentPhase === 'closed') {
    percentage = 100
  } else {
    // Map phase index to percentage (0-100)
    percentage = Math.round((phaseIndex / (totalPhases - 1)) * 100)
  }

  return {
    currentPhase,
    phaseLabel: PHASE_LABELS[currentPhase] || currentPhase,
    phaseIndex,
    totalPhases: PHASE_ORDER.length,
    percentage,
  }
}

/**
 * Get combined project progress
 * Uses deliverables if available, falls back to phase-based progress
 */
export function getProjectProgress(project: {
  status: string
  deliverables?: DeliverableMinimal[] | null
}): ProjectProgress {
  const phaseProgress = calculatePhaseProgress(project.status)
  const deliverableProgress = calculateDeliverableProgress(project.deliverables)

  // Use deliverable progress if available and project is in development/delivery
  const useDeliverables = deliverableProgress &&
    ['development', 'delivery'].includes(phaseProgress.currentPhase)

  if (useDeliverables && deliverableProgress) {
    return {
      percentage: deliverableProgress.percentage,
      label: `${deliverableProgress.completed}/${deliverableProgress.total} deliverables`,
      type: 'deliverables',
      details: {
        deliverables: deliverableProgress,
        phase: phaseProgress,
      },
    }
  }

  return {
    percentage: phaseProgress.percentage,
    label: phaseProgress.phaseLabel,
    type: 'phase',
    details: {
      phase: phaseProgress,
    },
  }
}

/**
 * Get progress bar color based on percentage
 */
export function getProgressColor(percentage: number): string {
  if (percentage >= 100) return 'bg-green-500'
  if (percentage >= 75) return 'bg-cyan-500'
  if (percentage >= 50) return 'bg-yellow-500'
  if (percentage >= 25) return 'bg-orange-500'
  return 'bg-stone-400'
}
