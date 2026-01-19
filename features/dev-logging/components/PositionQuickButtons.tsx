'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PositionQuickButtonsProps {
  currentDelta: number
  onDeltaChange: (delta: number) => void
  currentPosition: number
}

const deltas = [
  { value: -5, label: '-5%', color: 'text-red-600' },
  { value: 0, label: '0%', color: 'text-gray-600' },
  { value: 5, label: '+5%', color: 'text-green-600' },
  { value: 10, label: '+10%', color: 'text-green-700' },
  { value: 15, label: '+15%', color: 'text-green-800' },
]

export function PositionQuickButtons({
  currentDelta,
  onDeltaChange,
  currentPosition,
}: PositionQuickButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {deltas.map(({ value, label, color }) => {
        const isSelected = currentDelta === value
        const newPosition = currentPosition + value
        const isDisabled = newPosition < 0 || newPosition > 100

        return (
          <Button
            key={value}
            type="button"
            variant={isSelected ? 'default' : 'outline'}
            size="sm"
            onClick={() => onDeltaChange(value)}
            disabled={isDisabled}
            className={cn(
              'min-w-[60px]',
              !isSelected && color
            )}
          >
            {label}
          </Button>
        )
      })}
    </div>
  )
}
