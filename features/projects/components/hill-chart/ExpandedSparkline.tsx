'use client'

import { useMemo } from 'react'
import type { SparklineProps } from './types'

export function ExpandedSparkline({
  history,
  currentX,
  color,
  width = 400,
  height = 120,
}: SparklineProps) {
  // Build data points - sequential order, not calendar-based
  const data = useMemo(() => {
    const points: Array<{ value: number; label: string; confirmed: boolean }> = []

    // Add historical points
    if (history && history.length > 0) {
      history.forEach((h) => {
        const date = new Date(h.timestamp)
        const label = `${date.getMonth() + 1}/${date.getDate()}`
        points.push({ value: h.x, label, confirmed: true })
      })
    }

    // Check if current value differs from last history point
    const lastHistoryValue = history?.[history.length - 1]?.x
    const hasPendingChange =
      lastHistoryValue === undefined || Math.abs(lastHistoryValue - currentX) > 0.5

    // If pending change or no history, add current point
    if (hasPendingChange || points.length === 0) {
      const today = new Date()
      const label = `${today.getMonth() + 1}/${today.getDate()}`
      points.push({ value: currentX, label, confirmed: !hasPendingChange || points.length === 0 })
    }

    return points
  }, [history, currentX])

  const padX = 24
  const padTop = 28
  const padBottom = 8
  const chartWidth = width - padX * 2
  const chartHeight = height - padTop - padBottom

  // Sequential X positioning - evenly spaced
  const totalPoints = data.length
  const getX = (index: number) => {
    if (totalPoints === 1) return padX + chartWidth / 2
    return padX + (index / (totalPoints - 1)) * chartWidth
  }

  const getY = (val: number) => {
    const clamped = Math.max(0, Math.min(100, val))
    return padTop + chartHeight - (clamped / 100) * chartHeight
  }

  const svgPoints = data.map((d, i) => ({
    x: getX(i),
    y: getY(d.value),
    value: d.value,
    label: d.label,
    confirmed: d.confirmed,
  }))

  const confirmedPoints = svgPoints.filter((p) => p.confirmed)
  const pendingPoint = svgPoints.find((p) => !p.confirmed)
  const lastConfirmed = confirmedPoints[confirmedPoints.length - 1]

  // Only build paths if we have 2+ confirmed points
  const hasLine = confirmedPoints.length >= 2
  const linePath = hasLine
    ? confirmedPoints.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ')
    : ''

  return (
    <svg width={width} height={height} className="block">
      {/* Horizontal grid lines */}
      {[0, 50, 100].map((val) => (
        <line
          key={val}
          x1={padX}
          y1={getY(val)}
          x2={width - padX}
          y2={getY(val)}
          stroke="currentColor"
          className="text-zinc-600/20"
          strokeWidth="1"
          strokeDasharray={val === 50 ? '3 3' : 'none'}
        />
      ))}

      {/* Y-axis labels */}
      <text x={padX - 4} y={getY(100) + 3} fontSize="9" className="fill-zinc-500" textAnchor="end">
        100
      </text>
      <text x={padX - 4} y={getY(50) + 3} fontSize="9" className="fill-zinc-500" textAnchor="end">
        50
      </text>
      <text x={padX - 4} y={getY(0) + 3} fontSize="9" className="fill-zinc-500" textAnchor="end">
        0
      </text>

      {/* Area fill under line - only with 2+ points */}
      {hasLine && (
        <path
          d={`${linePath} L ${lastConfirmed.x} ${getY(0)} L ${confirmedPoints[0].x} ${getY(0)} Z`}
          fill={color}
          opacity="0.1"
        />
      )}

      {/* Main line - only with 2+ points */}
      {hasLine && (
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Dashed line to pending point */}
      {pendingPoint && lastConfirmed && (
        <line
          x1={lastConfirmed.x}
          y1={lastConfirmed.y}
          x2={pendingPoint.x}
          y2={pendingPoint.y}
          stroke={color}
          strokeWidth="2"
          strokeDasharray="4 3"
          strokeLinecap="round"
        />
      )}

      {/* Data points */}
      {svgPoints.map((p, i) => (
        <g key={i}>
          <circle
            cx={p.x}
            cy={p.y}
            r={p.confirmed ? 6 : 6}
            fill={p.confirmed ? color : 'transparent'}
            stroke={p.confirmed ? 'none' : color}
            strokeWidth={2}
            strokeDasharray={p.confirmed ? 'none' : '2 2'}
          />
        </g>
      ))}

      {/* Labels - rendered separately to avoid stacking issues */}
      {svgPoints.map((p, i) => {
        // Position value label below point when value > 85% to avoid overlapping with date
        const valueLabelBelow = p.value > 85
        const valueLabelY = valueLabelBelow ? p.y + 18 : p.y - 12

        return (
          <g key={`label-${i}`}>
            {/* Value label */}
            <text
              x={p.x}
              y={valueLabelY}
              fontSize="11"
              fill={color}
              textAnchor="middle"
              fontWeight="600"
            >
              {Math.round(p.value)}%
            </text>
            {/* Date label at top */}
            <text
              x={p.x}
              y={14}
              fontSize="9"
              className="fill-zinc-400"
              textAnchor="middle"
            >
              {p.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
