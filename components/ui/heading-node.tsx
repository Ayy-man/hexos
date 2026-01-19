'use client'

import * as React from 'react'
import type { PlateElementProps } from 'platejs/react'
import { cn } from '@/lib/utils'

export function H1Element({
  children,
  className,
  ...props
}: PlateElementProps) {
  return (
    <h1
      className={cn(
        'mb-1 mt-6 text-3xl font-bold tracking-tight first:mt-0',
        className
      )}
      {...props}
    >
      {children}
    </h1>
  )
}

export function H2Element({
  children,
  className,
  ...props
}: PlateElementProps) {
  return (
    <h2
      className={cn(
        'mb-1 mt-5 text-2xl font-semibold tracking-tight first:mt-0',
        className
      )}
      {...props}
    >
      {children}
    </h2>
  )
}

export function H3Element({
  children,
  className,
  ...props
}: PlateElementProps) {
  return (
    <h3
      className={cn(
        'mb-1 mt-4 text-xl font-semibold tracking-tight first:mt-0',
        className
      )}
      {...props}
    >
      {children}
    </h3>
  )
}
