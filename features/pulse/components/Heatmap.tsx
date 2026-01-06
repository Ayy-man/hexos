'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import {
  generateHeatmapGrid,
  formatDateForDisplay,
  formatPoints,
  type HeatmapDay,
} from '@/lib/utils/pulseCalculations'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface HeatmapProps {
  dailyPoints: Record<string, number>
  weeks?: number
  className?: string
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getIntensityClass(intensity: 0 | 1 | 2 | 3): string {
  switch (intensity) {
    case 0:
      return 'bg-muted'
    case 1:
      return 'bg-cyan-500/25'
    case 2:
      return 'bg-cyan-500/60'
    case 3:
      return 'bg-cyan-500'
    default:
      return 'bg-muted'
  }
}

export function Heatmap({ dailyPoints, weeks = 12, className }: HeatmapProps) {
  const grid = useMemo(() => generateHeatmapGrid(dailyPoints, weeks), [dailyPoints, weeks])

  // Transpose grid for column-based rendering (weeks as columns)
  const transposedGrid: HeatmapDay[][] = useMemo(() => {
    const result: HeatmapDay[][] = []
    for (let day = 0; day < 7; day++) {
      result.push(grid.map(week => week[day]))
    }
    return result
  }, [grid])

  return (
    <TooltipProvider>
      <div className={cn('overflow-x-auto', className)}>
        <div className="inline-flex gap-1">
          {/* Day labels */}
          <div className="flex flex-col gap-1 pr-2">
            {DAY_LABELS.map((label, idx) => (
              <div
                key={label}
                className="h-3 w-8 text-[10px] text-muted-foreground leading-3"
              >
                {idx % 2 === 0 ? label : ''}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          <div className="flex gap-[3px]">
            {grid.map((week, weekIdx) => (
              <div key={weekIdx} className="flex flex-col gap-[3px]">
                {week.map((day) => (
                  <Tooltip key={day.date}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          'h-3 w-3 rounded-sm transition-colors cursor-default',
                          getIntensityClass(day.intensity)
                        )}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <p className="font-medium">{formatDateForDisplay(day.date)}</p>
                      <p className="text-muted-foreground">
                        {day.points > 0 ? formatPoints(day.points) : 'No activity'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
          <span>Less</span>
          <div className="flex gap-[3px]">
            <div className="h-3 w-3 rounded-sm bg-muted" />
            <div className="h-3 w-3 rounded-sm bg-cyan-500/25" />
            <div className="h-3 w-3 rounded-sm bg-cyan-500/60" />
            <div className="h-3 w-3 rounded-sm bg-cyan-500" />
          </div>
          <span>More</span>
        </div>
      </div>
    </TooltipProvider>
  )
}
