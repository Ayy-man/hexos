'use client'

import { Flame, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PulseStats, LevelInfo } from '@/lib/types/pulse'
import { calculateLevel } from '@/lib/utils/pulseCalculations'

interface PulseHeaderProps {
  stats: PulseStats
  lifetimePoints: number
}

export function PulseHeader({ stats, lifetimePoints }: PulseHeaderProps) {
  const level = calculateLevel(lifetimePoints)

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="h-5 w-5 text-primary" />
        <span className="text-lg font-semibold">Pulse</span>
      </div>

      <div className="flex items-center justify-between">
        {/* Streak */}
        <div className="flex items-center gap-2">
          <StreakFire streak={stats.streak} />
          <div>
            <span className="text-2xl font-bold text-cyan-400">{stats.streak}</span>
            <span className="text-sm text-muted-foreground ml-1">day streak</span>
          </div>
        </div>

        {/* Divider */}
        <div className="h-10 w-px bg-border" />

        {/* Today Points */}
        <div className="text-center">
          <div className="text-sm text-muted-foreground">Today</div>
          <div className="font-medium">{stats.todayPoints} pts</div>
        </div>

        {/* Divider */}
        <div className="h-10 w-px bg-border" />

        {/* Level */}
        <div className="text-right">
          <div className="font-medium">Level {level.level}</div>
          <div className="text-sm text-muted-foreground">
            {lifetimePoints.toLocaleString()} lifetime
          </div>
        </div>
      </div>
    </div>
  )
}

function StreakFire({ streak }: { streak: number }) {
  // Scale fire animation based on streak length
  const getFireConfig = () => {
    if (streak >= 50) return { emoji: '💙', className: 'animate-pulse text-2xl' }
    if (streak >= 30) return { emoji: '🔥🔥🔥', className: 'streak-fire-intense text-xl' }
    if (streak >= 15) return { emoji: '🔥🔥', className: 'streak-fire text-xl' }
    if (streak >= 8) return { emoji: '🔥', className: 'streak-fire text-xl' }
    return { emoji: '🔥', className: 'text-xl' }
  }

  const config = getFireConfig()

  return (
    <span className={cn(config.className)} role="img" aria-label="streak fire">
      {config.emoji}
    </span>
  )
}
