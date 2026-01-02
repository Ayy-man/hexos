'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Download, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ProjectFileItem } from '@/lib/api/project-files.shared'
import { getFileCategory, formatFileSize, getMimeTypeLabel } from '@/lib/file-types'
import { getFileSignedUrlAction } from '../../actions/fileActions'
import {
  ImageViewer,
  PdfViewer,
  CodeViewer,
  VideoViewer,
  AudioViewer,
  UnsupportedViewer,
} from './viewers'

interface FileViewerModalProps {
  file: ProjectFileItem | null
  onClose: () => void
}

export function FileViewerModal({ file, onClose }: FileViewerModalProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch signed URL when file changes
  useEffect(() => {
    if (!file || !file.file_path) {
      setSignedUrl(null)
      setIsLoading(false)
      return
    }

    async function fetchSignedUrl() {
      try {
        setIsLoading(true)
        setError(null)
        const url = await getFileSignedUrlAction(file.file_path)
        setSignedUrl(url)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load file')
      } finally {
        setIsLoading(false)
      }
    }

    fetchSignedUrl()
  }, [file])

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleDownload = useCallback(() => {
    if (!signedUrl || !file) return

    const link = document.createElement('a')
    link.href = signedUrl
    link.download = file.file_name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [signedUrl, file])

  if (!file) return null

  const category = getFileCategory(file.file_name)

  const renderViewer = () => {
    if (isLoading) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )
    }

    if (error || !signedUrl) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <div className="text-center">
            <p className="font-medium">Failed to load file</p>
            <p className="text-sm text-muted-foreground mt-1">{error || 'Unable to generate download URL'}</p>
          </div>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      )
    }

    switch (category) {
      case 'image':
        return <ImageViewer url={signedUrl} filename={file.file_name} />
      case 'pdf':
        return <PdfViewer url={signedUrl} filename={file.file_name} />
      case 'code':
        return <CodeViewer url={signedUrl} filename={file.file_name} />
      case 'video':
        return <VideoViewer url={signedUrl} filename={file.file_name} />
      case 'audio':
        return <AudioViewer url={signedUrl} filename={file.file_name} />
      case 'unsupported':
      default:
        return (
          <UnsupportedViewer
            url={signedUrl}
            filename={file.file_name}
            fileSize={file.file_size}
            onDownload={handleDownload}
          />
        )
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-medium truncate">{file.file_name}</h1>
        </div>
      </div>

      {/* Viewer Content */}
      <div className="flex-1 flex flex-col overflow-hidden">{renderViewer()}</div>

      {/* Footer */}
      <div className="border-t px-4 py-3 flex items-center justify-between shrink-0 bg-muted/30">
        <Button variant="outline" size="sm" onClick={handleDownload} disabled={!signedUrl} className="gap-2">
          <Download className="h-4 w-4" />
          Download
        </Button>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{formatFileSize(file.file_size)}</span>
          <span className="w-px h-4 bg-border" />
          <span>{getMimeTypeLabel(file.file_type)}</span>
        </div>
      </div>
    </div>
  )
}
