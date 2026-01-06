'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Zap } from 'lucide-react'
import { PulseHeader } from '@/features/pulse/components/PulseHeader'
import { Heatmap } from '@/features/pulse/components/Heatmap'
import { WeekView } from '@/features/pulse/components/WeekView'
import { GoalAndTargets } from '@/features/pulse/components/GoalAndTargets'
import type { PulseStats, DailyPointsMap, PulseDailyTask, PulseTargetWithOwners, Quarter, PulseGoal } from '@/lib/types/pulse'

interface PulsePageClientProps {
  initialStats: PulseStats
  initialHeatmapData: DailyPointsMap
  initialTasks: PulseDailyTask[]
  initialTargets: PulseTargetWithOwners[]
  initialGoal: PulseGoal | null
  initialWeekStart: string
  currentQuarter: Quarter
  currentYear: number
  isAdmin: boolean
  userId: string
}

export function PulsePageClient({
  initialStats,
  initialHeatmapData,
  initialTasks,
  initialTargets,
  initialGoal,
  initialWeekStart,
  currentQuarter,
  currentYear,
  isAdmin,
  userId,
}: PulsePageClientProps) {
  const router = useRouter()
  const [weekStart, setWeekStart] = useState(initialWeekStart)

  // Refresh data when something changes
  const handleUpdate = useCallback(() => {
    router.refresh()
  }, [router])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Zap className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Pulse</h1>
          <p className="text-sm text-muted-foreground">
            Track your daily progress and quarterly targets
          </p>
        </div>
      </div>

      {/* Stats Header - Streak is hero */}
      <PulseHeader stats={initialStats} />

      {/* Heatmap - No section header */}
      <Heatmap dailyPoints={initialHeatmapData} weeks={12} />

      {/* Main Content Grid - Tasks left, Goal+Targets right */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: Week View */}
        <WeekView
          weekStart={weekStart}
          tasks={initialTasks}
          onWeekChange={setWeekStart}
          onUpdate={handleUpdate}
        />

        {/* Right Column: Goal banner + Q Targets in unified card */}
        <GoalAndTargets
          goal={initialGoal}
          targets={initialTargets}
          quarter={currentQuarter}
          year={currentYear}
          isAdmin={isAdmin}
          onUpdate={handleUpdate}
        />
      </div>
    </div>
  )
}
