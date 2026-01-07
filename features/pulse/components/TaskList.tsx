'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { TaskItem } from './TaskItem'
import type { PulseDailyTask } from '@/lib/types/pulse'

interface TaskListProps {
  tasks: PulseDailyTask[]
  onCreateTask: (title: string) => Promise<void>
  onUpdate: () => void
}

export function TaskList({ tasks, onCreateTask, onUpdate }: TaskListProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Filter out focus tasks (they're shown in FocusPanel)
  const regularTasks = tasks.filter((t) => !t.is_focus)

  const handleAdd = async () => {
    if (!newTitle.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onCreateTask(newTitle.trim())
      setNewTitle('')
      // Keep input open for rapid entry
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdd()
    } else if (e.key === 'Escape') {
      setNewTitle('')
      setIsAdding(false)
    }
  }

  return (
    <Card className="p-4">
      <h2 className="text-sm font-medium text-muted-foreground mb-4">TASK LIST</h2>

      <div className="space-y-1">
        {regularTasks.map((task) => (
          <TaskItem key={task.id} task={task} onUpdate={onUpdate} />
        ))}

        {regularTasks.length === 0 && !isAdding && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No tasks yet. Add one below.
          </p>
        )}
      </div>

      {/* Add task */}
      <div className="mt-4">
        {isAdding ? (
          <div className="flex gap-2">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Task title..."
              className="flex-1"
              autoFocus
            />
            <Button size="sm" onClick={handleAdd} disabled={isSubmitting}>
              Add
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setNewTitle('')
                setIsAdding(false)
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add task
          </Button>
        )}
      </div>
    </Card>
  )
}
