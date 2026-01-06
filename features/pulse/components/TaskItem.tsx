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
}

export function TaskItem({ task, onUpdate, draggable = false }: TaskItemProps) {
  const [isCompleting, setIsCompleting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)

  const isCompleted = !!task.completed_at
  const isRolledOver = !!task.rolled_from
  const isLinked = !!task.linked_action_id

  const handleToggle = async () => {
    setIsCompleting(true)
    try {
      if (isCompleted) {
        await uncompleteTaskAction(task.id)
      } else {
        await completeTaskAction(task.id)
      }
      onUpdate?.()
    } finally {
      setIsCompleting(false)
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
        'group flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors',
        'hover:bg-muted/50',
        isCompleted && 'opacity-60'
      )}
    >
      {/* Drag handle */}
      {draggable && (
        <div className="cursor-grab opacity-0 group-hover:opacity-50 transition-opacity">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      {/* Checkbox */}
      <Checkbox
        checked={isCompleted}
        onCheckedChange={handleToggle}
        disabled={isCompleting}
        className="h-4 w-4"
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex items-center gap-1">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-6 text-sm"
              autoFocus
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={handleSaveEdit}
            >
              <Check className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => {
                setEditTitle(task.title)
                setIsEditing(false)
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-sm truncate',
                isCompleted && 'line-through text-muted-foreground'
              )}
            >
              {task.title}
            </span>

            {/* Indicators */}
            {isRolledOver && (
              <span className="flex items-center text-xs text-warning" title="Rolled from yesterday">
                <RotateCcw className="h-3 w-3 mr-0.5" />
              </span>
            )}
            {isLinked && (
              <span className="flex items-center text-xs text-info" title="Linked to action">
                <Link2 className="h-3 w-3" />
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      {!isEditing && (
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
    </div>
  )
}
