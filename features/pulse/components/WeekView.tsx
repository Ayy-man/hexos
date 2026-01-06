'use client'

import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DayColumn } from './DayColumn'
import { getWeekRange, getPreviousWeek, getNextWeek, getToday } from '@/lib/utils/pulseCalculations'
import type { PulseDailyTask } from '@/lib/types/pulse'

interface WeekViewProps {
  weekStart: string
  tasks: PulseDailyTask[]
  onWeekChange: (newStart: string) => void
  onUpdate?: () => void
}

export function WeekView({ weekStart, tasks, onWeekChange, onUpdate }: WeekViewProps) {
  const week = useMemo(() => getWeekRange(weekStart), [weekStart])

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const map: Record<string, PulseDailyTask[]> = {}
    for (const date of week.dates) {
      map[date] = []
    }
    for (const task of tasks) {
      if (map[task.date]) {
        map[task.date].push(task)
      }
    }
    return map
  }, [tasks, week.dates])

  const handlePreviousWeek = () => {
    const prev = getPreviousWeek(weekStart)
    onWeekChange(prev.start)
  }

  const handleNextWeek = () => {
    const next = getNextWeek(weekStart)
    onWeekChange(next.start)
  }

  const handleToday = () => {
    const today = getWeekRange()
    onWeekChange(today.start)
  }

  const isCurrentWeek = useMemo(() => {
    const currentWeek = getWeekRange()
    return weekStart === currentWeek.start
  }, [weekStart])

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">This Week</CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handlePreviousWeek}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {!isCurrentWeek && (
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={handleToday}
              >
                Today
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleNextWeek}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {week.dates.map((date) => (
            <DayColumn
              key={date}
              date={date}
              tasks={tasksByDate[date] || []}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
