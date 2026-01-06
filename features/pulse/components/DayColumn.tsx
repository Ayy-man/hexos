'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { isToday, isPast, formatDateShort, getDayOfWeek } from '@/lib/utils/pulseCalculations'
import type { PulseDailyTask } from '@/lib/types/pulse'
import { TaskItem } from './TaskItem'
import { createTaskAction } from '../actions/taskActions'

interface DayColumnProps {
  date: string
  tasks: PulseDailyTask[]
  onUpdate?: () => void
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function DayColumn({ date, tasks, onUpdate }: DayColumnProps) {
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const today = isToday(date)
  const past = isPast(date)
  const dayOfWeek = getDayOfWeek(date)
  const dayName = DAY_NAMES[dayOfWeek]

  // Separate completed and incomplete tasks
  const incompleteTasks = tasks.filter(t => !t.completed_at)
  const completedTasks = tasks.filter(t => t.completed_at)

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return

    setIsCreating(true)
    try {
      await createTaskAction({
        date,
        title: newTaskTitle.trim(),
      })
      setNewTaskTitle('')
      setIsAddingTask(false)
      onUpdate?.()
    } finally {
      setIsCreating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTask()
    } else if (e.key === 'Escape') {
      setNewTaskTitle('')
      setIsAddingTask(false)
    }
  }

  return (
    <div
      className={cn(
        'flex flex-col min-w-[140px] rounded-lg border p-3',
        today && 'border-primary bg-primary/5',
        past && !today && 'opacity-60'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className={cn('text-sm font-medium', today && 'text-primary')}>
            {dayName}
          </p>
          <p className="text-xs text-muted-foreground">{formatDateShort(date)}</p>
        </div>
        {today && (
          <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
            TODAY
          </span>
        )}
      </div>

      {/* Tasks */}
      <div className="flex-1 space-y-1">
        {/* Incomplete tasks first */}
        {incompleteTasks.map((task) => (
          <TaskItem key={task.id} task={task} onUpdate={onUpdate} />
        ))}

        {/* Completed tasks */}
        {completedTasks.map((task) => (
          <TaskItem key={task.id} task={task} onUpdate={onUpdate} />
        ))}

        {/* Empty state */}
        {tasks.length === 0 && !isAddingTask && (
          <p className="text-xs text-muted-foreground text-center py-4">
            No tasks
          </p>
        )}
      </div>

      {/* Add task */}
      {isAddingTask ? (
        <div className="mt-2 space-y-2">
          <Input
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Task title..."
            className="h-8 text-sm"
            autoFocus
            disabled={isCreating}
          />
          <div className="flex gap-1">
            <Button
              size="sm"
              className="flex-1 h-7"
              onClick={handleAddTask}
              disabled={isCreating || !newTaskTitle.trim()}
            >
              Add
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7"
              onClick={() => {
                setNewTaskTitle('')
                setIsAddingTask(false)
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full justify-start text-muted-foreground"
          onClick={() => setIsAddingTask(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add task
        </Button>
      )}
    </div>
  )
}
