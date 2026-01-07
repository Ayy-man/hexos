'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface GitHubHeatmapProps {
  dailyPoints: Record<string, number>
  weeks?: number
}

// GitHub-style colors (cyan theme)
const COLORS = {
  empty: '#161b22',      // No activity
  level1: '#0e4429',     // 1-9 pts
  level2: '#006d32',     // 10-24 pts
  level3: '#26a641',     // 25-49 pts
  level4: '#39d353',     // 50+ pts
}

function getColor(points: number): string {
  if (points === 0) return COLORS.empty
  if (points < 10) return COLORS.level1
  if (points < 25) return COLORS.level2
  if (points < 50) return COLORS.level3
  return COLORS.level4
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function getMonthLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short' })
}

function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export function GitHubHeatmap({ dailyPoints }: GitHubHeatmapProps) {
  const [selectedDay, setSelectedDay] = useState<{ date: string; points: number } | null>(null)

  const { grid, monthLabels } = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Start from January 1, 2026
    const startDate = new Date(2026, 0, 1) // Jan 1, 2026

    // Find the Sunday before or on Jan 1
    const startDayOfWeek = startDate.getDay()
    if (startDayOfWeek !== 0) {
      startDate.setDate(startDate.getDate() - startDayOfWeek)
    }

    // End date is Saturday of current week
    const dayOfWeek = today.getDay()
    const endDate = new Date(today)
    endDate.setDate(today.getDate() + (6 - dayOfWeek))

    // Build the grid: array of weeks, each week is array of 7 days
    const grid: Array<Array<{ date: string; points: number; isToday: boolean; isFuture: boolean }>> = []
    const monthLabels: Array<{ label: string; colStart: number }> = []

    let currentDate = new Date(startDate)
    let currentMonth = -1
    let weekIndex = 0

    while (currentDate <= endDate) {
      const week: Array<{ date: string; points: number; isToday: boolean; isFuture: boolean }> = []

      for (let day = 0; day < 7; day++) {
        const dateStr = formatDate(currentDate)
        const isToday = dateStr === formatDate(today)
        const isFuture = currentDate > today

        // Track month changes for labels
        if (currentDate.getMonth() !== currentMonth && day === 0) {
          currentMonth = currentDate.getMonth()
          monthLabels.push({
            label: getMonthLabel(currentDate),
            colStart: weekIndex,
          })
        }

        week.push({
          date: dateStr,
          points: dailyPoints[dateStr] || 0,
          isToday,
          isFuture,
        })

        currentDate.setDate(currentDate.getDate() + 1)
      }

      grid.push(week)
      weekIndex++
    }

    return { grid, monthLabels }
  }, [dailyPoints])

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="rounded-lg border bg-card p-4">
      {/* Month labels */}
      <div className="flex mb-2 ml-8 text-xs text-muted-foreground">
        {monthLabels.map((m, i) => (
          <div
            key={i}
            style={{
              marginLeft: i === 0 ? `${m.colStart * 13}px` : `${(m.colStart - (monthLabels[i - 1]?.colStart || 0) - 1) * 13}px`,
            }}
          >
            {m.label}
          </div>
        ))}
      </div>

      <div className="flex">
        {/* Day labels */}
        <div className="flex flex-col justify-between pr-2 text-xs text-muted-foreground" style={{ height: '91px' }}>
          <span className="h-[11px]"></span>
          <span className="h-[11px]">Mon</span>
          <span className="h-[11px]"></span>
          <span className="h-[11px]">Wed</span>
          <span className="h-[11px]"></span>
          <span className="h-[11px]">Fri</span>
          <span className="h-[11px]"></span>
        </div>

        {/* Grid */}
        <div className="flex gap-[3px] overflow-x-auto pb-2">
          {grid.map((week, weekIdx) => (
            <div key={weekIdx} className="flex flex-col gap-[3px]">
              {week.map((day) => (
                <button
                  key={day.date}
                  onClick={() => !day.isFuture && setSelectedDay({ date: day.date, points: day.points })}
                  className={cn(
                    'w-[10px] h-[10px] rounded-sm transition-all hover:ring-1 hover:ring-white/50',
                    day.isToday && 'ring-1 ring-cyan-400',
                    day.isFuture && 'opacity-30 cursor-not-allowed'
                  )}
                  style={{ backgroundColor: day.isFuture ? COLORS.empty : getColor(day.points) }}
                  title={`${day.date}: ${day.points} pts`}
                  disabled={day.isFuture}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-2 mt-4 text-xs text-muted-foreground">
        <span>Less</span>
        <div className="flex gap-[2px]">
          {Object.values(COLORS).map((color, i) => (
            <div
              key={i}
              className="w-[10px] h-[10px] rounded-sm"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <span>More</span>
      </div>

      {/* Day Detail Dialog */}
      <Dialog open={!!selectedDay} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedDay && formatDisplayDate(selectedDay.date)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <span className="text-muted-foreground">Points Earned</span>
              <span className="text-2xl font-bold" style={{ color: selectedDay ? getColor(selectedDay.points) : undefined }}>
                {selectedDay?.points || 0} pts
              </span>
            </div>
            {selectedDay && selectedDay.points >= 25 && (
              <div className="text-center text-green-500 text-sm">
                🎯 Goal reached!
              </div>
            )}
            {selectedDay && selectedDay.points > 0 && selectedDay.points < 25 && (
              <div className="text-center text-muted-foreground text-sm">
                {25 - selectedDay.points} pts away from daily goal
              </div>
            )}
            {selectedDay && selectedDay.points === 0 && (
              <div className="text-center text-muted-foreground text-sm">
                No activity recorded
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
