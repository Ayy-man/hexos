'use client'

import { FileQuestion, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getFileExtension, formatFileSize } from '@/lib/file-types'

interface UnsupportedViewerProps {
  url: string
  filename: string
  fileSize: number | null
  onDownload: () => void
}

export function UnsupportedViewer({ filename, fileSize, onDownload }: UnsupportedViewerProps) {
  const extension = getFileExtension(filename)

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6">
      {/* Large file icon */}
      <div className="w-32 h-32 rounded-2xl bg-muted/50 flex items-center justify-center">
        <FileQuestion className="h-16 w-16 text-muted-foreground" />
      </div>

      {/* Message */}
      <div className="text-center space-y-2">
        <h3 className="text-lg font-medium">Preview not available</h3>
        <p className="text-muted-foreground">
          {extension ? (
            <>
              <span className="font-mono text-sm uppercase">.{extension}</span> files cannot be
              previewed in the browser.
            </>
          ) : (
            'This file type cannot be previewed in the browser.'
          )}
        </p>
        {fileSize && (
          <p className="text-sm text-muted-foreground">{formatFileSize(fileSize)}</p>
        )}
      </div>

      {/* Download button */}
      <Button onClick={onDownload} size="lg" className="gap-2">
        <Download className="h-4 w-4" />
        Download File
      </Button>
    </div>
  )
}
