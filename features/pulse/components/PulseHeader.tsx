'use client'

import { cn } from '@/lib/utils'
import type { PulseStats } from '@/lib/types/pulse'

interface PulseHeaderProps {
  stats: PulseStats
  className?: string
}

export function PulseHeader({ stats, className }: PulseHeaderProps) {
  const hasActiveStreak = stats.streak > 0

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg border bg-card p-4',
        className
      )}
    >
      {/* Left: Streak - The Hero */}
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'text-3xl transition-all',
            hasActiveStreak && 'animate-pulse drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]'
          )}
        >
          🔥
        </span>
        <div>
          <p className="text-3xl font-bold leading-none">
            {stats.streak}
            <span className="ml-2 text-lg font-normal text-muted-foreground">
              day{stats.streak !== 1 ? 's' : ''} streak
            </span>
          </p>
        </div>
      </div>

      {/* Right: Secondary Stats */}
      <div className="flex items-center gap-6 text-right">
        <div>
          <p className="text-sm text-muted-foreground">Today</p>
          <p className="text-lg font-semibold">{stats.todayPoints} pts</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">This week</p>
          <p className="text-lg font-semibold">{stats.weekPoints}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Avg/day</p>
          <p className="text-lg font-semibold">{stats.averageDaily}</p>
        </div>
      </div>
    </div>
  )
}
