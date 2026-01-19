'use client'

import * as React from 'react'
import type { PlateElementProps } from 'platejs/react'
import { PlateElement } from 'platejs/react'
import { cn } from '@/lib/utils'

export function CodeBlockElement(props: PlateElementProps) {
  return (
    <PlateElement
      {...props}
      as="pre"
      className={cn(
        'relative my-4 overflow-x-auto rounded-lg border bg-muted/50 p-4 font-mono text-sm',
        props.className
      )}
    >
      <code className="block whitespace-pre">{props.children}</code>
    </PlateElement>
  )
}

export function CodeLineElement(props: PlateElementProps) {
  return (
    <PlateElement {...props} as="div" className="min-h-[1.5em]">
      {props.children}
    </PlateElement>
  )
}

export function CodeSyntaxLeaf(props: PlateElementProps) {
  return (
    <PlateElement {...props} as="span">
      {props.children}
    </PlateElement>
  )
}
