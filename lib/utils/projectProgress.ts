/**
 * Project Progress Calculations
 *
 * Calculates project completion based on phase:
 * 1. Onboarding phases (signoff → onboarding): % of requirements completed
 * 2. Development phases (development → delivery): average hill_position of sub-deliverables
 * 3. Closed phase: 100%
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

// Phases where we show onboarding requirements progress
const ONBOARDING_PHASES = ['signoff', 'agreement', 'payment', 'onboarding']

// Phases where we show hill chart progress
const DEVELOPMENT_PHASES = ['development', 'delivery']

// Types
export interface DeliverableProgress {
  completed: number
  total: number
  percentage: number
}

export interface RequirementsProgress {
  completed: number
  total: number
  percentage: number
}

export interface HillChartProgress {
  averagePosition: number
  subDeliverableCount: number
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
  type: 'requirements' | 'hillchart' | 'phase'
  isOnboardingPhase: boolean
  details: {
    deliverables?: DeliverableProgress
    requirements?: RequirementsProgress
    hillChart?: HillChartProgress
    phase: PhaseProgress
  }
}

// Minimal types for progress calculation
interface DeliverableMinimal {
  id: string
  status: string
  parent_id?: string | null
  hill_position?: number
}

interface RequirementMinimal {
  id: string
  status: string
}

/**
 * Calculate progress based on requirements (for onboarding phases)
 */
export function calculateRequirementsProgress(
  requirements: RequirementMinimal[] | undefined | null
): RequirementsProgress | null {
  if (!requirements || requirements.length === 0) {
    return null
  }

  const total = requirements.length
  const completed = requirements.filter((r) => r.status === 'approved').length
  const percentage = Math.round((completed / total) * 100)

  return { completed, total, percentage }
}

/**
 * Calculate progress based on hill chart positions (for development phases)
 * Uses only sub-deliverables (those with a parent_id)
 */
export function calculateHillChartProgress(
  deliverables: DeliverableMinimal[] | undefined | null
): HillChartProgress | null {
  if (!deliverables || deliverables.length === 0) {
    return null
  }

  // Filter to only sub-deliverables (those with a parent_id)
  const subDeliverables = deliverables.filter((d) => d.parent_id)

  if (subDeliverables.length === 0) {
    // If no sub-deliverables, use all deliverables
    const allPositions = deliverables.map((d) => d.hill_position || 0)
    const average = Math.round(allPositions.reduce((sum, pos) => sum + pos, 0) / allPositions.length)
    return { averagePosition: average, subDeliverableCount: deliverables.length }
  }

  const positions = subDeliverables.map((d) => d.hill_position || 0)
  const average = Math.round(positions.reduce((sum, pos) => sum + pos, 0) / positions.length)

  return { averagePosition: average, subDeliverableCount: subDeliverables.length }
}

/**
 * Calculate progress based on deliverables (legacy - kept for compatibility)
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
  const totalPhases = PHASE_ORDER.length

  // Calculate percentage based on phase position
  // closed = 100%, otherwise based on position (early phases show ~15%+)
  let percentage: number
  if (currentPhase === 'closed') {
    percentage = 100
  } else {
    // Use (index + 1) / total so first phase shows ~15% instead of 0%
    // signoff: 14%, agreement: 29%, payment: 43%, onboarding: 57%, development: 71%, delivery: 86%
    percentage = Math.round(((phaseIndex + 1) / totalPhases) * 100)
  }

  return {
    currentPhase,
    phaseLabel: PHASE_LABELS[currentPhase] || currentPhase,
    phaseIndex,
    totalPhases,
    percentage,
  }
}

/**
 * Get combined project progress
 * - Onboarding phases: % of requirements completed (blue bar)
 * - Development phases: average hill_position of sub-deliverables
 * - Closed phase: 100%
 */
export function getProjectProgress(project: {
  status: string
  deliverables?: DeliverableMinimal[] | null
  requirements?: RequirementMinimal[] | null
}): ProjectProgress {
  const phaseProgress = calculatePhaseProgress(project.status)
  const isOnboardingPhase = ONBOARDING_PHASES.includes(phaseProgress.currentPhase)
  const isDevelopmentPhase = DEVELOPMENT_PHASES.includes(phaseProgress.currentPhase)

  // Onboarding phases: show requirements progress
  if (isOnboardingPhase) {
    const requirementsProgress = calculateRequirementsProgress(project.requirements)

    if (requirementsProgress) {
      return {
        percentage: requirementsProgress.percentage,
        label: `${requirementsProgress.completed}/${requirementsProgress.total} requirements`,
        type: 'requirements',
        isOnboardingPhase: true,
        details: {
          requirements: requirementsProgress,
          phase: phaseProgress,
        },
      }
    }

    // No requirements yet - show 0%
    return {
      percentage: 0,
      label: 'No requirements',
      type: 'requirements',
      isOnboardingPhase: true,
      details: {
        phase: phaseProgress,
      },
    }
  }

  // Development phases: show hill chart average
  if (isDevelopmentPhase) {
    const hillChartProgress = calculateHillChartProgress(project.deliverables)

    if (hillChartProgress) {
      return {
        percentage: hillChartProgress.averagePosition,
        label: `${hillChartProgress.averagePosition}% avg`,
        type: 'hillchart',
        isOnboardingPhase: false,
        details: {
          hillChart: hillChartProgress,
          phase: phaseProgress,
        },
      }
    }

    // No deliverables yet - show 0%
    return {
      percentage: 0,
      label: 'No deliverables',
      type: 'hillchart',
      isOnboardingPhase: false,
      details: {
        phase: phaseProgress,
      },
    }
  }

  // Closed phase or fallback
  return {
    percentage: phaseProgress.currentPhase === 'closed' ? 100 : phaseProgress.percentage,
    label: phaseProgress.phaseLabel,
    type: 'phase',
    isOnboardingPhase: false,
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
