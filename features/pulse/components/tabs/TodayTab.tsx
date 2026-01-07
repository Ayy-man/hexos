'use client'

import { DailyScore } from '../DailyScore'
import { TaskList } from '../TaskList'
import type { PulseStats, PulseDailyTask } from '@/lib/types/pulse'

interface TodayTabProps {
  stats: PulseStats
  tasks: PulseDailyTask[]
  onCreateTask: (title: string) => Promise<void>
  onUpdate: () => void
}

export function TodayTab({
  stats,
  tasks,
  onCreateTask,
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

      {/* Task List */}
      <TaskList
        tasks={tasks}
        onCreateTask={onCreateTask}
        onUpdate={onUpdate}
      />
    </div>
  )
}
