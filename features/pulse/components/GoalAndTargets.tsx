'use client'

import { useState } from 'react'
import { Plus, Pencil, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { TargetCard } from './TargetCard'
import { getQuarterLabel, type Quarter } from '@/lib/utils/pulseCalculations'
import type { PulseGoal, PulseTargetWithOwners } from '@/lib/types/pulse'
import { createGoalAction, updateGoalAction } from '../actions/goalActions'
import { createTargetAction } from '../actions/targetActions'

interface GoalAndTargetsProps {
  goal: PulseGoal | null
  targets: PulseTargetWithOwners[]
  quarter: Quarter
  year: number
  isAdmin?: boolean
  onUpdate?: () => void
}

export function GoalAndTargets({
  goal,
  targets,
  quarter,
  year,
  isAdmin = false,
  onUpdate,
}: GoalAndTargetsProps) {
  // Goal editing state
  const [isEditingGoal, setIsEditingGoal] = useState(false)
  const [goalTitle, setGoalTitle] = useState(goal?.title || '')
  const [isSavingGoal, setIsSavingGoal] = useState(false)

  // Target adding state
  const [isAddingTarget, setIsAddingTarget] = useState(false)
  const [newTargetTitle, setNewTargetTitle] = useState('')
  const [isCreatingTarget, setIsCreatingTarget] = useState(false)

  // Separate completed and active targets
  const completedTargets = targets.filter(t => t.status === 'completed')
  const activeTargets = targets.filter(t => t.status !== 'completed')

  const handleSaveGoal = async () => {
    if (!goalTitle.trim()) return

    setIsSavingGoal(true)
    try {
      if (goal) {
        await updateGoalAction(goal.id, { title: goalTitle.trim() })
      } else {
        await createGoalAction({ year, title: goalTitle.trim() })
      }
      setIsEditingGoal(false)
      onUpdate?.()
    } finally {
      setIsSavingGoal(false)
    }
  }

  const handleCancelGoalEdit = () => {
    setGoalTitle(goal?.title || '')
    setIsEditingGoal(false)
  }

  const handleAddTarget = async () => {
    if (!newTargetTitle.trim()) return

    setIsCreatingTarget(true)
    try {
      await createTargetAction({
        quarter,
        title: newTargetTitle.trim(),
        goal_id: goal?.id,
      })
      setNewTargetTitle('')
      setIsAddingTarget(false)
      onUpdate?.()
    } finally {
      setIsCreatingTarget(false)
    }
  }

  return (
    <Card>
      {/* Goal Banner Header */}
      <div className="border-b px-4 py-3">
        {isEditingGoal ? (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground shrink-0">{year} Goal:</span>
            <Input
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveGoal()
                if (e.key === 'Escape') handleCancelGoalEdit()
              }}
              placeholder="e.g., Hit $600k revenue"
              className="h-8 text-sm flex-1"
              autoFocus
              disabled={isSavingGoal}
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={handleSaveGoal}
              disabled={isSavingGoal || !goalTitle.trim()}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={handleCancelGoalEdit}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : goal ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-medium text-muted-foreground shrink-0">{year} Goal:</span>
              <span className="font-medium truncate">{goal.title}</span>
            </div>
            {isAdmin && (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0"
                onClick={() => setIsEditingGoal(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ) : isAdmin ? (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={() => setIsEditingGoal(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Set {year} Goal
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">No goal set for {year}</p>
        )}
      </div>

      {/* Targets Section */}
      <CardContent className="pt-4">
        <h3 className="text-sm font-medium mb-3">
          {getQuarterLabel(quarter)} Targets
        </h3>

        <div className="space-y-3">
          {/* Active targets */}
          {activeTargets.map((target) => (
            <TargetCard key={target.id} target={target} onUpdate={onUpdate} />
          ))}

          {/* Completed targets */}
          {completedTargets.map((target) => (
            <TargetCard key={target.id} target={target} onUpdate={onUpdate} />
          ))}

          {/* Empty state */}
          {targets.length === 0 && !isAddingTarget && (
            <p className="text-sm text-muted-foreground text-center py-6">
              No targets for {quarter}
            </p>
          )}

          {/* Add target (admin only) */}
          {isAdmin && (
            <>
              {isAddingTarget ? (
                <div className="space-y-2">
                  <Input
                    value={newTargetTitle}
                    onChange={(e) => setNewTargetTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddTarget()
                      if (e.key === 'Escape') {
                        setNewTargetTitle('')
                        setIsAddingTarget(false)
                      }
                    }}
                    placeholder="Target title..."
                    className="text-sm"
                    autoFocus
                    disabled={isCreatingTarget}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={handleAddTarget}
                      disabled={isCreatingTarget || !newTargetTitle.trim()}
                    >
                      Add Target
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setNewTargetTitle('')
                        setIsAddingTarget(false)
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setIsAddingTarget(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Target
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
