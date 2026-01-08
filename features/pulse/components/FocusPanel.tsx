'use client'

import { useState, useRef } from 'react'
import { Plus, Target, Check, MoreHorizontal, Trash2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { PulseDailyTask } from '@/lib/types/pulse'

interface FocusPanelProps {
  focusTasks: PulseDailyTask[]
  onCreateFocus: (title: string) => Promise<void>
  onCompleteFocus: (taskId: string) => Promise<void>
  onUncompleteFocus: (taskId: string) => Promise<void>
  onDeleteFocus: (taskId: string) => Promise<void>
  onRenameFocus: (taskId: string, newTitle: string) => Promise<void>
}

const MAX_FOCUS_ITEMS = 3

export function FocusPanel({ focusTasks, onCreateFocus, onCompleteFocus, onUncompleteFocus, onDeleteFocus, onRenameFocus }: FocusPanelProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canAddMore = focusTasks.length < MAX_FOCUS_ITEMS

  const handleAdd = async () => {
    if (!newTitle.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onCreateFocus(newTitle.trim())
      setNewTitle('')
      setIsAdding(false)
    } catch (error) {
      console.error('Failed to create focus task:', error)
      alert('Failed to create focus task. Check console for details.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd()
    if (e.key === 'Escape') {
      setNewTitle('')
      setIsAdding(false)
    }
  }

  return (
    <Card className="p-4">
      <h2 className="text-sm font-medium text-muted-foreground mb-4">TODAY'S FOCUS</h2>

      <div className="space-y-3">
        {/* Focus items */}
        {focusTasks.map((task) => (
          <FocusCard
            key={task.id}
            task={task}
            onComplete={() => onCompleteFocus(task.id)}
            onUncomplete={() => onUncompleteFocus(task.id)}
            onDelete={() => onDeleteFocus(task.id)}
            onRename={(newTitle) => onRenameFocus(task.id, newTitle)}
          />
        ))}

        {/* Empty slots */}
        {Array.from({ length: MAX_FOCUS_ITEMS - focusTasks.length }).map((_, i) => (
          <div key={`empty-${i}`}>
            {i === 0 && canAddMore && !isAdding ? (
              <button
                onClick={() => setIsAdding(true)}
                className="w-full rounded-lg border-2 border-dashed border-muted-foreground/20 p-4 text-sm text-muted-foreground hover:border-muted-foreground/40 hover:bg-muted/30 transition-colors"
              >
                <Plus className="h-4 w-4 inline mr-2" />
                Add Focus Item
              </button>
            ) : i === 0 && isAdding ? (
              <div className="rounded-lg border-2 border-cyan-400/50 p-4">
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="What must happen today?"
                  className="mb-2"
                  autoFocus
                />
                <div className="flex gap-2">
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
              </div>
            ) : (
              <div className="rounded-lg border-2 border-dashed border-muted-foreground/10 p-4 opacity-50" />
            )}
          </div>
        ))}
      </div>

      {focusTasks.length === 0 && !isAdding && (
        <p className="text-sm text-muted-foreground mt-2">
          What are the 3 things that MUST happen today?
        </p>
      )}
    </Card>
  )
}

function FocusCard({
  task,
  onComplete,
  onUncomplete,
  onDelete,
  onRename,
}: {
  task: PulseDailyTask
  onComplete: () => void
  onUncomplete: () => void
  onDelete: () => void
  onRename: (newTitle: string) => void
}) {
  // Use ref for synchronous toggle guard (prevents rapid clicks)
  const isTogglingRef = useRef(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const isCompleted = !!task.completed_at

  const handleClick = async () => {
    // Synchronous check prevents rapid clicks
    if (isTogglingRef.current) return
    isTogglingRef.current = true
    try {
      if (isCompleted) {
        await onUncomplete()
      } else {
        await onComplete()
      }
    } finally {
      isTogglingRef.current = false
    }
  }

  const handleRename = () => {
    if (editTitle.trim() && editTitle !== task.title) {
      onRename(editTitle.trim())
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRename()
    if (e.key === 'Escape') {
      setEditTitle(task.title)
      setIsEditing(false)
    }
  }

  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-colors',
        isCompleted
          ? 'bg-cyan-950/20 border-cyan-400'
          : 'bg-card hover:border-cyan-400/50'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {isEditing ? (
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleRename}
              className="h-8"
              autoFocus
            />
          ) : (
            <h3
              className={cn(
                'font-medium',
                isCompleted && 'line-through text-muted-foreground'
              )}
            >
              {task.title}
            </h3>
          )}
          {task.linked_action_id && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Target className="h-3 w-3" />
              Linked to action
            </p>
          )}
          <p className="text-xs text-cyan-400 mt-1">⚡ 10 pts</p>
        </div>

        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            onClick={handleClick}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-md border transition-colors',
              isCompleted
                ? 'bg-cyan-400 border-cyan-400 text-cyan-950 hover:bg-cyan-500'
                : 'hover:bg-muted border-muted-foreground/20'
            )}
          >
            {isCompleted && <Check className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}
