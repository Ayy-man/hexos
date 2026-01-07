'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { PulseHeader } from '@/features/pulse/components/PulseHeader'
import { PulseTabs } from '@/features/pulse/components/PulseTabs'
import { Heatmap } from '@/features/pulse/components/Heatmap'
import { WeekView } from '@/features/pulse/components/WeekView'
import { GoalAndTargets } from '@/features/pulse/components/GoalAndTargets'
import type {
  PulseStats,
  DailyPointsMap,
  PulseDailyTask,
  PulseTargetWithOwners,
  Quarter,
  PulseGoal,
  PulseTab,
} from '@/lib/types/pulse'

interface PulsePageClientProps {
  activeTab: PulseTab
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
  lifetimePoints: number
  today: string
}

export function PulsePageClient({
  activeTab,
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
  lifetimePoints,
  today,
}: PulsePageClientProps) {
  const router = useRouter()
  const [weekStart, setWeekStart] = useState(initialWeekStart)

  const handleUpdate = useCallback(() => {
    router.refresh()
  }, [router])

  // Filter tasks for today
  const todayTasks = initialTasks.filter((t) => t.date === today)
  const focusTasks = todayTasks.filter((t) => t.is_focus)
  const regularTasks = todayTasks.filter((t) => !t.is_focus)

  return (
    <div className="space-y-6">
      {/* Persistent Header */}
      <PulseHeader stats={initialStats} lifetimePoints={lifetimePoints} />

      {/* Tab Navigation */}
      <PulseTabs activeTab={activeTab} />

      {/* Tab Content */}
      {activeTab === 'today' && (
        <div className="space-y-6">
          {/* Placeholder for Today tab components (DailyScore, FocusPanel, TaskList, QuickCapture) */}
          <div className="rounded-lg border bg-card p-6">
            <p className="text-muted-foreground">Today tab - components coming in Phase 3</p>
            <p className="text-sm mt-2">Tasks today: {todayTasks.length} ({focusTasks.length} focus, {regularTasks.length} regular)</p>
          </div>
        </div>
      )}

      {activeTab === 'week' && (
        <div className="space-y-6">
          <Heatmap dailyPoints={initialHeatmapData} weeks={12} />
          <WeekView
            weekStart={weekStart}
            tasks={initialTasks}
            onWeekChange={setWeekStart}
            onUpdate={handleUpdate}
          />
        </div>
      )}

      {activeTab === 'goals' && (
        <GoalAndTargets
          goal={initialGoal}
          targets={initialTargets}
          quarter={currentQuarter}
          year={currentYear}
          isAdmin={isAdmin}
          onUpdate={handleUpdate}
        />
      )}

      {activeTab === 'insights' && (
        <div className="rounded-lg border bg-card p-6">
          <p className="text-muted-foreground">Insights tab - components coming in Phase 6</p>
        </div>
      )}
    </div>
  )
}
