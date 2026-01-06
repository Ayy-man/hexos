'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { isToday, isPast, getDayOfWeek } from '@/lib/utils/pulseCalculations'
import type { PulseDailyTask } from '@/lib/types/pulse'
import { TaskItem } from './TaskItem'
import { createTaskAction } from '../actions/taskActions'

interface DayColumnProps {
  date: string
  tasks: PulseDailyTask[]
  onUpdate?: () => void
  isWeekend?: boolean
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function DayColumn({ date, tasks, onUpdate, isWeekend = false }: DayColumnProps) {
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const today = isToday(date)
  const past = isPast(date)
  const dayOfWeek = getDayOfWeek(date)
  const dayName = DAY_NAMES[dayOfWeek]
  const dateNum = new Date(date + 'T00:00:00').getDate()

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
        'flex flex-col rounded-lg border p-2 min-h-[200px]',
        today && 'border-primary bg-primary/5 ring-1 ring-primary/20',
        past && !today && 'opacity-50',
        isWeekend && 'bg-muted/30'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-center w-full">
          <p className={cn(
            'text-xs font-medium',
            today && 'text-primary',
            isWeekend && !today && 'text-muted-foreground'
          )}>
            {dayName}
          </p>
          <p className={cn(
            'text-lg font-semibold leading-tight',
            today && 'text-primary'
          )}>
            {dateNum}
          </p>
        </div>
      </div>

      {today && (
        <span className="text-[9px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded text-center mb-2">
          TODAY
        </span>
      )}

      {/* Tasks */}
      <div className="flex-1 space-y-1 overflow-y-auto max-h-[180px]">
        {/* Incomplete tasks first */}
        {incompleteTasks.map((task) => (
          <TaskItem key={task.id} task={task} onUpdate={onUpdate} compact />
        ))}

        {/* Completed tasks */}
        {completedTasks.map((task) => (
          <TaskItem key={task.id} task={task} onUpdate={onUpdate} compact />
        ))}

        {/* Empty state */}
        {tasks.length === 0 && !isAddingTask && (
          <p className="text-[10px] text-muted-foreground text-center py-3">
            No tasks
          </p>
        )}
      </div>

      {/* Add task */}
      {isAddingTask ? (
        <div className="mt-2 space-y-1">
          <Input
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Task..."
            className="h-7 text-xs"
            autoFocus
            disabled={isCreating}
          />
          <div className="flex gap-1">
            <Button
              size="sm"
              className="flex-1 h-6 text-xs"
              onClick={handleAddTask}
              disabled={isCreating || !newTaskTitle.trim()}
            >
              Add
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs px-2"
              onClick={() => {
                setNewTaskTitle('')
                setIsAddingTask(false)
              }}
            >
              ✕
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full h-7 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setIsAddingTask(true)}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      )}
    </div>
  )
}
