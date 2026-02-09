'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { createTaskAction } from '../actions/taskActions'
import { TaskRow } from './task-row'
import { TaskImportDialog } from './task-import-dialog'
import { TaskExportButton } from './task-export-button'
import type { MeetingTask, MeetingTaskStatus, MeetingTaskPriority } from '@/lib/types/meetings'
import { Plus, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TaskListProps {
  tasks: MeetingTask[]
  meetingId: string
}

export function TaskList({ tasks, meetingId }: TaskListProps) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<MeetingTaskStatus | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<MeetingTaskPriority | 'all'>('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    if (statusFilter !== 'all' && task.status !== statusFilter) return false
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false
    return true
  })

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) {
      toast.error('Please enter a task title')
      return
    }

    setIsCreating(true)
    try {
      const result = await createTaskAction({
        title: newTaskTitle,
        meeting_id: meetingId,
      })

      if (result.success) {
        toast.success('Task created')
        setNewTaskTitle('')
        setShowAddForm(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to create task')
      }
    } catch (error) {
      console.error('Failed to create task:', error)
      toast.error('Failed to create task')
    } finally {
      setIsCreating(false)
    }
  }

  const getStatusCount = (status: MeetingTaskStatus): number => {
    return tasks.filter((t) => t.status === status).length
  }

  const statusOptions: { value: MeetingTaskStatus | 'all'; label: string }[] = [
    { value: 'all', label: `All (${tasks.length})` },
    { value: 'pending', label: `Pending (${getStatusCount('pending')})` },
    { value: 'in_progress', label: `In Progress (${getStatusCount('in_progress')})` },
    { value: 'done', label: `Done (${getStatusCount('done')})` },
  ]

  const priorityOptions: { value: MeetingTaskPriority | 'all'; label: string }[] = [
    { value: 'all', label: 'All Priorities' },
    { value: 'urgent', label: 'Urgent' },
    { value: 'high', label: 'High' },
    { value: 'normal', label: 'Normal' },
    { value: 'low', label: 'Low' },
  ]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Tasks</CardTitle>
          <div className="flex items-center gap-2">
            <TaskImportDialog meetingId={meetingId} />
            <TaskExportButton meetingId={meetingId} />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 pt-4">
          <div className="flex gap-1">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setStatusFilter(option.value)}
                className={cn(
                  'px-3 py-1 text-sm rounded-md transition-colors',
                  statusFilter === option.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex gap-1">
            {priorityOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setPriorityFilter(option.value)}
                className={cn(
                  'px-3 py-1 text-sm rounded-md transition-colors',
                  priorityFilter === option.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Add Task Form */}
        {showAddForm ? (
          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <Input
              placeholder="Task title"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleCreateTask()
                }
                if (e.key === 'Escape') {
                  setShowAddForm(false)
                  setNewTaskTitle('')
                }
              }}
              disabled={isCreating}
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleCreateTask}
                disabled={isCreating || !newTaskTitle.trim()}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Task
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowAddForm(false)
                  setNewTaskTitle('')
                }}
                disabled={isCreating}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddForm(true)}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        )}

        {/* Task List */}
        {filteredTasks.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            {tasks.length === 0 ? (
              <div>
                <p>No tasks yet.</p>
                <p className="text-sm mt-1">
                  Tasks will appear here after meeting processing, or you can add them
                  manually.
                </p>
              </div>
            ) : (
              <p>No tasks match the current filters.</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onUpdate={() => router.refresh()}
                onDelete={() => router.refresh()}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
