'use client'

interface ImageViewerProps {
  url: string
  filename: string
}

export function ImageViewer({ url, filename }: ImageViewerProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-muted/20">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={filename}
        className="max-w-full max-h-full object-contain"
      />
    </div>
  )
}
