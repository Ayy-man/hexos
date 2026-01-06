'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Check, Circle, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { PulseTargetWithOwners, PulseAction } from '@/lib/api/pulse-targets'
import { calculateTargetProgress } from '@/lib/api/pulse-targets'
import {
  createActionAction,
  completeActionAction,
  uncompleteActionAction,
  deleteActionAction,
} from '../actions/targetActions'

interface TargetCardProps {
  target: PulseTargetWithOwners
  onUpdate?: () => void
}

export function TargetCard({ target, onUpdate }: TargetCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isAddingAction, setIsAddingAction] = useState(false)
  const [newActionTitle, setNewActionTitle] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const progress = calculateTargetProgress(target)
  const isCompleted = target.status === 'completed'

  const handleAddAction = async () => {
    if (!newActionTitle.trim()) return

    setIsCreating(true)
    try {
      await createActionAction({
        target_id: target.id,
        title: newActionTitle.trim(),
      })
      setNewActionTitle('')
      setIsAddingAction(false)
      onUpdate?.()
    } finally {
      setIsCreating(false)
    }
  }

  const handleToggleAction = async (action: PulseAction) => {
    if (action.completed_at) {
      await uncompleteActionAction(action.id)
    } else {
      await completeActionAction(action.id)
    }
    onUpdate?.()
  }

  const handleDeleteAction = async (actionId: string) => {
    await deleteActionAction(actionId)
    onUpdate?.()
  }

  return (
    <div
      className={cn(
        'rounded-lg border p-3 transition-colors',
        isCompleted && 'bg-emerald-500/5 border-emerald-500/20'
      )}
    >
      {/* Header */}
      <div
        className="flex items-start gap-2 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 shrink-0"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p
              className={cn(
                'font-medium text-sm truncate',
                isCompleted && 'text-emerald-600 dark:text-emerald-400'
              )}
            >
              {target.title}
            </p>
            {isCompleted && (
              <Check className="h-4 w-4 text-emerald-500 shrink-0" />
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all',
                isCompleted ? 'bg-emerald-500' : 'bg-primary'
              )}
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Meta */}
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              {target.actions.filter(a => a.completed_at).length}/{target.actions.length} actions
            </span>
            {target.owners.length > 0 && (
              <>
                <span>·</span>
                <span>{target.owners.map(o => o.name.split(' ')[0]).join(', ')}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-3 ml-7 space-y-2">
          {/* Actions list */}
          {target.actions.map((action) => (
            <div
              key={action.id}
              className="group flex items-center gap-2 py-1"
            >
              <button
                onClick={() => handleToggleAction(action)}
                className={cn(
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors',
                  action.completed_at
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'border-muted-foreground/30 hover:border-primary'
                )}
              >
                {action.completed_at && <Check className="h-3 w-3" />}
              </button>
              <span
                className={cn(
                  'text-sm flex-1',
                  action.completed_at && 'line-through text-muted-foreground'
                )}
              >
                {action.title}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleDeleteAction(action.id)}
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          ))}

          {/* Add action */}
          {isAddingAction ? (
            <div className="flex items-center gap-2">
              <Circle className="h-4 w-4 text-muted-foreground/30" />
              <Input
                value={newActionTitle}
                onChange={(e) => setNewActionTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddAction()
                  if (e.key === 'Escape') {
                    setNewActionTitle('')
                    setIsAddingAction(false)
                  }
                }}
                placeholder="Action title..."
                className="h-7 text-sm flex-1"
                autoFocus
                disabled={isCreating}
              />
              <Button
                size="sm"
                className="h-7"
                onClick={handleAddAction}
                disabled={isCreating || !newActionTitle.trim()}
              >
                Add
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-muted-foreground"
              onClick={() => setIsAddingAction(true)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add action
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
