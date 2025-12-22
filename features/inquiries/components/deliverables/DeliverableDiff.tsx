'use client'

import { cn } from '@/lib/utils'

interface DeliverableDiffProps {
  originalValue: string | number | null | undefined
  currentValue: string | number | null | undefined
  type?: 'text' | 'price'
  className?: string
}

/**
 * Displays a diff between original and current values
 * Shows strikethrough for original, highlighted for new
 */
export function DeliverableDiff({
  originalValue,
  currentValue,
  type = 'text',
  className,
}: DeliverableDiffProps) {
  const hasChange =
    originalValue !== null &&
    originalValue !== undefined &&
    originalValue !== currentValue

  if (!hasChange) {
    // No change - just show current value
    return (
      <span className={className}>
        {type === 'price' && currentValue != null
          ? `$${Number(currentValue).toLocaleString()}`
          : currentValue ?? '-'}
      </span>
    )
  }

  // Show diff: original (strikethrough) → new (highlighted)
  const formatValue = (val: string | number | null | undefined) => {
    if (val === null || val === undefined) return '-'
    if (type === 'price') return `$${Number(val).toLocaleString()}`
    return String(val)
  }

  return (
    <span className={cn('inline-flex flex-col gap-0.5', className)}>
      <span className="text-muted-foreground line-through text-xs">
        {formatValue(originalValue)}
      </span>
      <span className="bg-green-100 dark:bg-green-900/30 px-1 rounded text-green-700 dark:text-green-400 font-medium">
        {formatValue(currentValue)}
      </span>
    </span>
  )
}

interface PriceDiffProps {
  originalPrice: number | null | undefined
  currentPrice: number | null | undefined
  counterPrice?: number | null
  className?: string
}

/**
 * Specialized price diff that handles counter-offers
 */
export function PriceDiff({
  originalPrice,
  currentPrice,
  counterPrice,
  className,
}: PriceDiffProps) {
  const displayPrice = counterPrice ?? currentPrice
  const hasChange =
    originalPrice !== null &&
    originalPrice !== undefined &&
    originalPrice !== displayPrice

  const formatPrice = (val: number | null | undefined) => {
    if (val === null || val === undefined) return 'TBD'
    return `$${val.toLocaleString()}`
  }

  if (!hasChange) {
    return (
      <span className={cn('font-semibold', className)}>
        {formatPrice(displayPrice)}
      </span>
    )
  }

  return (
    <span className={cn('inline-flex flex-col gap-0.5', className)}>
      <span className="text-muted-foreground line-through text-xs">
        {formatPrice(originalPrice)}
      </span>
      <span
        className={cn(
          'px-1 rounded font-semibold',
          counterPrice
            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
            : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
        )}
      >
        {formatPrice(displayPrice)}
        {counterPrice && <span className="text-xs ml-1">(counter)</span>}
      </span>
    </span>
  )
}

interface TotalsDiffProps {
  originalTotal: number
  currentTotal: number
  className?: string
}

/**
 * Shows totals with difference
 */
export function TotalsDiff({
  originalTotal,
  currentTotal,
  className,
}: TotalsDiffProps) {
  const difference = currentTotal - originalTotal
  const hasChange = difference !== 0

  return (
    <div className={cn('flex items-center gap-4', className)}>
      <div className="text-sm text-muted-foreground">
        Original: ${originalTotal.toLocaleString()}
      </div>
      <div className="text-lg font-bold">
        Total: ${currentTotal.toLocaleString()}
      </div>
      {hasChange && (
        <div
          className={cn(
            'text-sm font-medium px-2 py-0.5 rounded',
            difference > 0
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          )}
        >
          {difference > 0 ? '+' : ''}${difference.toLocaleString()}
        </div>
      )}
    </div>
  )
}
