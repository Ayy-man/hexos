'use client'

import * as React from 'react'
import type { PlateElementProps } from 'platejs/react'
import { cn } from '@/lib/utils'

export function ParagraphElement({
  children,
  className,
  ...props
}: PlateElementProps) {
  return (
    <p className={cn('m-0 px-0 py-1', className)} {...props}>
      {children}
    </p>
  )
}
