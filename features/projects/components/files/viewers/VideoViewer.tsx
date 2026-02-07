'use client'

interface VideoViewerProps {
  url: string
  filename: string
}

export function VideoViewer({ url, filename }: VideoViewerProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-black">
      <video
        src={url}
        controls
        className="max-w-full max-h-full"
        title={filename}
      >
        Your browser does not support the video tag.
      </video>
    </div>
  )
}
