'use client'

import { cn } from '@/lib/utils'
import type { PulseStats } from '@/lib/types/pulse'

interface DailyScoreProps {
  stats: PulseStats
  dailyGoal?: number
  tasksCompleted: number
  tasksRemaining: number
}

export function DailyScore({
  stats,
  dailyGoal = 25,
  tasksCompleted,
  tasksRemaining,
}: DailyScoreProps) {
  const percentage = Math.min(Math.round((stats.todayPoints / dailyGoal) * 100), 100)
  const displayPercentage = Math.round((stats.todayPoints / dailyGoal) * 100)

  // SVG circle calculations
  const size = 120
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  // Color based on percentage
  const getColor = () => {
    if (displayPercentage >= 100) return 'text-green-500'
    if (displayPercentage >= 80) return 'text-cyan-400'
    if (displayPercentage >= 50) return 'text-yellow-500'
    return 'text-muted-foreground'
  }

  return (
    <div className="rounded-lg border bg-gradient-to-br from-card to-card/80 p-6">
      <h2 className="text-sm font-medium text-muted-foreground mb-4">DAILY SCORE</h2>

      <div className="flex items-center gap-8">
        {/* Circular Progress */}
        <div className="relative">
          <svg width={size} height={size} className="transform -rotate-90">
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-muted/20"
            />
            {/* Progress circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className={cn(
                'transition-all duration-500 ease-out',
                getColor(),
                displayPercentage >= 100 && 'drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]'
              )}
            />
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn('text-3xl font-bold', getColor())}>
              {displayPercentage}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-2">
          <div className="text-sm">
            <span className="font-medium">{stats.todayPoints} pts</span>
            <span className="text-muted-foreground"> earned</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {dailyGoal} pt goal
          </div>
          <div className="text-sm">
            <span className="font-medium">{tasksCompleted} tasks</span>
            <span className="text-muted-foreground"> done</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {tasksRemaining} remaining
          </div>
        </div>
      </div>
    </div>
  )
}
