'use client'

import * as React from 'react'
import { Plate, usePlateEditor } from 'platejs/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Editor, EditorContainer } from '@/components/ui/editor'
import { FloatingToolbar } from '@/components/ui/floating-toolbar'
import { FloatingToolbarButtons } from '@/components/ui/floating-toolbar-buttons'
import { Skeleton } from '@/components/ui/skeleton'
import { InquiryDocumentPlugins } from './editor/plugins'
import { Button } from '@/components/ui/button'
import { FileText, Save, CheckCircle, Maximize2 } from 'lucide-react'

interface InquiryDocumentProps {
  inquiryId: string
  initialContent: unknown
  generatedContent: unknown // Pre-generated from form_data
  readOnly?: boolean
  onSave?: (content: unknown) => Promise<void>
  onFullscreen?: () => void
}

export function InquiryDocument({
  inquiryId,
  initialContent,
  generatedContent,
  readOnly = false,
  onSave,
  onFullscreen,
}: InquiryDocumentProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Use saved content if available, otherwise use generated content from form_data
  const parsedInitialContent = React.useMemo(() => {
    if (initialContent && Array.isArray(initialContent) && initialContent.length > 0) {
      return initialContent
    }
    // Use pre-generated content from inquiry form_data
    if (generatedContent && Array.isArray(generatedContent) && generatedContent.length > 0) {
      return generatedContent
    }
    // Fallback
    return [{ type: 'p', children: [{ text: 'No content available' }] }]
  }, [initialContent, generatedContent])

  const editor = usePlateEditor({
    plugins: InquiryDocumentPlugins,
    value: parsedInitialContent,
  })

  // Debounced auto-save function
  const debouncedSave = useCallback(
    async (content: unknown) => {
      if (!onSave || readOnly) return

      setIsSaving(true)
      try {
        await onSave(content)
        setLastSaved(new Date())
        setHasChanges(false)
      } catch (error) {
        console.error('Failed to save document:', error)
      } finally {
        setIsSaving(false)
      }
    },
    [onSave, readOnly]
  )

  // Handle editor changes with debounce
  const handleChange = useCallback(
    (value: { value: unknown }) => {
      if (readOnly) return

      setHasChanges(true)

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      // Set new timeout for auto-save (1.5 seconds after last change)
      saveTimeoutRef.current = setTimeout(() => {
        debouncedSave(value.value)
      }, 1500)
    },
    [debouncedSave, readOnly]
  )

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  // Save status indicator
  const SaveStatus = () => {
    if (isSaving) {
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Save className="h-3 w-3 animate-pulse" />
          Saving...
        </span>
      )
    }
    if (lastSaved) {
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <CheckCircle className="h-3 w-3 text-green-500" />
          Saved
        </span>
      )
    }
    if (hasChanges) {
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-yellow-500" />
          Unsaved changes
        </span>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Document
            {readOnly && (
              <span className="text-xs font-normal text-muted-foreground">
                (Read Only)
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {!readOnly && <SaveStatus />}
            {onFullscreen && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onFullscreen}
                className="h-8 w-8"
                title="Open fullscreen"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Plate
          editor={editor}
          onChange={handleChange}
          readOnly={readOnly}
        >
          <EditorContainer className="min-h-[400px] rounded-lg border bg-background">
            <Editor
              placeholder="Start writing..."
              variant="fullWidth"
              className="px-6 py-4"
            />
          </EditorContainer>

          {/* Floating toolbar appears on text selection */}
          <FloatingToolbar>
            <FloatingToolbarButtons />
          </FloatingToolbar>
        </Plate>
      </CardContent>
    </Card>
  )
}

// Loading skeleton for the document editor
export function InquiryDocumentSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[400px] w-full rounded-lg" />
      </CardContent>
    </Card>
  )
}
