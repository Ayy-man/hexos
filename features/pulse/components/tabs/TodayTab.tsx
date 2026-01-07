'use client'

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

export function TodayTab({
  stats,
  tasks,
  focusTasks,
  onCreateTask,
  onCreateFocus,
  onCompleteFocus,
  onUpdate,
}: TodayTabProps) {
  const completedTasks = tasks.filter((t) => t.completed_at).length
  const remainingTasks = tasks.filter((t) => !t.completed_at).length

  return (
    <div className="space-y-6">
      {/* Daily Score */}
      <DailyScore
        stats={stats}
        dailyGoal={25}
        tasksCompleted={completedTasks}
        tasksRemaining={remainingTasks}
      />

      {/* Focus + Tasks Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <FocusPanel
          focusTasks={focusTasks}
          onCreateFocus={onCreateFocus}
          onCompleteFocus={onCompleteFocus}
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
