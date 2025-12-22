'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ProposalStage } from '@/lib/api/inquiries'

const STAGE_CONFIG: Record<ProposalStage, { label: string; className: string }> = {
  unopened: {
    label: 'UNOPENED',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
  },
  admin_reviewed: {
    label: 'ADMIN REVIEWED',
    className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  },
  in_queue: {
    label: 'IN QUEUE',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  },
  working: {
    label: 'WORKING',
    className: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800',
  },
  on_hold: {
    label: 'ON HOLD',
    className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  },
  final_review: {
    label: 'FINAL REVIEW',
    className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  },
  ready: {
    label: 'READY',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
  },
}

interface StageBadgeProps {
  stage: ProposalStage | null | undefined
  className?: string
}

export function StageBadge({ stage, className }: StageBadgeProps) {
  const config = STAGE_CONFIG[stage || 'unopened']

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

// Export stage order for grouping (left-to-right flow)
export const STAGE_ORDER: ProposalStage[] = [
  'unopened',
  'admin_reviewed',
  'in_queue',
  'working',
  'on_hold',
  'final_review',
  'ready',
]

export function getStageName(stage: ProposalStage | null | undefined): string {
  const config = STAGE_CONFIG[stage || 'unopened']
  return config?.label || 'Unknown'
}
