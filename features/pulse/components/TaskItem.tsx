'use client'

import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RotateCcw, Link2, Trash2, GripVertical, Pencil, X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PulseDailyTask } from '@/lib/types/pulse'
import {
  completeTaskAction,
  uncompleteTaskAction,
  deleteTaskAction,
  updateTaskAction,
} from '../actions/taskActions'

interface TaskItemProps {
  task: PulseDailyTask
  onUpdate?: () => void
  draggable?: boolean
  compact?: boolean
}

export function TaskItem({ task, onUpdate, draggable = false, compact = false }: TaskItemProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)

  // Optimistic state for instant feedback
  const [optimisticCompleted, setOptimisticCompleted] = useState<boolean | null>(null)

  const isCompleted = optimisticCompleted ?? !!task.completed_at
  const isRolledOver = !!task.rolled_from
  const isLinked = !!task.linked_action_id

  const handleToggle = async () => {
    // Prevent rapid clicks - if optimistic state is set, we're already processing
    if (optimisticCompleted !== null) return

    const wasCompleted = isCompleted
    setOptimisticCompleted(!wasCompleted) // Instant visual feedback

    try {
      if (wasCompleted) {
        await uncompleteTaskAction(task.id)
      } else {
        await completeTaskAction(task.id)
      }
      onUpdate?.()
    } catch {
      setOptimisticCompleted(null) // Revert on error
    } finally {
      // Clear optimistic state after server responds (realtime will update actual state)
      setOptimisticCompleted(null)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteTaskAction(task.id)
      onUpdate?.()
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSaveEdit = async () => {
    if (editTitle.trim() === task.title) {
      setIsEditing(false)
      return
    }

    try {
      await updateTaskAction(task.id, { title: editTitle.trim() })
      setIsEditing(false)
      onUpdate?.()
    } catch {
      setEditTitle(task.title)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      setEditTitle(task.title)
      setIsEditing(false)
    }
  }

  return (
    <div
      className={cn(
        'group flex items-center gap-1.5 rounded-md transition-colors hover:bg-muted/50',
        compact ? 'px-1 py-1' : 'px-2 py-1.5 gap-2',
        isCompleted && 'opacity-60'
      )}
    >
      {/* Drag handle */}
      {draggable && !compact && (
        <div className="cursor-grab opacity-0 group-hover:opacity-50 transition-opacity">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      {/* Checkbox */}
      <Checkbox
        checked={isCompleted}
        onCheckedChange={handleToggle}
        className={cn(
          compact ? 'h-3 w-3' : 'h-4 w-4',
          'transition-all duration-150',
          isCompleted && 'bg-cyan-500 border-cyan-500 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500'
        )}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex items-center gap-1">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              className={cn(compact ? 'h-5 text-xs' : 'h-6 text-sm')}
              autoFocus
            />
            <Button
              size="icon"
              variant="ghost"
              className={cn(compact ? 'h-5 w-5' : 'h-6 w-6')}
              onClick={handleSaveEdit}
            >
              <Check className={cn(compact ? 'h-2.5 w-2.5' : 'h-3 w-3')} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className={cn(compact ? 'h-5 w-5' : 'h-6 w-6')}
              onClick={() => {
                setEditTitle(task.title)
                setIsEditing(false)
              }}
            >
              <X className={cn(compact ? 'h-2.5 w-2.5' : 'h-3 w-3')} />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <span
              className={cn(
                'truncate',
                compact ? 'text-xs' : 'text-sm',
                isCompleted && 'line-through text-muted-foreground'
              )}
              title={task.title}
            >
              {task.title}
            </span>

            {/* Indicators */}
            {isRolledOver && (
              <span className="flex-shrink-0 text-warning" title="Rolled from yesterday">
                <RotateCcw className={cn(compact ? 'h-2.5 w-2.5' : 'h-3 w-3')} />
              </span>
            )}
            {isLinked && (
              <span className="flex-shrink-0 text-info" title="Linked to action">
                <Link2 className={cn(compact ? 'h-2.5 w-2.5' : 'h-3 w-3')} />
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      {!isEditing && !compact && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Compact mode: show delete on hover */}
      {!isEditing && compact && (
        <Button
          size="icon"
          variant="ghost"
          className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          <X className="h-2.5 w-2.5" />
        </Button>
      )}
    </div>
  )
}
