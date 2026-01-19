'use client'

import { useState } from 'react'
import { Loader2, Music } from 'lucide-react'

interface AudioViewerProps {
  url: string
  filename: string
}

export function AudioViewer({ url, filename }: AudioViewerProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>Failed to load audio</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 gap-8">
      {/* Album art placeholder */}
      <div className="w-48 h-48 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
        <Music className="h-20 w-20 text-primary/40" />
      </div>

      {/* Filename */}
      <p className="text-lg font-medium text-center max-w-md truncate">{filename}</p>

      {/* Audio player */}
      <div className="w-full max-w-md">
        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        <audio
          src={url}
          controls
          className="w-full"
          onLoadedData={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false)
            setError('Could not load audio')
          }}
        >
          Your browser does not support the audio tag.
        </audio>
      </div>
    </div>
  )
}
