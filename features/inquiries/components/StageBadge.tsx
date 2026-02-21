'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ProposalStage } from '@/lib/api/inquiries'

const STAGE_CONFIG: Record<ProposalStage, { label: string; dfyLabel?: string; className: string }> = {
  unopened: {
    label: 'UNOPENED',
    className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300/90 dark:border-red-500/20',
  },
  admin_reviewed: {
    label: 'ADMIN REVIEWED',
    className: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-300/90 dark:border-purple-500/20',
  },
  in_queue: {
    label: 'IN QUEUE',
    className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300/90 dark:border-blue-500/20',
  },
  working: {
    label: 'WORKING',
    className: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-300/90 dark:border-cyan-500/20',
  },
  on_hold: {
    label: 'ON HOLD',
    className: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-300/90 dark:border-orange-500/20',
  },
  final_review: {
    label: 'FINAL REVIEW',
    className: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-300/90 dark:border-yellow-500/20',
  },
  ready: {
    label: 'READY',
    className: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-300/90 dark:border-green-500/20',
  },
  sent: {
    label: 'SENT',
    dfyLabel: 'READY',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300/90 dark:border-emerald-500/20',
  },
  closed: {
    label: 'CLOSED',
    dfyLabel: 'WON',
    className: 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-300/90 dark:border-teal-500/20',
  },
  lost: {
    label: 'LOST',
    className: 'bg-stone-100 text-stone-700 border-stone-200 dark:bg-stone-500/10 dark:text-stone-300/90 dark:border-stone-500/20',
  },
}

interface StageBadgeProps {
  stage: ProposalStage | null | undefined
  className?: string
  viewAs?: 'admin' | 'dfy'
}

export function StageBadge({ stage, className, viewAs = 'admin' }: StageBadgeProps) {
  const config = STAGE_CONFIG[stage || 'unopened']
  const label = viewAs === 'dfy' && config.dfyLabel ? config.dfyLabel : config.label

  return (
    <Badge
      variant="outline"
      className={cn(
        'text-xs font-semibold uppercase tracking-wide',
        config.className,
        className
      )}
    >
      {label}
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
  'sent',
  'closed',
  'lost',
]

export function getStageName(stage: ProposalStage | null | undefined, viewAs: 'admin' | 'dfy' = 'admin'): string {
  const config = STAGE_CONFIG[stage || 'unopened']
  if (!config) return 'Unknown'
  return viewAs === 'dfy' && config.dfyLabel ? config.dfyLabel : config.label
}
