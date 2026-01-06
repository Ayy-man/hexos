'use client'

import { Flame, TrendingUp, Calendar, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PulseStats } from '@/lib/api/pulse'
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
              ? 'bg-orange-500/10 text-orange-500'
              : 'bg-muted text-muted-foreground'
          )}
        >
          <Flame className={cn('h-5 w-5', hasActiveStreak && 'animate-pulse')} />
        </div>
        <div>
          <p className="text-2xl font-bold leading-none">
            {stats.streak}
            {hasActiveStreak && <span className="ml-1 text-orange-500">🔥</span>}
          </p>
          <p className="text-xs text-muted-foreground">day streak</p>
        </div>
      </div>

      {/* Today's Points */}
      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-500">
          <TrendingUp className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold leading-none">{stats.todayPoints}</p>
          <p className="text-xs text-muted-foreground">today</p>
        </div>
      </div>

      {/* This Week */}
      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/10 text-violet-500">
          <Calendar className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold leading-none">{stats.weekPoints}</p>
          <p className="text-xs text-muted-foreground">this week</p>
        </div>
      </div>

      {/* Average */}
      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
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
