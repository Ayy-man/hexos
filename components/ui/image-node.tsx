'use client'

import { cn } from '@/lib/utils'
import { PlateElement, type PlateElementProps } from 'platejs/react'
import { useState } from 'react'

interface ImageElementData {
  url: string
  width?: number
  align?: 'left' | 'center' | 'right'
}

export function ImageElement({
  className,
  children,
  ...props
}: PlateElementProps) {
  const element = props.element as unknown as ImageElementData
  const { url, width, align = 'center' } = element
  const [isLoading, setIsLoading] = useState(true)

  return (
    <PlateElement
      className={cn(
        'my-4',
        align === 'center' && 'mx-auto',
        align === 'left' && 'mr-auto',
        align === 'right' && 'ml-auto',
        className
      )}
      {...props}
    >
      <figure
        className={cn(
          'relative',
          width ? `max-w-[${width}px]` : 'max-w-full'
        )}
        contentEditable={false}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted-foreground border-t-transparent" />
          </div>
        )}
        <img
          src={url}
          alt=""
          className={cn(
            'rounded-lg max-w-full h-auto',
            isLoading && 'opacity-0'
          )}
          onLoad={() => setIsLoading(false)}
          onError={() => setIsLoading(false)}
        />
      </figure>
      {children}
    </PlateElement>
  )
}
