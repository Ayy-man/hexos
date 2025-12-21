'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ProposalStage } from '@/lib/api/inquiries'

const STAGE_CONFIG: Record<ProposalStage, { label: string; className: string }> = {
  pending: {
    label: 'PENDING',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
  },
  proposal_sent: {
    label: 'PROPOSAL SENT',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  },
  proposal_verify: {
    label: 'PROPOSAL VERIFY',
    className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  },
  on_hold: {
    label: 'ON HOLD',
    className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  },
  agreed: {
    label: 'AGREED',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
  },
}

interface StageBadgeProps {
  stage: ProposalStage | null | undefined
  className?: string
}

export function StageBadge({ stage, className }: StageBadgeProps) {
  const config = STAGE_CONFIG[stage || 'pending']

  return (
    <Badge
      variant="outline"
      className={cn(
        'text-xs font-semibold uppercase tracking-wide',
        config.className,
        className
      )}
    >
      {config.label}
    </Badge>
  )
}

// Export stage order for grouping
export const STAGE_ORDER: ProposalStage[] = [
  'agreed',
  'proposal_sent',
  'proposal_verify',
  'on_hold',
  'pending',
]

export function getStageName(stage: ProposalStage): string {
  return STAGE_CONFIG[stage].label
}
