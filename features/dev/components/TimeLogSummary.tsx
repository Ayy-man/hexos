'use client'

import { Clock, Calendar, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { DailySummary, WeeklySummary, TimeEntry } from '@/lib/api/time-tracking'

interface TimeLogSummaryProps {
  dailySummary: DailySummary
  weeklySummary: WeeklySummary
  targetHoursPerWeek?: number
}

export function TimeLogSummary({
  dailySummary,
  weeklySummary,
  targetHoursPerWeek = 40,
}: TimeLogSummaryProps) {
  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    if (h > 0 && m > 0) return `${h}h ${m}m`
    if (h > 0) return `${h}h`
    return `${m}m`
  }

  const weeklyHours = weeklySummary.total_minutes / 60
  const weeklyProgress = Math.min((weeklyHours / targetHoursPerWeek) * 100, 100)

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="space-y-4">
      {/* Weekly Overview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            This Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between mb-2">
            <span className="text-3xl font-bold">
              {formatDuration(weeklySummary.total_minutes)}
            </span>
            <span className="text-sm text-muted-foreground">
              / {targetHoursPerWeek}h target
            </span>
          </div>
          <Progress value={weeklyProgress} className="h-2" />

          {/* Daily breakdown chart */}
          <div className="flex items-end justify-between gap-1 mt-4 h-20">
            {dayNames.map((day, index) => {
              // Calculate the date for this day of the week
              const weekStart = new Date(weeklySummary.week_start)
              const dayDate = new Date(weekStart)
              dayDate.setDate(weekStart.getDate() + index)
              const dateStr = dayDate.toISOString().split('T')[0]

              const dayData = weeklySummary.daily_breakdown.find(d => d.date === dateStr)
              const minutes = dayData?.minutes || 0
              const maxMinutes = Math.max(...weeklySummary.daily_breakdown.map(d => d.minutes), 480) // 8h max
              const height = minutes > 0 ? Math.max((minutes / maxMinutes) * 100, 10) : 5

              const isToday = dateStr === new Date().toISOString().split('T')[0]

              return (
                <div key={day} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-t transition-all ${
                      minutes > 0
                        ? isToday
                          ? 'bg-primary'
                          : 'bg-primary/60'
                        : 'bg-muted'
                    }`}
                    style={{ height: `${height}%` }}
                    title={`${day}: ${formatDuration(minutes)}`}
                  />
                  <span className={`text-xs ${isToday ? 'font-bold' : 'text-muted-foreground'}`}>
                    {day}
                  </span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Today's Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Today
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <span className="text-2xl font-bold">
              {formatDuration(dailySummary.total_minutes)}
            </span>
            <span className="text-sm text-muted-foreground">
              {dailySummary.entries.length} entries
            </span>
          </div>

          {dailySummary.entries.length > 0 ? (
            <div className="space-y-2">
              {dailySummary.entries.slice(0, 5).map((entry) => (
                <TimeEntryRow key={entry.id} entry={entry} />
              ))}
              {dailySummary.entries.length > 5 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{dailySummary.entries.length - 5} more entries
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No time logged today
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function TimeEntryRow({ entry }: { entry: TimeEntry }) {
  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    if (h > 0 && m > 0) return `${h}h ${m}m`
    if (h > 0) return `${h}h`
    return `${m}m`
  }

  return (
    <div className="flex items-center justify-between py-1.5 border-b last:border-0">
      <div className="flex items-center gap-2 min-w-0">
        <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        <span className="text-sm truncate">
          {entry.deliverable?.title || 'Unknown task'}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {!entry.is_manual && (
          <span className="text-xs text-muted-foreground">timer</span>
        )}
        <span className="text-sm font-medium">
          {formatDuration(entry.duration_minutes)}
        </span>
      </div>
    </div>
  )
}

// Compact version for dashboard
interface CompactTimeSummaryProps {
  totalMinutesToday: number
  totalMinutesWeek: number
}

export function CompactTimeSummary({ totalMinutesToday, totalMinutesWeek }: CompactTimeSummaryProps) {
  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">
          Today: <span className="font-medium">{formatDuration(totalMinutesToday)}</span>
        </span>
      </div>
      <div className="text-sm text-muted-foreground">
        Week: <span className="font-medium">{formatDuration(totalMinutesWeek)}</span>
      </div>
    </div>
  )
}
