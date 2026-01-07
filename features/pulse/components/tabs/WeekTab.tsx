'use client'

import { useState } from 'react'
import { GitHubHeatmap } from '../GitHubHeatmap'
import { WeekView } from '../WeekView'
import { WeeklyReview } from '../WeeklyReview'
import { Button } from '@/components/ui/button'
import type { DailyPointsMap, PulseDailyTask } from '@/lib/types/pulse'

interface WeekTabProps {
  heatmapData: DailyPointsMap
  tasks: PulseDailyTask[]
  weekStart: string
  onWeekChange: (start: string) => void
  onUpdate: () => void
}

export function WeekTab({
  heatmapData,
  tasks,
  weekStart,
  onWeekChange,
  onUpdate,
}: WeekTabProps) {
  const [showComparison, setShowComparison] = useState(false)

  return (
    <div className="space-y-6">
      {/* Heatmap */}
      <GitHubHeatmap dailyPoints={heatmapData} />

      {/* Week Grid with comparison toggle */}
      <div>
        <div className="flex items-center justify-end mb-4">
          <Button
            variant={showComparison ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowComparison(!showComparison)}
          >
            vs Last Week
          </Button>
        </div>

        <WeekView
          weekStart={weekStart}
          tasks={tasks}
          onWeekChange={onWeekChange}
          onUpdate={onUpdate}
        />
      </div>

      {/* Weekly Review - shows on Monday */}
      <WeeklyReview onUpdate={onUpdate} />
    </div>
  )
}
