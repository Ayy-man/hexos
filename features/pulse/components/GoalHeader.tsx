'use client'

import { useState } from 'react'
import { Target, Pencil, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { PulseGoal } from '@/lib/api/pulse-goals'
import { calculateGoalProgress } from '@/lib/api/pulse-goals'
import { createGoalAction, updateGoalAction } from '../actions/goalActions'

interface GoalHeaderProps {
  goal: PulseGoal | null
  year: number
  isAdmin?: boolean
  onUpdate?: () => void
}

export function GoalHeader({ goal, year, isAdmin = false, onUpdate }: GoalHeaderProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(goal?.title || '')
  const [targetValue, setTargetValue] = useState(goal?.target_value?.toString() || '')
  const [isSaving, setIsSaving] = useState(false)

  const progress = goal ? calculateGoalProgress(goal) : 0

  const handleSave = async () => {
    if (!title.trim()) return

    setIsSaving(true)
    try {
      if (goal) {
        await updateGoalAction(goal.id, {
          title: title.trim(),
          target_value: targetValue ? parseFloat(targetValue) : null,
        })
      } else {
        await createGoalAction({
          year,
          title: title.trim(),
          target_value: targetValue ? parseFloat(targetValue) : undefined,
        })
      }
      setIsEditing(false)
      onUpdate?.()
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setTitle(goal?.title || '')
    setTargetValue(goal?.target_value?.toString() || '')
    setIsEditing(false)
  }

  if (!goal && !isAdmin) {
    return null
  }

  if (!goal && isAdmin) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <Target className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground mb-3">
          No goal set for {year}
        </p>
        <Button size="sm" onClick={() => setIsEditing(true)}>
          Set Yearly Goal
        </Button>

        {isEditing && (
          <div className="mt-4 space-y-3 text-left">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Goal title (e.g., Hit $600k revenue)"
              autoFocus
            />
            <Input
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              placeholder="Target value (optional, e.g., 600000)"
              type="number"
            />
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={isSaving || !title.trim()}>
                Create Goal
              </Button>
              <Button variant="ghost" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      {isEditing ? (
        <div className="space-y-3">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Goal title"
            autoFocus
          />
          <div className="flex gap-2">
            <Input
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              placeholder="Target value"
              type="number"
              className="w-40"
            />
            <Button
              size="icon"
              onClick={handleSave}
              disabled={isSaving || !title.trim()}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={handleCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Target className="h-5 w-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold truncate">{goal?.title}</h2>
              {isAdmin && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 shrink-0"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
            </div>

            {goal?.target_value && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">
                    {goal.current_value?.toLocaleString() || 0} / {goal.target_value.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full transition-all',
                      progress >= 100 ? 'bg-emerald-500' : 'bg-primary'
                    )}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="text-right shrink-0">
            <p className="text-2xl font-bold">{year}</p>
            <p className="text-xs text-muted-foreground">Yearly Goal</p>
          </div>
        </div>
      )}
    </div>
  )
}
