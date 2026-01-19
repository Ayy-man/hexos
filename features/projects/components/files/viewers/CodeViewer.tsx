'use client'

import { useState, useEffect } from 'react'
import { Loader2, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getFileExtension, getLanguageFromExtension } from '@/lib/file-types'
import { cn } from '@/lib/utils'

interface CodeViewerProps {
  url: string
  filename: string
}

export function CodeViewer({ url, filename }: CodeViewerProps) {
  const [content, setContent] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const extension = getFileExtension(filename)
  const language = getLanguageFromExtension(extension)

  useEffect(() => {
    async function fetchContent() {
      try {
        setIsLoading(true)
        setError(null)
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`)
        }
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

  const handleCopy = async () => {
    if (!content) return
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API might not be available
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>Failed to load file content</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    )
  }

  const lines = content?.split('\n') || []

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header with language and copy button */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <span className="text-xs font-mono text-muted-foreground uppercase">{language}</span>
        <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-2">
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy
            </>
          )}
        </Button>
      </div>

      {/* Code content with line numbers */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-full">
          <pre className="text-sm">
            <code className="block">
              {lines.map((line, index) => (
                <div key={index} className="flex hover:bg-muted/30">
                  <span
                    className={cn(
                      'select-none text-right pr-4 pl-4 text-muted-foreground/50 border-r border-border/50',
                      'min-w-[3rem] bg-muted/20'
                    )}
                  >
                    {index + 1}
                  </span>
                  <span className="pl-4 pr-4 flex-1 whitespace-pre font-mono">
                    {line || ' '}
                  </span>
                </div>
              ))}
            </code>
          </pre>
        </div>
      </div>
    </div>
  )
}
