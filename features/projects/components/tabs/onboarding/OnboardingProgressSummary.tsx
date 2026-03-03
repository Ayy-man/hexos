'use client'

import { Progress } from '@/components/ui/progress'

interface OnboardingProgressSummaryProps {
  total: number
  completed: number
  percentage: number
}

export function OnboardingProgressSummary({
  total,
  completed,
  percentage,
}: OnboardingProgressSummaryProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          {completed}/{total} items completed
        </span>
        <span className="text-muted-foreground">{percentage}%</span>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  )
}
