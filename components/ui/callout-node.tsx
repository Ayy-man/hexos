'use client'

import * as React from 'react'
import type { PlateElementProps } from 'platejs/react'
import { PlateElement } from 'platejs/react'
import { cn } from '@/lib/utils'
import { AlertCircle, Info, Lightbulb, AlertTriangle } from 'lucide-react'

// Variant configurations
const variants = {
  info: {
    icon: Info,
    className: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200',
  },
  warning: {
    icon: AlertTriangle,
    className: 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200',
  },
  error: {
    icon: AlertCircle,
    className: 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200',
  },
  tip: {
    icon: Lightbulb,
    className: 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200',
  },
  default: {
    icon: Info,
    className: 'border-muted-foreground/20 bg-muted/50',
  },
}

type CalloutVariant = keyof typeof variants

export function CalloutElement(props: PlateElementProps) {
  const element = props.element as { variant?: CalloutVariant; icon?: string }
  const variant = element.variant || 'default'
  const config = variants[variant] || variants.default
  const Icon = config.icon

  return (
    <PlateElement
      {...props}
      as="div"
      className={cn(
        'my-4 flex gap-3 rounded-lg border p-4',
        config.className,
        props.className
      )}
    >
      <div className="flex-shrink-0 pt-0.5">
        {element.icon ? (
          <span className="text-lg">{element.icon}</span>
        ) : (
          <Icon className="h-5 w-5" />
        )}
      </div>
      <div className="flex-1 min-w-0">{props.children}</div>
    </PlateElement>
  )
}
