'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { StreakStatsCard } from '../insights/StreakStatsCard'
import { PersonalRecordsCard } from '../insights/PersonalRecordsCard'
import { TaskCompletionChart } from '../insights/TaskCompletionChart'
import { WeeklySummaryCard } from '../insights/WeeklySummaryCard'
import { getInsightsData } from '../../actions/insightsActions'
import type { PulseInsights } from '@/lib/types/pulse'

interface InsightsTabProps {
  userId: string
}

export function InsightsTab({ userId }: InsightsTabProps) {
  const [insights, setInsights] = useState<PulseInsights | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getInsightsData().then((data) => {
      setInsights(data)
      setIsLoading(false)
    })
  }, [])

  if (isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="h-48 animate-pulse bg-muted/50" />
        ))}
      </div>
    )
  }

  if (!insights) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground text-center">
          Not enough data yet. Complete some tasks to see insights!
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top row: Streak stats + Personal records */}
      <div className="grid gap-6 lg:grid-cols-2">
        <StreakStatsCard insights={insights} />
        <PersonalRecordsCard insights={insights} />
      </div>

      {/* Task completion breakdown */}
      <TaskCompletionChart insights={insights} />

      {/* Weekly summary */}
      <WeeklySummaryCard insights={insights} />
    </div>
  )
}
