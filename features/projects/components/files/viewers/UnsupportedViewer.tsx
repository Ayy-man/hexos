'use client'

import { FileIcon, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatFileSize } from '@/lib/file-types'

interface UnsupportedViewerProps {
  url: string
  filename: string
  fileSize: number | null
  onDownload: () => void
}

export function UnsupportedViewer({ filename, fileSize, onDownload }: UnsupportedViewerProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 p-4">
      <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center">
        <FileIcon className="h-12 w-12 text-muted-foreground" />
      </div>
      <div className="text-center">
        <p className="font-medium">{filename}</p>
        <p className="text-sm text-muted-foreground mt-1">
          {formatFileSize(fileSize)}
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        Preview not available for this file type
      </p>
      <Button onClick={onDownload} className="gap-2">
        <Download className="h-4 w-4" />
        Download File
      </Button>
    </div>
  )
}
