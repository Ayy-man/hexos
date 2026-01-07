'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { PulseGoal } from '@/lib/types/pulse'

interface YearlyGoalCardProps {
  goal: PulseGoal | null
  year: number
  isAdmin: boolean
  onUpdate: () => void
}

export function YearlyGoalCard({ goal, year, isAdmin, onUpdate }: YearlyGoalCardProps) {
  const [isEditing, setIsEditing] = useState(false)

  if (!goal) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-muted-foreground">{year} GOAL</h2>
          {isAdmin && (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              <Pencil className="h-4 w-4 mr-1" />
              Set Goal
            </Button>
          )}
        </div>
        <p className="text-muted-foreground">No yearly goal set yet.</p>
      </Card>
    )
  }

  const currentValue = goal.current_value || 0
  const targetValue = goal.target_value || 1
  const percentage = Math.min(Math.round((currentValue / targetValue) * 100), 100)

  // Format values (assuming they're currency)
  const formatValue = (v: number) => {
    if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`
    return `$${v}`
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-muted-foreground">{year} GOAL</h2>
        {isAdmin && (
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </div>

      <h3 className="text-xl font-semibold mb-4">{goal.title}</h3>

      <div className="space-y-2">
        <Progress value={percentage} className="h-3" />
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {formatValue(currentValue)} / {formatValue(targetValue)}
          </span>
          <span className="font-medium">{percentage}% complete</span>
        </div>
      </div>
    </Card>
  )
}
