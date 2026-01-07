'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { subDays, startOfWeek, addDays, format, isAfter, isSameDay, getDay } from 'date-fns'

interface GitHubHeatmapProps {
  dailyPoints: Record<string, number>
}

// Color levels using Tailwind classes for better theme support
const LEVEL_COLORS = [
  'bg-muted/30 dark:bg-muted/20', // Level 0: No activity
  'bg-cyan-900/60',       // Level 1: 1-9 pts
  'bg-cyan-700',          // Level 2: 10-24 pts
  'bg-cyan-500',          // Level 3: 25-49 pts
  'bg-cyan-400',          // Level 4: 50+ pts
]

function getColorClass(points: number): string {
  if (points === 0) return LEVEL_COLORS[0]
  if (points < 10) return LEVEL_COLORS[1]
  if (points < 25) return LEVEL_COLORS[2]
  if (points < 50) return LEVEL_COLORS[3]
  return LEVEL_COLORS[4]
}

function formatDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const CELL_SIZE = 12
const CELL_GAP = 3

interface DayData {
  date: string
  dateObj: Date
  points: number
  isToday: boolean
  level: number
}

export function GitHubHeatmap({ dailyPoints }: GitHubHeatmapProps) {
  const { weeks, monthPositions } = useMemo(() => {
    const today = new Date()
    // Show last 365 days (approx 52 weeks)
    const startDate = startOfWeek(subDays(today, 365))
    const endDate = today

    const weeks: DayData[][] = []
    const monthPositions: { month: string; weekIndex: number }[] = []

    let currentDate = startDate
    let weekIndex = 0
    let lastMonth = -1

    // We generate weeks until we cover today
    while (currentDate <= endDate || weeks.length < 52) {
      const week: DayData[] = []

      for (let i = 0; i < 7; i++) {
        const dateKey = formatDateKey(currentDate)
        const month = currentDate.getMonth()

        // Track first day of each month for labels
        if (month !== lastMonth && i === 0 && weeks.length > 0) {
          monthPositions.push({ month: MONTHS[month], weekIndex })
          lastMonth = month
        }

        week.push({
          date: dateKey,
          dateObj: new Date(currentDate),
          points: dailyPoints[dateKey] || 0,
          isToday: isSameDay(currentDate, today),
          level: 0 // placeholder
        })

        currentDate = addDays(currentDate, 1)
      }

      weeks.push(week)
      weekIndex++

      // Safety break to prevent infinite loops if logic is off
      if (weeks.length > 54) break
    }

    return { weeks, monthPositions }
  }, [dailyPoints])

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="min-w-fit pr-4">
        {/* Month labels */}
        <div className="flex h-6 mb-2 text-xs text-muted-foreground relative">
          {monthPositions.map((m, i) => (
            // Only show month if it fits (not too close to the end)
            <span
              key={`${m.month}-${i}`}
              className="absolute font-medium"
              style={{ left: (m.weekIndex * (CELL_SIZE + CELL_GAP)) + 30 }} // +30 for the day label offset
            >
              {m.month}
            </span>
          ))}
        </div>

        <div className="flex">
          {/* Day of week labels */}
          <div className="flex flex-col justify-between pr-2 text-[10px] text-muted-foreground h-[102px] pt-[2px]">
            <span></span>
            <span>Mon</span>
            <span></span>
            <span>Wed</span>
            <span></span>
            <span>Fri</span>
            <span></span>
          </div>

          {/* Grid */}
          <div className="flex gap-[3px]">
            {weeks.map((week, weekIdx) => (
              <div key={weekIdx} className="flex flex-col gap-[3px]">
                {week.map((day) => (
                  <Tooltip key={day.date} delayDuration={0}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          'rounded-[2px] transition-all border border-transparent',
                          getColorClass(day.points),
                          day.isToday && 'ring-2 ring-foreground ring-offset-1 ring-offset-background z-10',
                          'hover:ring-1 hover:ring-foreground/50 hover:z-20 cursor-default'
                        )}
                        style={{
                          width: CELL_SIZE,
                          height: CELL_SIZE,
                        }}
                      />
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">
                      <div className="font-semibold">{format(day.dateObj, 'EEEE, MMMM do, yyyy')}</div>
                      <div className="text-muted-foreground">
                        {day.points === 0 ? 'No activity' : `${day.points} contributions`}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-2 mt-4 text-xs text-muted-foreground ml-8">
          <span>Less</span>
          <div className="flex gap-[3px]">
            {LEVEL_COLORS.map((color, i) => (
              <div
                key={i}
                className={cn("w-3 h-3 rounded-[2px]", color)}
              />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  )
}
