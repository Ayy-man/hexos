'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import type { HillChartProps, HillChartItem, TestingStage } from './types'
import { SNAP_ZONES, SNAP_THRESHOLD, STACK_TOLERANCE, STACK_OFFSET } from './utils'

// Testing stage colors and icons
const STAGE_CONFIG: Record<TestingStage, { color: string; label: string; icon: string }> = {
  dev: { color: '#3b82f6', label: 'DEV', icon: 'D' },
  admin_int: { color: '#8b5cf6', label: 'ADMIN', icon: 'A' },
  client: { color: '#10b981', label: 'CLIENT', icon: 'C' },
}

export function HillChart({
  items,
  onItemUpdate,
  width = 700,
  height = 300,
  readOnly = false,
  isEditMode = false,
}: HillChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [dragPosition, setDragPosition] = useState<number | null>(null)
  const [pulsePhase, setPulsePhase] = useState(0)
  const padding = 50

  // Animate pulse for ready-to-test items
  useEffect(() => {
    const interval = setInterval(() => {
      setPulsePhase(p => (p + 0.05) % 1)
    }, 50)
    return () => clearInterval(interval)
  }, [])

  const xToSvg = (x: number) => padding + (x / 100) * (width - padding * 2)
  const svgToX = (svgX: number) =>
    Math.max(0, Math.min(100, ((svgX - padding) / (width - padding * 2)) * 100))

  const yFromX = (x: number) => {
    const bottom = height - 55
    const normalizedX = (x - 50) / 50
    return bottom - Math.exp(-2 * normalizedX * normalizedX) * 100
  }

  const getItemX = (item: HillChartItem) => {
    if (draggedId === item.id && dragPosition !== null) {
      return dragPosition
    }
    return item.x
  }

  // Check if item is in testing zone and ready for current user's attention
  const isReadyForTesting = (item: HillChartItem) => {
    if (!item.testing || item.testing.stage === null) return false
    return item.testing.status === 'pending' || item.testing.status === 'in_progress'
  }

  const stackedPositions = useMemo(() => {
    const positions: Record<
      string,
      { x: number; baseY: number; y: number; stackIndex: number }
    > = {}
    const sorted = [...items].sort((a, b) => getItemX(a) - getItemX(b))

    sorted.forEach((item) => {
      let stackIndex = 0
      const itemX = getItemX(item)

      Object.entries(positions).forEach(([id, pos]) => {
        const other = items.find((t) => t.id === id)
        if (other && Math.abs(getItemX(other) - itemX) < STACK_TOLERANCE) {
          stackIndex = Math.max(stackIndex, pos.stackIndex + 1)
        }
      })

      positions[item.id] = {
        x: xToSvg(itemX),
        baseY: yFromX(itemX),
        y: yFromX(itemX) - stackIndex * STACK_OFFSET,
        stackIndex,
      }
    })

    return positions
  }, [items, width, height, draggedId, dragPosition])

  const bellCurvePath = useMemo(() => {
    const points: string[] = []
    for (let i = 0; i <= 100; i += 2) {
      points.push(`${xToSvg(i)},${yFromX(i)}`)
    }
    return `M ${points.join(' L ')}`
  }, [width, height])

  // Testing zone gradient overlay path (90-100%)
  const testingZonePath = useMemo(() => {
    const points: string[] = []
    for (let i = 90; i <= 100; i += 1) {
      points.push(`${xToSvg(i)},${yFromX(i)}`)
    }
    return `M ${points.join(' L ')}`
  }, [width, height])

  useEffect(() => {
    if (!draggedId || !svgRef.current) return

    const handleMove = (e: MouseEvent) => {
      const rect = svgRef.current!.getBoundingClientRect()
      let newX = svgToX(e.clientX - rect.left)

      // Check if dragged item is locked and clamp position
      const draggedItem = items.find(i => i.id === draggedId)
      const isLocked = draggedItem?.testing?.isLocked
      const maxPosition = isLocked ? (draggedItem?.testing?.unlockPosition ?? 90) : 100
      newX = Math.min(maxPosition, newX)

      for (const snap of SNAP_ZONES) {
        if (Math.abs(newX - snap) < SNAP_THRESHOLD) {
          newX = snap
          break
        }
      }

      setDragPosition(newX)
    }

    const handleUp = () => {
      if (dragPosition !== null) {
        onItemUpdate?.(draggedId, dragPosition)
      }
      setDraggedId(null)
      setDragPosition(null)
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)

    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [draggedId, dragPosition, onItemUpdate, items])

  const canDrag = !readOnly || isEditMode

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      className="rounded-lg bg-muted dark:bg-background"
      style={{
        cursor: draggedId ? 'grabbing' : 'default',
      }}
    >
      <defs>
        {/* Glow filter for dragged items */}
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Gradient for curve */}
        <linearGradient id="curveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgb(239, 68, 68)" stopOpacity="0.15" />
          <stop offset="50%" stopColor="rgb(245, 158, 11)" stopOpacity="0.15" />
          <stop offset="90%" stopColor="rgb(34, 197, 94)" stopOpacity="0.15" />
        </linearGradient>

        {/* Testing zone gradient */}
        <linearGradient id="testingZoneGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.08" />
          <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.2" />
        </linearGradient>

        {/* Pulse gradient for ready items */}
        <radialGradient id="pulseGrad">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4 - pulsePhase * 0.3} />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
        </radialGradient>

        {/* Lock icon pattern */}
        <pattern id="lockPattern" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="0.5" fill="currentColor" opacity="0.3" />
        </pattern>
      </defs>

      {/* Vertical grid lines */}
      <g opacity="0.06">
        {[0, 25, 50, 75, 100].map((i) => (
          <line
            key={i}
            x1={xToSvg(i)}
            y1={20}
            x2={xToSvg(i)}
            y2={height - 42}
            stroke="#fff"
            strokeDasharray="3 3"
          />
        ))}
      </g>

      {/* Center line (50% mark) */}
      <line
        x1={xToSvg(50)}
        y1={20}
        x2={xToSvg(50)}
        y2={height - 42}
        className="stroke-zinc-300 dark:stroke-zinc-800"
        strokeDasharray="6 4"
      />

      {/* Testing Zone background highlight (90-100%) */}
      <g>
        {/* Subtle background area for testing zone */}
        <rect
          x={xToSvg(90)}
          y={20}
          width={xToSvg(100) - xToSvg(90)}
          height={height - 62}
          fill="url(#testingZoneGrad)"
          opacity="0.5"
        />
        {/* Vertical separator at testing zone start */}
        <line
          x1={xToSvg(90)}
          y1={20}
          x2={xToSvg(90)}
          y2={height - 42}
          stroke="#8b5cf6"
          strokeWidth="1.5"
          strokeDasharray="4 2"
          opacity="0.4"
        />
      </g>

      {/* Testing milestone markers (90%, 95%, 100%) */}
      {[
        { pos: 90, label: 'DEV', color: '#3b82f6' },
        { pos: 95, label: 'ADMIN', color: '#8b5cf6' },
        { pos: 100, label: 'CLIENT', color: '#10b981' },
      ].map(({ pos, label, color }) => (
        <g key={pos}>
          {/* Marker line */}
          <line
            x1={xToSvg(pos)}
            y1={height - 42}
            x2={xToSvg(pos)}
            y2={height - 52}
            stroke={color}
            strokeWidth="2"
            opacity="0.6"
          />
          {/* Marker dot */}
          <circle
            cx={xToSvg(pos)}
            cy={height - 54}
            r="3"
            fill={color}
            opacity="0.8"
          />
        </g>
      ))}

      {/* Zone labels */}
      <text
        x={xToSvg(25)}
        y={height - 14}
        className="fill-zinc-500 dark:fill-zinc-600"
        fontSize="11"
        textAnchor="middle"
        fontFamily="system-ui"
      >
        Figuring Out
      </text>
      <text
        x={xToSvg(70)}
        y={height - 14}
        className="fill-zinc-500 dark:fill-zinc-600"
        fontSize="11"
        textAnchor="middle"
        fontFamily="system-ui"
      >
        Making It Happen
      </text>
      <text
        x={xToSvg(92.5)}
        y={height - 14}
        className="fill-violet-500 dark:fill-violet-400"
        fontSize="10"
        textAnchor="middle"
        fontFamily="system-ui"
        fontWeight="600"
      >
        TESTING
      </text>

      {/* Bell curve with gradient background */}
      <path d={bellCurvePath} stroke="url(#curveGrad)" strokeWidth="14" fill="none" />
      <path d={bellCurvePath} className="stroke-zinc-300 dark:stroke-zinc-800" strokeWidth="2.5" fill="none" />

      {/* Testing zone curve overlay (more vibrant) */}
      <path d={testingZonePath} stroke="url(#testingZoneGrad)" strokeWidth="16" fill="none" opacity="0.6" />

      {/* Stacking lines */}
      {items.map((item) => {
        const pos = stackedPositions[item.id]
        if (!pos || pos.stackIndex === 0 || draggedId === item.id) return null

        return (
          <line
            key={`line-${item.id}`}
            x1={pos.x}
            y1={pos.baseY}
            x2={pos.x}
            y2={pos.y + 10}
            stroke={item.color}
            strokeWidth="1"
            strokeDasharray="2 2"
            opacity="0.3"
          />
        )
      })}

      {/* Item dots */}
      {items.map((item) => {
        const pos = stackedPositions[item.id]
        if (!pos) return null

        const isDragging = draggedId === item.id
        const isHovered = hoveredId === item.id
        const effectiveX = getItemX(item)
        const cy = isDragging ? yFromX(effectiveX) : pos.y
        const inTestingZone = effectiveX >= 90
        const testing = item.testing
        const isReady = isReadyForTesting(item)
        const isLocked = testing?.isLocked

        return (
          <g key={item.id}>
            {/* Pulse effect for ready-to-test items */}
            {isReady && !isDragging && (
              <circle
                cx={pos.x}
                cy={cy}
                r={18 + Math.sin(pulsePhase * Math.PI * 2) * 4}
                fill={testing?.stage ? STAGE_CONFIG[testing.stage].color : '#8b5cf6'}
                opacity={0.15 + pulsePhase * 0.1}
              />
            )}

            {/* Lock indicator ring */}
            {isLocked && !isDragging && (
              <circle
                cx={pos.x}
                cy={cy}
                r={14}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeDasharray="3 2"
                opacity="0.6"
              />
            )}

            {/* Hover/drag glow */}
            {(isDragging || isHovered) && (
              <circle cx={pos.x} cy={cy} r={20} fill={item.color} opacity="0.15" />
            )}

            {/* Main dot */}
            <circle
              cx={pos.x}
              cy={cy}
              r={isDragging ? 12 : 10}
              fill={item.color}
              stroke={isLocked ? '#f59e0b' : 'rgba(255,255,255,0.3)'}
              strokeWidth={isLocked ? '2.5' : '2'}
              style={{
                cursor: canDrag && !isLocked ? (isDragging ? 'grabbing' : 'grab') : 'default',
                filter: isDragging ? 'url(#glow)' : 'none',
                transition: isDragging ? 'none' : 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
              onMouseDown={(e) => {
                if (canDrag && !isLocked) {
                  e.preventDefault()
                  setDraggedId(item.id)
                }
              }}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
            />

            {/* Testing stage badge */}
            {inTestingZone && testing?.stage && !isDragging && (
              <g>
                <rect
                  x={pos.x - 10}
                  y={cy - 22}
                  width={20}
                  height={14}
                  rx={4}
                  fill={STAGE_CONFIG[testing.stage].color}
                  opacity={testing.status === 'passed' ? 0.5 : 0.9}
                />
                <text
                  x={pos.x}
                  y={cy - 12}
                  fill="white"
                  fontSize="9"
                  textAnchor="middle"
                  fontWeight="700"
                  fontFamily="system-ui"
                >
                  {STAGE_CONFIG[testing.stage].icon}
                </text>
              </g>
            )}

            {/* Lock icon for locked items */}
            {isLocked && !isDragging && (
              <g style={{ pointerEvents: 'none' }}>
                <rect x={pos.x - 4} y={pos.y + 12} width="8" height="6" rx="1" fill="#f59e0b" />
                <path
                  d="M {pos.x - 3} {pos.y + 12} L {pos.x - 3} {pos.y + 9} A 3 3 0 0 1 {pos.x + 3} {pos.y + 9} L {pos.x + 3} {pos.y + 12}"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="1.5"
                />
              </g>
            )}

          </g>
        )
      })}

      {/* Hover tooltip — rendered after all dots so it paints on top */}
      {hoveredId && !draggedId && (() => {
        const item = items.find(i => i.id === hoveredId)
        if (!item) return null
        const pos = stackedPositions[item.id]
        if (!pos) return null
        const effectiveX = getItemX(item)
        const cy = pos.y
        const testing = item.testing
        const isLocked = testing?.isLocked

        return (
          <g style={{ pointerEvents: 'none' }}>
            <rect
              x={pos.x - 60}
              y={cy - 48}
              width={120}
              height={testing ? 48 : 36}
              rx={6}
              className="fill-white stroke-zinc-200 dark:fill-zinc-900 dark:stroke-zinc-800"
            />
            <text
              x={pos.x}
              y={cy - 32}
              className="fill-zinc-900 dark:fill-zinc-100"
              fontSize="11"
              textAnchor="middle"
              fontWeight="500"
              fontFamily="system-ui"
            >
              {item.name}
            </text>
            <text
              x={pos.x}
              y={cy - 18}
              className={testing ? 'fill-violet-500' : 'fill-zinc-500'}
              fontSize="10"
              textAnchor="middle"
              fontFamily="system-ui"
              fontWeight={testing ? '600' : '400'}
            >
              {testing && testing.stage ? `${STAGE_CONFIG[testing.stage].label} TEST` : `${Math.round(effectiveX)}%`}
            </text>
            {testing && isLocked && (
              <text
                x={pos.x}
                y={cy - 6}
                className="fill-amber-500"
                fontSize="9"
                textAnchor="middle"
                fontFamily="system-ui"
              >
                Locked until {testing.unlockPosition}% test passes
              </text>
            )}
          </g>
        )
      })()}

      {/* Mode badge */}
      {readOnly && !isEditMode && (
        <g>
          <rect
            x={width - 82}
            y={10}
            width={70}
            height={20}
            rx={4}
            className="fill-zinc-100 stroke-zinc-200 dark:fill-zinc-900 dark:stroke-zinc-800"
          />
          <text
            x={width - 47}
            y={24}
            className="fill-zinc-500 dark:fill-zinc-600"
            fontSize="10"
            textAnchor="middle"
            fontFamily="system-ui"
          >
            Read Only
          </text>
        </g>
      )}
      {isEditMode && (
        <g>
          <rect
            x={width - 82}
            y={10}
            width={70}
            height={20}
            rx={4}
            className="fill-amber-500/15 stroke-amber-500/30"
          />
          <text
            x={width - 47}
            y={24}
            className="fill-amber-500"
            fontSize="10"
            textAnchor="middle"
            fontWeight="600"
            fontFamily="system-ui"
          >
            EDITING
          </text>
        </g>
      )}
    </svg>
  )
}
