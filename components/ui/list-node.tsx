'use client'

import * as React from 'react'
import type { PlateElementProps } from 'platejs/react'
import { PlateElement } from 'platejs/react'
import { cn } from '@/lib/utils'

export function BulletedListElement({
  children,
  className,
  ...props
}: PlateElementProps) {
  return (
    <PlateElement as="ul" className={cn('my-2 ml-6 list-disc [&>li]:mt-1', className)} {...props}>
      {children}
    </PlateElement>
  )
}

export function NumberedListElement({
  children,
  className,
  ...props
}: PlateElementProps) {
  return (
    <PlateElement as="ol" className={cn('my-2 ml-6 list-decimal [&>li]:mt-1', className)} {...props}>
      {children}
    </PlateElement>
  )
}

export function ListItemElement({
  children,
  className,
  ...props
}: PlateElementProps) {
  return (
    <PlateElement as="li" className={cn('', className)} {...props}>
      {children}
    </PlateElement>
  )
}

export function ListItemContentElement({
  children,
  className,
  ...props
}: PlateElementProps) {
  return (
    <PlateElement as="span" className={cn('', className)} {...props}>
      {children}
    </PlateElement>
  )
}
