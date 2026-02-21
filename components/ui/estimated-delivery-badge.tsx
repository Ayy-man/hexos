'use client'

import { cn } from '@/lib/utils'
import { Clock, Pencil } from 'lucide-react'
import {
  type DeliveryStatus,
  getStatusColors,
  getStatusLabel,
  formatDeliveryDate,
  getDayOfWeek,
} from '@/lib/utils/deliveryEstimate'

export interface EstimatedDeliveryBadgeProps {
  estimatedDate: Date | null
  targetDate?: Date | null
  delayDays: number
  status: DeliveryStatus
  phase: string
  isOverride?: boolean
  onEditClick?: () => void
  className?: string
  /** Compact variant for header placement */
  variant?: 'default' | 'compact'
}

export function EstimatedDeliveryBadge({
  estimatedDate,
  targetDate,
  delayDays,
  status,
  phase,
  isOverride = false,
  onEditClick,
  className,
  variant = 'default',
}: EstimatedDeliveryBadgeProps) {
  const colors = getStatusColors(status)
  const statusLabel = getStatusLabel(status)
  const dateString = formatDeliveryDate(estimatedDate)
  const dayOfWeek = getDayOfWeek(estimatedDate)

  // Show delay indicator for at_risk and delayed
  const showDelay = delayDays > 0 && !isOverride

  // Compact variant for header placement
  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm',
          colors.border,
          colors.bg,
          className
        )}
      >
        <Clock className={cn('h-3.5 w-3.5', colors.text)} />
        <span className={cn('font-medium', colors.text)}>{dateString}</span>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-xs font-semibold',
            colors.pill
          )}
        >
          {statusLabel}
          {showDelay && <span className="ml-1 opacity-80">+{delayDays}d</span>}
        </span>
        {onEditClick && (
          <button
            onClick={onEditClick}
            className="p-0.5 rounded hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
            title="Edit delivery date"
          >
            <Pencil className="h-3 w-3" />
          </button>
        )}
      </div>
    )
  }

  // Default full variant
  return (
    <div className={cn('animate-fade-in-up', className)}>
      <div className="relative">
        {/* Main Card */}
        <div
          className={cn(
            'relative overflow-hidden rounded-2xl border-2 p-4 transition-all',
            colors.border,
            colors.bg
          )}
        >
          {/* Content */}
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                colors.bg,
                'animate-pulse-glow'
              )}
            >
              <Clock className={cn('h-5 w-5', colors.text)} />
            </div>

            {/* Text Content */}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-mono font-medium text-text-tertiary uppercase tracking-wider">
                Estimated Delivery
              </p>
              <h3 className={cn('text-xl font-bold mt-0.5', colors.text)}>
                {dateString}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {dayOfWeek && `${dayOfWeek} · `}
                {phase}
                {isOverride && (
                  <span className="ml-1 text-xs opacity-70">(manual)</span>
                )}
              </p>
            </div>

            {/* Status Pill & Edit */}
            <div className="flex flex-col items-end gap-2">
              <div
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
                  colors.pill
                )}
              >
                {statusLabel}
                {showDelay && (
                  <span className="opacity-80">+{delayDays}d</span>
                )}
              </div>

              {onEditClick && (
                <button
                  onClick={onEditClick}
                  className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                  title="Edit delivery date"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Target vs Estimated indicator (when delayed) */}
          {showDelay && targetDate && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                Original target: {formatDeliveryDate(targetDate)}
                <span className="mx-1.5">•</span>
                <span className={colors.text}>
                  {delayDays} day{delayDays !== 1 ? 's' : ''} behind
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Animated Border SVG */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ borderRadius: '1rem' }}
        >
          <rect
            x="1"
            y="1"
            width="calc(100% - 2px)"
            height="calc(100% - 2px)"
            rx="16"
            ry="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={cn(
              'animate-sliding-border',
              status === 'on_track' && 'text-success',
              status === 'at_risk' && 'text-warning',
              status === 'delayed' && 'text-error'
            )}
            strokeDasharray="1"
            pathLength="1"
          />
        </svg>
      </div>
    </div>
  )
}

export default EstimatedDeliveryBadge
