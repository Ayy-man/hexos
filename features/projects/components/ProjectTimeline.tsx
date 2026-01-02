'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// ============================================
// Types
// ============================================

interface ProjectTimelineProps {
  currentStatus: string
  phaseStartDate?: string | null
  createdAt?: string | null
}

// ============================================
// Phase Configuration
// ============================================

const STATUS_PHASES = {
  inquiry: ['inquiry_new', 'ai_matching', 'qualified'],
  proposal: ['proposal_drafting', 'internal_review', 'proposal_sent', 'negotiating', 'committed'],
  signoff: ['deliverables_pending', 'awaiting_signoff', 'signed_off'],
  agreement: ['agreement_sent', 'agreement_signed'],
  payment: ['payment_pending', 'payment_partial', 'payment_paid'],
  onboarding: ['collecting_access', 'access_complete', 'dev_assigned'],
  development: ['in_progress', 'blocked_client', 'blocked_internal', 'review_checkpoint', 'revisions', 'final_qa'],
  delivery: ['delivered', 'acceptance_pending', 'accepted'],
  closed: ['completed', 'cancelled', 'on_hold'],
} as const

const PHASE_LABELS: Record<string, string> = {
  inquiry: 'Inquiry',
  proposal: 'Proposal',
  signoff: 'Sign-off',
  agreement: 'Agreement',
  payment: 'Payment',
  onboarding: 'Onboarding',
  development: 'Development',
  delivery: 'Delivery',
  closed: 'Closed',
}

const PHASE_ORDER = ['inquiry', 'proposal', 'signoff', 'agreement', 'payment', 'onboarding', 'development', 'delivery'] as const

// ============================================
// Helper Functions
// ============================================

function getPhaseForStatus(status: string): string {
  for (const [phase, statuses] of Object.entries(STATUS_PHASES)) {
    if (statuses.includes(status as never)) return phase
  }
  return 'unknown'
}

function getPhaseIndex(phase: string): number {
  return PHASE_ORDER.indexOf(phase as (typeof PHASE_ORDER)[number])
}

function getDaysSince(date: string | null | undefined): number | null {
  if (!date) return null
  const start = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - start.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

function formatDuration(days: number | null): string {
  if (days === null) return ''
  if (days === 0) return 'Today'
  if (days === 1) return '1 day'
  return `${days} days`
}

// ============================================
// Component
// ============================================

export function ProjectTimeline({
  currentStatus,
  phaseStartDate,
  createdAt,
}: ProjectTimelineProps) {
  const currentPhase = getPhaseForStatus(currentStatus)
  const currentPhaseIndex = getPhaseIndex(currentPhase)

  // Calculate days in current phase
  const daysInPhase = useMemo(() => {
    // Use phaseStartDate if available, otherwise fall back to createdAt
    return getDaysSince(phaseStartDate || createdAt)
  }, [phaseStartDate, createdAt])

  return (
    <TooltipProvider delayDuration={200}>
      <div className="w-full py-6 overflow-x-auto">
        {/* Timeline Container */}
        <div className="relative flex items-start justify-between min-w-[600px] max-w-4xl mx-auto">
          {/* Background connector line */}
          <div className="absolute top-4 left-0 right-0 h-[2px] bg-gradient-to-r from-muted via-muted to-muted/30" />

          {/* Progress overlay - gradient from completed to current */}
          <div
            className="absolute top-4 left-0 h-[2px] bg-gradient-to-r from-cyan-500/60 via-cyan-500/80 to-cyan-400 transition-all duration-500"
            style={{
              width: currentPhaseIndex >= 0
                ? `${((currentPhaseIndex + 0.5) / PHASE_ORDER.length) * 100}%`
                : '0%'
            }}
          />

          {/* Phase Nodes */}
          {PHASE_ORDER.map((phase, index) => {
            const isCompleted = index < currentPhaseIndex
            const isCurrent = phase === currentPhase
            const isUpcoming = index > currentPhaseIndex

            return (
              <Tooltip key={phase}>
                <TooltipTrigger asChild>
                  <div className="relative flex flex-col items-center cursor-default group">
                    {/* Node */}
                    <div
                      className={cn(
                        'relative flex items-center justify-center transition-all duration-300',
                        // Completed: subtle filled dot
                        isCompleted && 'w-8 h-8',
                        // Current: larger with glow
                        isCurrent && 'w-10 h-10',
                        // Upcoming: hollow dot
                        isUpcoming && 'w-8 h-8'
                      )}
                    >
                      {/* Glow effect for current */}
                      {isCurrent && (
                        <div className="absolute inset-0 rounded-full bg-cyan-500/20 blur-md animate-pulse" />
                      )}

                      {/* Node circle */}
                      <div
                        className={cn(
                          'relative rounded-full flex items-center justify-center transition-all duration-300',
                          // Completed: solid background with cyan tint (covers the line)
                          isCompleted && 'w-6 h-6 bg-background border-2 border-cyan-500/50',
                          // Current: larger, glowing border
                          isCurrent && 'w-8 h-8 bg-cyan-500 border-2 border-cyan-400 shadow-lg shadow-cyan-500/30',
                          // Upcoming: hollow, dashed border
                          isUpcoming && 'w-6 h-6 bg-background border-2 border-dashed border-muted-foreground/30'
                        )}
                      >
                        {/* Checkmark for completed */}
                        {isCompleted && (
                          <svg
                            className="w-3 h-3 text-cyan-500/70"
                            viewBox="0 0 12 12"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M2.5 6l2.5 2.5 4.5-4.5" />
                          </svg>
                        )}

                        {/* Dot for current */}
                        {isCurrent && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                    </div>

                    {/* Label */}
                    <div className="mt-3 flex flex-col items-center">
                      <span
                        className={cn(
                          'text-xs font-medium transition-colors',
                          isCompleted && 'text-muted-foreground/60',
                          isCurrent && 'text-cyan-500 dark:text-cyan-400',
                          isUpcoming && 'text-muted-foreground/40'
                        )}
                      >
                        {PHASE_LABELS[phase]}
                      </span>

                      {/* Days indicator for current phase */}
                      {isCurrent && daysInPhase !== null && (
                        <span className="mt-1 text-[10px] text-cyan-600 dark:text-cyan-300 font-medium">
                          Day {daysInPhase + 1}
                        </span>
                      )}
                    </div>
                  </div>
                </TooltipTrigger>

                <TooltipContent
                  side="bottom"
                  className={cn(
                    'text-xs',
                    isCurrent && 'bg-cyan-950 border-cyan-800'
                  )}
                >
                  {isCompleted && (
                    <span className="text-muted-foreground">Completed</span>
                  )}
                  {isCurrent && (
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-cyan-400">Current Phase</span>
                      {daysInPhase !== null && (
                        <span className="text-cyan-300/70">{formatDuration(daysInPhase)} in this phase</span>
                      )}
                    </div>
                  )}
                  {isUpcoming && (
                    <span className="text-muted-foreground">Not started</span>
                  )}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      </div>
    </TooltipProvider>
  )
}
