'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { PulseHeader } from '@/features/pulse/components/PulseHeader'
import { PulseTabs } from '@/features/pulse/components/PulseTabs'
import { TodayTab } from '@/features/pulse/components/tabs/TodayTab'
import { WeekTab } from '@/features/pulse/components/tabs/WeekTab'
import { GoalsTab } from '@/features/pulse/components/tabs/GoalsTab'
import { InsightsTab } from '@/features/pulse/components/tabs/InsightsTab'
import { usePulseRealtime } from '@/hooks/use-pulse-realtime'
import {
  createTaskAction,
  createFocusTaskAction,
  completeFocusTaskAction,
  uncompleteTaskAction,
} from '@/features/pulse/actions/taskActions'
import { getTodayDate } from '@/lib/utils/pulseCalculations'
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

  // Use realtime hook for live updates
  const { tasks, stats, heatmapData } = usePulseRealtime({
    userId,
    initialTasks,
    initialStats,
    initialHeatmapData,
    today,
  })

  const handleUpdate = useCallback(() => {
    router.refresh()
  }, [router])

  // Filter tasks for today
  const todayTasks = tasks.filter((t) => t.date === today)
  const focusTasks = todayTasks.filter((t) => t.is_focus)
  const regularTasks = todayTasks.filter((t) => !t.is_focus)

  // Task handlers
  const handleCreateTask = useCallback(async (title: string) => {
    await createTaskAction({ date: getTodayDate(), title })
    handleUpdate()
  }, [handleUpdate])

  const handleCreateFocus = useCallback(async (title: string) => {
    const result = await createFocusTaskAction(title)
    if (!result.success) {
      throw new Error(result.error || 'Failed to create focus task')
    }
    handleUpdate()
  }, [handleUpdate])

  const handleCompleteFocus = useCallback(async (taskId: string) => {
    const result = await completeFocusTaskAction(taskId)
    if (!result.success) {
      throw new Error(result.error || 'Failed to complete focus task')
    }
    handleUpdate()
  }, [handleUpdate])

  const handleUncompleteFocus = useCallback(async (taskId: string) => {
    const result = await uncompleteTaskAction(taskId)
    if (!result.success) {
      throw new Error(result.error || 'Failed to uncomplete focus task')
    }
    handleUpdate()
  }, [handleUpdate])

  return (
    <div className="space-y-6">
      {/* Persistent Header */}
      <PulseHeader stats={stats} lifetimePoints={lifetimePoints} />

      {/* Tab Navigation */}
      <PulseTabs activeTab={activeTab} />

      {/* Tab Content */}
      {activeTab === 'today' && (
        <TodayTab
          stats={stats}
          tasks={regularTasks}
          focusTasks={focusTasks}
          onCreateTask={handleCreateTask}
          onCreateFocus={handleCreateFocus}
          onCompleteFocus={handleCompleteFocus}
          onUncompleteFocus={handleUncompleteFocus}
          onUpdate={handleUpdate}
        />
      )}

      {activeTab === 'week' && (
        <WeekTab
          heatmapData={heatmapData}
          tasks={tasks}
          weekStart={weekStart}
          onWeekChange={setWeekStart}
          onUpdate={handleUpdate}
        />
      )}

      {activeTab === 'goals' && (
        <GoalsTab
          goal={initialGoal}
          targets={initialTargets}
          quarter={currentQuarter}
          year={currentYear}
          isAdmin={isAdmin}
          onUpdate={handleUpdate}
        />
      )}

      {activeTab === 'insights' && (
        <InsightsTab userId={userId} />
      )}
    </div>
  )
}
