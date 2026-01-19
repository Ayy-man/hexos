'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { BlockLoader } from './block-loader'

const LOADING_MESSAGES = [
  'Loading deliverables...',
  'Syncing progress...',
  'Fetching documents...',
  'Preparing workspace...',
  'Loading hill chart...',
  'Gathering project data...',
  'Connecting the dots...',
  'Assembling timeline...',
  'Loading conversations...',
  'Almost ready...',
]

interface HexLoaderProps {
  size?: 'sm' | 'md' | 'lg'
  showMessage?: boolean
  className?: string
}

export function HexLoader({ size = 'md', showMessage = false, className }: HexLoaderProps) {
  const [messageIndex, setMessageIndex] = useState(() =>
    Math.floor(Math.random() * LOADING_MESSAGES.length)
  )

  useEffect(() => {
    if (!showMessage) return

    const interval = setInterval(() => {
      setMessageIndex((prev) => {
        // Pick a random different index
        let next = Math.floor(Math.random() * LOADING_MESSAGES.length)
        while (next === prev && LOADING_MESSAGES.length > 1) {
          next = Math.floor(Math.random() * LOADING_MESSAGES.length)
        }
        return next
      })
    }, 2500)

    return () => clearInterval(interval)
  }, [showMessage])

  // Map size to BlockLoader dimensions
  const blockSizes = {
    sm: { size: 20, gap: 2 },
    md: { size: 35, gap: 3 },
    lg: { size: 50, gap: 4 },
  }

  const { size: blockSize, gap } = blockSizes[size]

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      {/* Block loader animation */}
      <BlockLoader
        blockColor="bg-primary"
        borderColor="border-primary"
        size={blockSize}
        gap={gap}
        speed={1.2}
      />

      {/* Cycling message */}
      {showMessage && (
        <p className="text-sm text-muted-foreground">
          {LOADING_MESSAGES[messageIndex]}
        </p>
      )}
    </div>
  )
}

/**
 * Full-page centered loader with message
 */
export function HexLoaderCentered({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center h-full min-h-[200px]', className)}>
      <HexLoader size="lg" showMessage />
    </div>
  )
}

/**
 * Inline loader without message
 */
export function HexLoaderInline({ className }: { className?: string }) {
  return <HexLoader size="sm" className={className} />
}
