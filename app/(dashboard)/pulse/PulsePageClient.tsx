'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PulseHeader } from '@/features/pulse/components/PulseHeader'
import { Heatmap } from '@/features/pulse/components/Heatmap'
import { WeekView } from '@/features/pulse/components/WeekView'
import { QuarterTargets } from '@/features/pulse/components/QuarterTargets'
import { GoalHeader } from '@/features/pulse/components/GoalHeader'
import type { PulseStats, DailyPointsMap } from '@/lib/api/pulse'
import type { PulseDailyTask } from '@/lib/api/pulse-tasks'
import type { PulseTargetWithOwners, Quarter } from '@/lib/api/pulse-targets'
import type { PulseGoal } from '@/lib/api/pulse-goals'

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

      {/* Stats Header */}
      <PulseHeader stats={initialStats} />

      {/* Heatmap */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <Heatmap dailyPoints={initialHeatmapData} weeks={12} />
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: Week View */}
        <div className="space-y-6">
          <WeekView
            weekStart={weekStart}
            tasks={initialTasks}
            onWeekChange={setWeekStart}
            onUpdate={handleUpdate}
          />
        </div>

        {/* Right Column: Goal & Targets */}
        <div className="space-y-6">
          <GoalHeader
            goal={initialGoal}
            year={currentYear}
            isAdmin={isAdmin}
            onUpdate={handleUpdate}
          />

          <QuarterTargets
            targets={initialTargets}
            quarter={currentQuarter}
            goalId={initialGoal?.id}
            isAdmin={isAdmin}
            onUpdate={handleUpdate}
          />
        </div>
      </div>
    </div>
  )
}
