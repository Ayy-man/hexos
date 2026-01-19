'use client'

import { useMemo } from 'react'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'

export interface ActivityDataPoint {
  date: string
  count: number
}

interface ActivitySparklineProps {
  data: ActivityDataPoint[]
  className?: string
  height?: number
  color?: 'primary' | 'green' | 'blue' | 'orange' | 'red'
  showTooltip?: boolean
}

const COLOR_MAP = {
  primary: {
    stroke: 'hsl(var(--primary))',
    fill: 'hsl(var(--primary) / 0.2)',
  },
  green: {
    stroke: 'hsl(142.1 76.2% 36.3%)',
    fill: 'hsl(142.1 76.2% 36.3% / 0.2)',
  },
  blue: {
    stroke: 'hsl(217.2 91.2% 59.8%)',
    fill: 'hsl(217.2 91.2% 59.8% / 0.2)',
  },
  orange: {
    stroke: 'hsl(24.6 95% 53.1%)',
    fill: 'hsl(24.6 95% 53.1% / 0.2)',
  },
  red: {
    stroke: 'hsl(0 84.2% 60.2%)',
    fill: 'hsl(0 84.2% 60.2% / 0.2)',
  },
}

export function ActivitySparkline({
  data,
  className,
  height = 32,
  color = 'primary',
}: ActivitySparklineProps) {
  const colors = COLOR_MAP[color]

  // Ensure we have at least some data points for a smooth line
  const chartData = useMemo(() => {
    if (data.length === 0) {
      // Return empty array with placeholder
      return Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        count: 0,
      }))
    }
    return data
  }, [data])

  const hasActivity = chartData.some((d) => d.count > 0)

  if (!hasActivity) {
    return (
      <div
        className={cn('flex items-center justify-center text-xs text-muted-foreground', className)}
        style={{ height }}
      >
        No activity
      </div>
    )
  }

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <defs>
            <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.stroke} stopOpacity={0.3} />
              <stop offset="100%" stopColor={colors.stroke} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="count"
            stroke={colors.stroke}
            strokeWidth={1.5}
            fill={`url(#gradient-${color})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// Compact inline version for tables and cards
interface InlineSparklineProps {
  data: ActivityDataPoint[]
  width?: number
  height?: number
  color?: 'primary' | 'green' | 'blue' | 'orange' | 'red'
}

export function InlineSparkline({
  data,
  width = 80,
  height = 24,
  color = 'primary',
}: InlineSparklineProps) {
  const colors = COLOR_MAP[color]

  const chartData = useMemo(() => {
    if (data.length === 0) {
      return Array.from({ length: 14 }, (_, i) => ({
        date: new Date(Date.now() - (13 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        count: 0,
      }))
    }
    return data
  }, [data])

  const hasActivity = chartData.some((d) => d.count > 0)

  if (!hasActivity) {
    return (
      <div
        className="flex items-center"
        style={{ width, height }}
      >
        <div className="h-px w-full bg-muted" />
      </div>
    )
  }

  return (
    <div style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 1, right: 1, bottom: 1, left: 1 }}>
          <Area
            type="monotone"
            dataKey="count"
            stroke={colors.stroke}
            strokeWidth={1}
            fill={colors.fill}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
