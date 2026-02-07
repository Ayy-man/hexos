'use client'

interface PdfViewerProps {
  url: string
  filename: string
}

export function PdfViewer({ url, filename }: PdfViewerProps) {
  return (
    <div className="flex-1 flex flex-col">
      <iframe
        src={url}
        title={filename}
        className="flex-1 w-full border-0"
      />
    </div>
  )
}
