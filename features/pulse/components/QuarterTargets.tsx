'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TargetCard } from './TargetCard'
import { getCurrentQuarter, getQuarterLabel, type Quarter } from '@/lib/utils/pulseCalculations'
import type { PulseTargetWithOwners } from '@/lib/api/pulse-targets'
import { createTargetAction } from '../actions/targetActions'

interface QuarterTargetsProps {
  targets: PulseTargetWithOwners[]
  quarter?: Quarter
  goalId?: string
  isAdmin?: boolean
  onUpdate?: () => void
}

export function QuarterTargets({
  targets,
  quarter = getCurrentQuarter(),
  goalId,
  isAdmin = false,
  onUpdate,
}: QuarterTargetsProps) {
  const [isAddingTarget, setIsAddingTarget] = useState(false)
  const [newTargetTitle, setNewTargetTitle] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const handleAddTarget = async () => {
    if (!newTargetTitle.trim()) return

    setIsCreating(true)
    try {
      await createTargetAction({
        quarter,
        title: newTargetTitle.trim(),
        goal_id: goalId,
      })
      setNewTargetTitle('')
      setIsAddingTarget(false)
      onUpdate?.()
    } finally {
      setIsCreating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAddTarget()
    if (e.key === 'Escape') {
      setNewTargetTitle('')
      setIsAddingTarget(false)
    }
  }

  // Separate completed and in-progress targets
  const completedTargets = targets.filter(t => t.status === 'completed')
  const activeTargets = targets.filter(t => t.status !== 'completed')

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">
          {getQuarterLabel(quarter)} Targets
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
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
                  onKeyDown={handleKeyDown}
                  placeholder="Target title..."
                  className="text-sm"
                  autoFocus
                  disabled={isCreating}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={handleAddTarget}
                    disabled={isCreating || !newTargetTitle.trim()}
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
      </CardContent>
    </Card>
  )
}
