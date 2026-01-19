'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'

interface VideoViewerProps {
  url: string
  filename: string
}

export function VideoViewer({ url, filename }: VideoViewerProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>Failed to load video</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-black/90">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      )}
      <video
        src={url}
        controls
        className="max-w-full max-h-full"
        onLoadedData={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false)
          setError('Could not load video')
        }}
      >
        <track kind="captions" label={filename} />
        Your browser does not support the video tag.
      </video>
    </div>
  )
}
