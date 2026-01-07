import { Card } from '@/components/ui/card'
import { ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PulseInsights } from '@/lib/types/pulse'

interface WeeklySummaryCardProps {
  insights: PulseInsights
}

export function WeeklySummaryCard({ insights }: WeeklySummaryCardProps) {
  const getDeltaIcon = (delta: number) => {
    if (delta > 0) return <ArrowUp className="h-3 w-3 text-green-500" />
    if (delta < 0) return <ArrowDown className="h-3 w-3 text-red-500" />
    return <Minus className="h-3 w-3 text-muted-foreground" />
  }

  const getDeltaColor = (delta: number) => {
    if (delta > 0) return 'text-green-500'
    if (delta < 0) return 'text-red-500'
    return 'text-muted-foreground'
  }

  const pointsDelta = insights.weekPointsDelta
  const tasksDelta = insights.weekTasksDelta

  return (
    <Card className="p-6">
      <h2 className="text-sm font-medium text-muted-foreground mb-4">THIS WEEK&apos;S SUMMARY</h2>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm">Points earned</span>
          <span className="flex items-center gap-2">
            <span className="font-medium">{insights.weekPoints}</span>
            <span className={cn('text-sm flex items-center gap-1', getDeltaColor(pointsDelta))}>
              {getDeltaIcon(pointsDelta)}
              {Math.abs(pointsDelta)}%
            </span>
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">Tasks completed</span>
          <span className="flex items-center gap-2">
            <span className="font-medium">{insights.weekTasks}</span>
            <span className={cn('text-sm flex items-center gap-1', getDeltaColor(tasksDelta))}>
              {getDeltaIcon(tasksDelta)}
              {Math.abs(tasksDelta)}
            </span>
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">Focus items hit</span>
          <span className="font-medium">{insights.focusHitRate}%</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">Streak status</span>
          <span className="font-medium">
            {insights.currentStreak} days and counting
          </span>
        </div>

        {insights.topProject && (
          <div className="flex items-center justify-between">
            <span className="text-sm">Top project</span>
            <span className="font-medium">{insights.topProject}</span>
          </div>
        )}
      </div>
    </Card>
  )
}
