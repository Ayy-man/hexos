'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'

interface CodeViewerProps {
  url: string
  filename: string
}

export function CodeViewer({ url, filename }: CodeViewerProps) {
  const [content, setContent] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchContent() {
      try {
        setIsLoading(true)
        const response = await fetch(url)
        if (!response.ok) throw new Error('Failed to load file')
        const text = await response.text()
        setContent(text)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load file')
      } finally {
        setIsLoading(false)
      }
    }

    fetchContent()
  }, [url])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        {error}
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto bg-muted/20">
      <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-words">
        <code>{content}</code>
      </pre>
    </div>
  )
}
