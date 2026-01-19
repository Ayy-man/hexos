'use client'

import { useMemo } from 'react'
import type { SparklineProps } from './types'

export function CompactSparkline({
  history,
  currentX,
  color,
  width = 200,
  height = 50,
}: SparklineProps) {
  // Build data points - sequential order, not calendar-based
  const data = useMemo(() => {
    const points: Array<{ value: number; confirmed: boolean }> = []

    if (history && history.length > 0) {
      history.forEach((h) => {
        points.push({ value: h.x, confirmed: true })
      })
    }

    const lastHistoryValue = history?.[history.length - 1]?.x
    const hasPendingChange =
      lastHistoryValue === undefined || Math.abs(lastHistoryValue - currentX) > 0.5

    if (hasPendingChange || points.length === 0) {
      points.push({ value: currentX, confirmed: !hasPendingChange || points.length === 0 })
    }

    return points
  }, [history, currentX])

  const padX = 8
  const padY = 8
  const chartWidth = width - padX * 2
  const chartHeight = height - padY * 2

  // Sequential X positioning
  const totalPoints = data.length
  const getX = (index: number) => {
    if (totalPoints === 1) return padX + chartWidth / 2
    return padX + (index / (totalPoints - 1)) * chartWidth
  }

  const getY = (val: number) =>
    padY + chartHeight - (Math.max(0, Math.min(100, val)) / 100) * chartHeight

  const svgPoints = data.map((d, i) => ({
    x: getX(i),
    y: getY(d.value),
    value: d.value,
    confirmed: d.confirmed,
  }))

  const confirmedPoints = svgPoints.filter((p) => p.confirmed)
  const pendingPoint = svgPoints.find((p) => !p.confirmed)
  const lastConfirmed = confirmedPoints[confirmedPoints.length - 1]
  const firstPoint = svgPoints[0]
  const lastPoint = svgPoints[svgPoints.length - 1]

  // Build paths only if 2+ confirmed points
  const hasLine = confirmedPoints.length >= 2
  const linePath = hasLine
    ? confirmedPoints.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ')
    : ''

  // Area path
  const areaPath = hasLine
    ? `${linePath} L ${lastConfirmed.x} ${getY(0)} L ${confirmedPoints[0].x} ${getY(0)} Z`
    : ''

  return (
    <svg width={width} height={height} className="block">
      {/* 50% reference line */}
      <line
        x1={padX}
        y1={getY(50)}
        x2={width - padX}
        y2={getY(50)}
        stroke="currentColor"
        className="text-zinc-700/30"
        strokeWidth="1"
        strokeDasharray="2 2"
      />

      {/* Area fill */}
      {areaPath && (
        <path d={areaPath} fill={color} opacity="0.15" />
      )}

      {/* Main line */}
      {hasLine && (
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2"
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

      {/* Dots */}
      {svgPoints.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={i === svgPoints.length - 1 ? 5 : 3}
          fill={p.confirmed ? color : 'transparent'}
          stroke={p.confirmed ? 'none' : color}
          strokeWidth={2}
          strokeDasharray={p.confirmed ? 'none' : '2 2'}
        />
      ))}
    </svg>
  )
}
