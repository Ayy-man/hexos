'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Plus, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { PulseTargetWithOwners } from '@/lib/types/pulse'

interface TargetCardEnhancedProps {
  target: PulseTargetWithOwners
  isAdmin: boolean
  onUpdate: () => void
}

type HealthStatus = 'on_track' | 'at_risk' | 'off_track'

export function TargetCardEnhanced({
  target,
  isAdmin,
  onUpdate,
}: TargetCardEnhancedProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const actionsCompleted = target.actions.filter((a) => a.completed_at).length
  const totalActions = target.actions.length
  const progress = totalActions > 0 ? Math.round((actionsCompleted / totalActions) * 100) : 0

  // Calculate health status and forecast
  const { healthStatus, forecast } = useMemo(() => {
    if (totalActions === 0) {
      return { healthStatus: 'at_risk' as HealthStatus, forecast: 'No actions defined' }
    }

    const today = new Date()
    const createdAt = new Date(target.created_at)
    const dueDate = target.due_date ? new Date(target.due_date) : null

    const daysSinceCreated = Math.max(1, Math.floor((today.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)))
    const currentVelocity = actionsCompleted / daysSinceCreated

    if (!dueDate) {
      return {
        healthStatus: 'at_risk' as HealthStatus,
        forecast: 'No due date set',
      }
    }

    const daysRemaining = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    const actionsRemaining = totalActions - actionsCompleted

    if (actionsRemaining === 0) {
      const completedDate = target.completed_at ? new Date(target.completed_at) : today
      return {
        healthStatus: 'on_track' as HealthStatus,
        forecast: `✓ Completed on ${completedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      }
    }

    if (daysRemaining <= 0) {
      return {
        healthStatus: 'off_track' as HealthStatus,
        forecast: `Overdue by ${Math.abs(daysRemaining)} days`,
      }
    }

    if (currentVelocity === 0) {
      return {
        healthStatus: 'off_track' as HealthStatus,
        forecast: `Stalled — no activity in ${daysSinceCreated} days`,
      }
    }

    const requiredVelocity = actionsRemaining / daysRemaining
    const projectedDaysToComplete = actionsRemaining / currentVelocity
    const projectedCompletionDate = new Date(today.getTime() + projectedDaysToComplete * 24 * 60 * 60 * 1000)

    let healthStatus: HealthStatus
    if (currentVelocity >= requiredVelocity) {
      healthStatus = 'on_track'
    } else if (currentVelocity >= requiredVelocity * 0.5) {
      healthStatus = 'at_risk'
    } else {
      healthStatus = 'off_track'
    }

    const forecastDateStr = projectedCompletionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const dueDateStr = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

    const forecastText =
      projectedCompletionDate <= dueDate
        ? `On track for ${forecastDateStr}`
        : `At current pace, finishing ${forecastDateStr} (${Math.floor((projectedCompletionDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))} days late)`

    return { healthStatus, forecast: forecastText }
  }, [target, actionsCompleted, totalActions])

  const healthIcon = {
    on_track: '🟢',
    at_risk: '🟡',
    off_track: '🔴',
  }[healthStatus]

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="rounded-lg border bg-card">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-start gap-3 text-left hover:bg-muted/30 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 mt-1 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 mt-1 flex-shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span>{healthIcon}</span>
            <span className="font-medium truncate">{target.title}</span>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Progress value={progress} className="h-2 flex-1 max-w-[200px]" />
            <span>
              {actionsCompleted}/{totalActions} actions
            </span>
            {target.due_date && (
              <span>Due {formatDate(target.due_date)}</span>
            )}
          </div>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Actions list */}
          <div className="space-y-2 pl-7">
            {target.actions.map((action) => (
              <div
                key={action.id}
                className="flex items-center gap-2 text-sm"
              >
                <Checkbox
                  checked={!!action.completed_at}
                  disabled={!isAdmin}
                />
                <span
                  className={cn(
                    action.completed_at && 'line-through text-muted-foreground'
                  )}
                >
                  {action.title}
                </span>
                {action.due_date && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    {formatDate(action.due_date)}
                  </span>
                )}
              </div>
            ))}

            {isAdmin && (
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <Plus className="h-3 w-3 mr-1" />
                Add Action
              </Button>
            )}
          </div>

          {/* Forecast */}
          <div className="pl-7 flex items-center gap-2 text-sm text-muted-foreground">
            <Zap className="h-4 w-4 text-cyan-400" />
            <span>Forecast: {forecast}</span>
          </div>
        </div>
      )}
    </div>
  )
}
