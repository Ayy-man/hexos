'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'

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

export function GitHubHeatmap({ dailyPoints, weeks = 12 }: GitHubHeatmapProps) {
  const { grid, monthLabels } = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Find the Sunday of the current week
    const dayOfWeek = today.getDay()
    const endDate = new Date(today)
    endDate.setDate(today.getDate() + (6 - dayOfWeek)) // Go to Saturday

    // Start date is (weeks) weeks before, aligned to Sunday
    const startDate = new Date(endDate)
    startDate.setDate(endDate.getDate() - (weeks * 7) + 1)

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
  }, [dailyPoints, weeks])

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
        <div className="flex gap-[3px]">
          {grid.map((week, weekIdx) => (
            <div key={weekIdx} className="flex flex-col gap-[3px]">
              {week.map((day, dayIdx) => (
                <div
                  key={day.date}
                  className={cn(
                    'w-[10px] h-[10px] rounded-sm transition-all',
                    day.isToday && 'ring-1 ring-cyan-400',
                    day.isFuture && 'opacity-30'
                  )}
                  style={{ backgroundColor: day.isFuture ? COLORS.empty : getColor(day.points) }}
                  title={`${day.date}: ${day.points} pts`}
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
    </div>
  )
}
