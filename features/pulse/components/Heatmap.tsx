'use client'

import { useEffect, useRef } from 'react'
import CalHeatmap from 'cal-heatmap'
import 'cal-heatmap/cal-heatmap.css'
import Tooltip from 'cal-heatmap/plugins/Tooltip'
import { formatDateForDisplay, formatPoints } from '@/lib/utils/pulseCalculations'

interface HeatmapProps {
  dailyPoints: Record<string, number>
  weeks?: number
  className?: string
}

export function Heatmap({ dailyPoints, weeks = 12, className }: HeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const calRef = useRef<CalHeatmap | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Clean up previous instance
    if (calRef.current) {
      calRef.current.destroy()
    }

    // Calculate start date (weeks ago, aligned to Monday)
    const now = new Date()
    const dayOfWeek = now.getDay()
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const startDate = new Date(now)
    startDate.setDate(now.getDate() - daysToMonday - (weeks - 1) * 7)
    startDate.setHours(0, 0, 0, 0)

    // Transform data for cal-heatmap
    const data = Object.entries(dailyPoints).map(([date, value]) => ({
      date: date,
      value: value,
    }))

    const cal = new CalHeatmap()
    calRef.current = cal

    cal.paint(
      {
        itemSelector: containerRef.current,
        range: weeks,
        domain: {
          type: 'week',
          gutter: 4,
          label: { position: 'top', text: '' }, // Hide week labels
        },
        subDomain: {
          type: 'day',
          radius: 2,
          width: 14,
          height: 14,
          gutter: 3,
        },
        date: {
          start: startDate,
          locale: { weekStart: 1 }, // Monday
        },
        data: {
          source: data,
          x: 'date',
          y: 'value',
        },
        scale: {
          color: {
            range: ['#262626', '#0d4f4f', '#0891b2', '#22d3ee'],
            domain: [0, 10, 25],
            type: 'threshold',
          },
        },
      },
      [
        [
          Tooltip,
          {
            text: (_timestamp: number, value: number, dayjsDate: { format: (fmt: string) => string }) => {
              const dateStr = dayjsDate.format('YYYY-MM-DD')
              const formattedDate = formatDateForDisplay(dateStr)
              const points = value || 0
              return `${formattedDate}\n${points > 0 ? formatPoints(points) : 'No activity'}`
            },
          },
        ],
      ]
    )

    return () => {
      if (calRef.current) {
        calRef.current.destroy()
        calRef.current = null
      }
    }
  }, [dailyPoints, weeks])

  return (
    <div className={className}>
      <div ref={containerRef} className="cal-heatmap-container" />

      {/* Legend */}
      <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: '#262626' }} />
          <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: '#0d4f4f' }} />
          <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: '#0891b2' }} />
          <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: '#22d3ee' }} />
        </div>
        <span>More</span>
      </div>

      {/* Last 12 weeks label */}
      <p className="text-xs text-muted-foreground mt-2">Last {weeks} weeks</p>

      <style jsx global>{`
        .cal-heatmap-container {
          --ch-domain-gutter: 4px;
          --ch-subdomain-gutter: 3px;
        }
        .cal-heatmap-container .ch-domain-text {
          display: none;
        }
        .ch-tooltip {
          background-color: hsl(var(--popover)) !important;
          color: hsl(var(--popover-foreground)) !important;
          border: 1px solid hsl(var(--border)) !important;
          border-radius: 6px !important;
          padding: 8px 12px !important;
          font-size: 12px !important;
          white-space: pre-line !important;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1) !important;
        }
      `}</style>
    </div>
  )
}
