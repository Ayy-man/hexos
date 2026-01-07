'use client'

import { useState } from 'react'
import { Plus, GripVertical } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { TaskItem } from './TaskItem'
import { reorderTasksAction } from '../actions/taskActions'
import type { PulseDailyTask } from '@/lib/types/pulse'

interface TaskListProps {
  tasks: PulseDailyTask[]
  onCreateTask: (title: string) => Promise<void>
  onUpdate: () => void
}

function SortableTaskItem({
  task,
  onUpdate,
}: {
  task: PulseDailyTask
  onUpdate: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-1">
      <button
        {...attributes}
        {...listeners}
        className="p-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1">
        <TaskItem task={task} onUpdate={onUpdate} />
      </div>
    </div>
  )
}

export function TaskList({ tasks, onCreateTask, onUpdate }: TaskListProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderedTasks, setOrderedTasks] = useState<PulseDailyTask[]>(tasks)

  // Keep orderedTasks in sync with props
  if (tasks.length !== orderedTasks.length || tasks.some((t, i) => orderedTasks[i]?.id !== t.id && !orderedTasks.find(ot => ot.id === t.id))) {
    setOrderedTasks(tasks)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = orderedTasks.findIndex((t) => t.id === active.id)
      const newIndex = orderedTasks.findIndex((t) => t.id === over.id)

      const newOrder = arrayMove(orderedTasks, oldIndex, newIndex)
      setOrderedTasks(newOrder)

      // Get the date from the first task
      const date = orderedTasks[0]?.date
      if (date) {
        await reorderTasksAction(date, newOrder.map((t) => t.id))
      }
    }
  }

  const handleAdd = async () => {
    if (!newTitle.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onCreateTask(newTitle.trim())
      setNewTitle('')
      onUpdate()
    } catch (error) {
      console.error('Failed to create task:', error)
      alert('Failed to create task. Check console for details.')
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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={orderedTasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-1">
            {orderedTasks.map((task) => (
              <SortableTaskItem key={task.id} task={task} onUpdate={onUpdate} />
            ))}

            {orderedTasks.length === 0 && !isAdding && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No tasks yet. Add one below.
              </p>
            )}
          </div>
        </SortableContext>
      </DndContext>

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
