'use client'

import { Flame, TrendingUp, Calendar, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PulseStats } from '@/lib/types/pulse'
import { formatPoints, formatStreak } from '@/lib/utils/pulseCalculations'

interface PulseHeaderProps {
  stats: PulseStats
  className?: string
}

export function PulseHeader({ stats, className }: PulseHeaderProps) {
  const hasActiveStreak = stats.streak > 0

  return (
    <div className={cn('flex flex-wrap items-center gap-6', className)}>
      {/* Streak */}
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full',
            hasActiveStreak
              ? 'bg-warning/10 text-warning'
              : 'bg-muted text-muted-foreground'
          )}
        >
          <Flame className={cn('h-5 w-5', hasActiveStreak && 'animate-pulse')} />
        </div>
        <div>
          <p className="text-2xl font-bold leading-none">
            {stats.streak}
            {hasActiveStreak && <span className="ml-1 text-warning">🔥</span>}
          </p>
          <p className="text-xs text-muted-foreground">day streak</p>
        </div>
      </div>

      {/* Today's Points */}
      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-info/10 text-info">
          <TrendingUp className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold leading-none">{stats.todayPoints}</p>
          <p className="text-xs text-muted-foreground">today</p>
        </div>
      </div>

      {/* This Week */}
      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Calendar className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold leading-none">{stats.weekPoints}</p>
          <p className="text-xs text-muted-foreground">this week</p>
        </div>
      </div>

      {/* Average */}
      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10 text-success">
          <Trophy className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold leading-none">{stats.averageDaily}</p>
          <p className="text-xs text-muted-foreground">avg/day</p>
        </div>
      </div>
    </div>
  )
}
