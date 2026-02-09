'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, Plus } from 'lucide-react'
import { getRetainerTasks, type RetainerTask, type TaskStatus, type TaskPriority } from '@/lib/api/retainer-tasks'
import type { ProjectWithRelations } from '@/lib/api/projects'
import type { UserRole } from '@/lib/auth/types'
import { RetainerTaskDialog } from './RetainerTaskDialog'
import { cn } from '@/lib/utils'

interface RetainerTasksTabProps {
  project: ProjectWithRelations
  userRole: UserRole
  userId: string
  availableDevs: Array<{ id: string; name: string; email: string }>
}

const statusConfig: Record<TaskStatus, { label: string; className: string }> = {
  todo: { label: 'To Do', className: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300' },
  in_progress: { label: 'In Progress', className: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300' },
  done: { label: 'Done', className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
}

const priorityConfig: Record<TaskPriority, { label: string; className: string }> = {
  low: { label: 'Low', className: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300' },
  medium: { label: 'Medium', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
  high: { label: 'High', className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
}

export function RetainerTasksTab({ project, userRole, userId, availableDevs }: RetainerTasksTabProps) {
  const [tasks, setTasks] = useState<RetainerTask[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editTask, setEditTask] = useState<RetainerTask | undefined>()
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [filterAssignee, setFilterAssignee] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [doneExpanded, setDoneExpanded] = useState(false)

  const loadTasks = async () => {
    setIsLoading(true)
    try {
      const data = await getRetainerTasks(project.id)
      setTasks(data)
    } catch (error) {
      console.error('[RetainerTasksTab] Error loading tasks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadTasks()
  }, [project.id])

  const handleTaskSuccess = () => {
    void loadTasks()
  }

  const handleEditTask = (task: RetainerTask) => {
    setEditTask(task)
    setEditDialogOpen(true)
  }

  // Filter and group tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (filterAssignee !== 'all' && task.assignee_id !== filterAssignee) return false
      if (filterPriority !== 'all' && task.priority !== filterPriority) return false
      return true
    })
  }, [tasks, filterAssignee, filterPriority])

  const groupedTasks = useMemo(() => {
    const groups: Record<TaskStatus, RetainerTask[]> = {
      todo: [],
      in_progress: [],
      done: [],
    }
    filteredTasks.forEach((task) => {
      groups[task.status].push(task)
    })
    return groups
  }, [filteredTasks])

  const counts = useMemo(() => {
    return {
      todo: groupedTasks.todo.length,
      in_progress: groupedTasks.in_progress.length,
      done: groupedTasks.done.length,
    }
  }, [groupedTasks])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Tasks</h2>
          <div className="flex gap-1.5">
            <Badge variant="outline">{counts.todo} To Do</Badge>
            <Badge variant="outline">{counts.in_progress} In Progress</Badge>
            <Badge variant="outline">{counts.done} Done</Badge>
          </div>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Task
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={filterAssignee} onValueChange={setFilterAssignee}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by assignee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assignees</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {availableDevs.map((dev) => (
              <SelectItem key={dev.id} value={dev.id}>
                {dev.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Task Sections */}
      {isLoading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          Loading tasks...
        </div>
      ) : (
        <div className="space-y-6">
          {/* To Do */}
          <TaskSection
            title="To Do"
            status="todo"
            tasks={groupedTasks.todo}
            onTaskClick={handleEditTask}
          />

          {/* In Progress */}
          <TaskSection
            title="In Progress"
            status="in_progress"
            tasks={groupedTasks.in_progress}
            onTaskClick={handleEditTask}
          />

          {/* Done (Collapsible) */}
          <Collapsible open={doneExpanded} onOpenChange={setDoneExpanded}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-medium">Done ({counts.done})</h3>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  <ChevronDown className={cn('h-4 w-4 transition-transform', doneExpanded && 'rotate-180')} />
                  {doneExpanded ? 'Hide' : 'Show'}
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <TaskSection
                status="done"
                tasks={groupedTasks.done}
                onTaskClick={handleEditTask}
              />
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {/* Dialogs */}
      <RetainerTaskDialog
        projectId={project.id}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleTaskSuccess}
        availableDevs={availableDevs}
      />

      <RetainerTaskDialog
        projectId={project.id}
        task={editTask}
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open)
          if (!open) setEditTask(undefined)
        }}
        onSuccess={handleTaskSuccess}
        availableDevs={availableDevs}
      />
    </div>
  )
}

function TaskSection({
  title,
  status,
  tasks,
  onTaskClick,
}: {
  title?: string
  status: TaskStatus
  tasks: RetainerTask[]
  onTaskClick: (task: RetainerTask) => void
}) {
  if (tasks.length === 0) {
    return (
      <div>
        {title && <h3 className="text-base font-medium mb-3">{title}</h3>}
        <div className="text-sm text-muted-foreground">No tasks</div>
      </div>
    )
  }

  return (
    <div>
      {title && <h3 className="text-base font-medium mb-3">{title}</h3>}
      <div className="space-y-2">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
        ))}
      </div>
    </div>
  )
}

function TaskCard({ task, onClick }: { task: RetainerTask; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg border p-3 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium mb-1">{task.title}</h4>
          {task.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
          )}
        </div>
        <Badge variant="outline" className={priorityConfig[task.priority].className}>
          {priorityConfig[task.priority].label}
        </Badge>
      </div>
      <div className="mt-2 text-sm text-muted-foreground">
        {task.assignee ? task.assignee.name : 'Unassigned'}
      </div>
    </button>
  )
}
