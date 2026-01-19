'use client'

import * as React from 'react'
import type { PlateElementProps } from 'platejs/react'
import { cn } from '@/lib/utils'

export function BlockquoteElement({
  children,
  className,
  ...props
}: PlateElementProps) {
  return (
    <blockquote
      className={cn(
        'my-2 border-l-2 border-muted-foreground/30 pl-4 italic text-muted-foreground',
        className
      )}
      {...props}
    >
      {children}
    </blockquote>
  )
}
