'use client'

import { cn } from '@/lib/utils'
import { TrendingUp, Coffee, AlertTriangle } from 'lucide-react'

export type CheckinType = 'progress' | 'no_work' | 'delay'

interface CheckinTypeSelectorProps {
  value: CheckinType
  onChange: (type: CheckinType) => void
}

const types: Array<{
  value: CheckinType
  label: string
  description: string
  icon: React.ReactNode
  color: string
}> = [
  {
    value: 'progress',
    label: 'Made Progress',
    description: 'Worked on deliverables',
    icon: <TrendingUp className="h-5 w-5" />,
    color: 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
  },
  {
    value: 'no_work',
    label: 'No Work',
    description: 'Did not work on this project',
    icon: <Coffee className="h-5 w-5" />,
    color: 'text-gray-600 bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-800',
  },
  {
    value: 'delay',
    label: 'Blocked',
    description: 'Waiting on client/external',
    icon: <AlertTriangle className="h-5 w-5" />,
    color: 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800',
  },
]

export function CheckinTypeSelector({ value, onChange }: CheckinTypeSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {types.map((type) => (
        <button
          key={type.value}
          type="button"
          onClick={() => onChange(type.value)}
          className={cn(
            'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
            value === type.value
              ? `${type.color} ring-2 ring-offset-2 ring-primary`
              : 'border-muted hover:border-muted-foreground/50'
          )}
        >
          <div className={cn(value === type.value && type.color.split(' ')[0])}>
            {type.icon}
          </div>
          <div className="text-center">
            <div className="font-medium text-sm">{type.label}</div>
            <div className="text-xs text-muted-foreground">{type.description}</div>
          </div>
        </button>
      ))}
    </div>
  )
}
