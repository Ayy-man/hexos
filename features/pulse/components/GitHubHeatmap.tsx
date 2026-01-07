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
}

// GitHub contribution colors (green theme like actual GitHub)
const COLORS = [
  '#161b22', // Level 0: No activity
  '#0e4429', // Level 1: 1-9 pts
  '#006d32', // Level 2: 10-24 pts
  '#26a641', // Level 3: 25-49 pts
  '#39d353', // Level 4: 50+ pts
]

function getColorLevel(points: number): number {
  if (points === 0) return 0
  if (points < 10) return 1
  if (points < 25) return 2
  if (points < 50) return 3
  return 4
}

function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0]
}

function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const CELL_SIZE = 11
const CELL_GAP = 3

interface DayData {
  date: string
  points: number
  isToday: boolean
  isFuture: boolean
  dayOfWeek: number
}

export function GitHubHeatmap({ dailyPoints }: GitHubHeatmapProps) {
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null)

  const { weeks, monthPositions, totalWeeks } = useMemo(() => {
    const today = new Date()
    today.setHours(12, 0, 0, 0)

    // Start from January 1, 2026
    const yearStart = new Date(2026, 0, 1, 12, 0, 0)

    // Align to Sunday of that week
    const startDow = yearStart.getDay()
    const startDate = new Date(yearStart)
    startDate.setDate(yearStart.getDate() - startDow)

    // End at Saturday of current week
    const endDow = today.getDay()
    const endDate = new Date(today)
    endDate.setDate(today.getDate() + (6 - endDow))

    const weeks: DayData[][] = []
    const monthPositions: { month: string; weekIndex: number }[] = []

    let currentDate = new Date(startDate)
    let weekIndex = 0
    let lastMonth = -1

    while (currentDate <= endDate) {
      const week: DayData[] = []

      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        const dateKey = formatDateKey(currentDate)
        const month = currentDate.getMonth()

        // Track first day of each month for labels
        if (month !== lastMonth && dayOfWeek === 0) {
          monthPositions.push({ month: MONTHS[month], weekIndex })
          lastMonth = month
        }

        week.push({
          date: dateKey,
          points: dailyPoints[dateKey] || 0,
          isToday: dateKey === formatDateKey(today),
          isFuture: currentDate > today,
          dayOfWeek,
        })

        currentDate.setDate(currentDate.getDate() + 1)
      }

      weeks.push(week)
      weekIndex++
    }

    return { weeks, monthPositions, totalWeeks: weeks.length }
  }, [dailyPoints])

  const gridWidth = totalWeeks * (CELL_SIZE + CELL_GAP)

  return (
    <div className="rounded-lg border bg-card p-4 overflow-hidden">
      <div className="overflow-x-auto">
        <div style={{ minWidth: gridWidth + 40 }}>
          {/* Month labels */}
          <div className="relative h-5 ml-10" style={{ width: gridWidth }}>
            {monthPositions.map((m, i) => (
              <span
                key={`${m.month}-${i}`}
                className="absolute text-xs text-muted-foreground"
                style={{ left: m.weekIndex * (CELL_SIZE + CELL_GAP) }}
              >
                {m.month}
              </span>
            ))}
          </div>

          <div className="flex">
            {/* Day of week labels */}
            <div className="flex flex-col justify-around pr-2 text-xs text-muted-foreground" style={{ height: 7 * (CELL_SIZE + CELL_GAP) - CELL_GAP }}>
              <span className="h-[11px] leading-[11px]"></span>
              <span className="h-[11px] leading-[11px]">Mon</span>
              <span className="h-[11px] leading-[11px]"></span>
              <span className="h-[11px] leading-[11px]">Wed</span>
              <span className="h-[11px] leading-[11px]"></span>
              <span className="h-[11px] leading-[11px]">Fri</span>
              <span className="h-[11px] leading-[11px]"></span>
            </div>

            {/* Grid */}
            <div className="flex" style={{ gap: CELL_GAP }}>
              {weeks.map((week, weekIdx) => (
                <div key={weekIdx} className="flex flex-col" style={{ gap: CELL_GAP }}>
                  {week.map((day) => (
                    <button
                      key={day.date}
                      onClick={() => !day.isFuture && setSelectedDay(day)}
                      disabled={day.isFuture}
                      className={cn(
                        'rounded-sm transition-all',
                        day.isToday && 'ring-2 ring-cyan-400 ring-offset-1 ring-offset-background',
                        day.isFuture ? 'opacity-30 cursor-default' : 'hover:ring-1 hover:ring-white/50 cursor-pointer'
                      )}
                      style={{
                        width: CELL_SIZE,
                        height: CELL_SIZE,
                        backgroundColor: day.isFuture ? COLORS[0] : COLORS[getColorLevel(day.points)],
                      }}
                      title={`${day.date}: ${day.points} pts`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-2 mt-4 text-xs text-muted-foreground">
        <span>Less</span>
        <div className="flex gap-[2px]">
          {COLORS.map((color, i) => (
            <div
              key={i}
              className="w-[11px] h-[11px] rounded-sm"
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
              <span
                className="text-2xl font-bold"
                style={{ color: selectedDay ? COLORS[getColorLevel(selectedDay.points)] : undefined }}
              >
                {selectedDay?.points || 0} pts
              </span>
            </div>
            {selectedDay && selectedDay.points >= 25 && (
              <div className="text-center text-green-500 text-sm font-medium">
                Goal reached!
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
