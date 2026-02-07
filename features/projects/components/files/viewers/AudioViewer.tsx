'use client'

import { Music } from 'lucide-react'

interface AudioViewerProps {
  url: string
  filename: string
}

export function AudioViewer({ url, filename }: AudioViewerProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 p-4">
      <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
        <Music className="h-12 w-12 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{filename}</p>
      <audio src={url} controls className="max-w-md w-full">
        Your browser does not support the audio tag.
      </audio>
    </div>
  )
}
