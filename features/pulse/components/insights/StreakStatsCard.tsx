import { Card } from '@/components/ui/card'
import type { PulseInsights } from '@/lib/types/pulse'

interface StreakStatsCardProps {
  insights: PulseInsights
}

export function StreakStatsCard({ insights }: StreakStatsCardProps) {
  return (
    <Card className="p-6">
      <h2 className="text-sm font-medium text-muted-foreground mb-4">STREAK STATS</h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-2xl font-bold text-cyan-400">
            {insights.currentStreak} days
          </div>
          <div className="text-sm text-muted-foreground">Current</div>
        </div>

        <div>
          <div className="text-lg font-medium">{insights.longestStreak} days</div>
          <div className="text-sm text-muted-foreground">Longest</div>
        </div>

        <div>
          <div className="text-lg font-medium">{insights.streaksThisYear}</div>
          <div className="text-sm text-muted-foreground">Streaks this year</div>
        </div>

        <div>
          <div className="text-lg font-medium">{insights.averageStreakLength} days</div>
          <div className="text-sm text-muted-foreground">Avg length</div>
        </div>

        <div>
          <div className="text-lg font-medium">{insights.streakBreaks}</div>
          <div className="text-sm text-muted-foreground">Streak breaks</div>
        </div>

        <div>
          <div className="text-lg font-medium">{insights.mostCommonBreakDay || '—'}</div>
          <div className="text-sm text-muted-foreground">Most common break</div>
        </div>
      </div>
    </Card>
  )
}
