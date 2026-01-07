'use client'

import { useState, useCallback, useEffect } from 'react'
import { DailyScore } from '../DailyScore'
import { FocusPanel } from '../FocusPanel'
import { TaskList } from '../TaskList'
import { QuickCapture } from '../QuickCapture'
import type { PulseStats, PulseDailyTask } from '@/lib/types/pulse'

interface TodayTabProps {
  stats: PulseStats
  tasks: PulseDailyTask[]
  focusTasks: PulseDailyTask[]
  onCreateTask: (title: string) => Promise<void>
  onCreateFocus: (title: string) => Promise<void>
  onCompleteFocus: (taskId: string) => Promise<void>
  onUpdate: () => void
}

// Points per task type
const REGULAR_TASK_POINTS = 3
const FOCUS_TASK_POINTS = 10

export function TodayTab({
  stats,
  tasks,
  focusTasks,
  onCreateTask,
  onCreateFocus,
  onCompleteFocus,
  onUpdate,
}: TodayTabProps) {
  // Optimistic points tracking
  const [optimisticPoints, setOptimisticPoints] = useState(0)

  // Reset optimistic points when stats update from server
  useEffect(() => {
    setOptimisticPoints(0)
  }, [stats.todayPoints])

  const completedTasks = tasks.filter((t) => t.completed_at).length
  const remainingTasks = tasks.filter((t) => !t.completed_at).length

  // Wrap onCompleteFocus with optimistic update
  const handleCompleteFocus = useCallback(async (taskId: string) => {
    setOptimisticPoints((prev) => prev + FOCUS_TASK_POINTS)
    try {
      await onCompleteFocus(taskId)
    } catch {
      setOptimisticPoints((prev) => prev - FOCUS_TASK_POINTS)
    }
  }, [onCompleteFocus])

  // Create optimistic stats
  const optimisticStats = {
    ...stats,
    todayPoints: stats.todayPoints + optimisticPoints,
  }

  return (
    <div className="space-y-6">
      {/* Daily Score */}
      <DailyScore
        stats={optimisticStats}
        dailyGoal={25}
        tasksCompleted={completedTasks}
        tasksRemaining={remainingTasks}
      />

      {/* Focus + Tasks Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <FocusPanel
          focusTasks={focusTasks}
          onCreateFocus={onCreateFocus}
          onCompleteFocus={handleCompleteFocus}
        />
        <TaskList
          tasks={tasks}
          onCreateTask={onCreateTask}
          onUpdate={onUpdate}
        />
      </div>

      {/* Quick Capture */}
      <QuickCapture onCapture={onCreateTask} />
    </div>
  )
}
