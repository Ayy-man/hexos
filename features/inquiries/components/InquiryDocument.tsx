'use client'

import * as React from 'react'
import { Plate, usePlateEditor } from 'platejs/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Editor, EditorContainer } from '@/components/ui/editor'
import { Skeleton } from '@/components/ui/skeleton'
import { InquiryDocumentPlugins } from './editor/plugins'
import { FileText, Save, CheckCircle } from 'lucide-react'

interface InquiryDocumentProps {
  inquiryId: string
  initialContent: unknown
  readOnly?: boolean
  onSave?: (content: unknown) => Promise<void>
}

// Default empty document content
const defaultValue = [
  {
    type: 'h2',
    children: [{ text: 'Internal Notes' }],
  },
  {
    type: 'p',
    children: [{ text: 'Add notes about this inquiry here...' }],
  },
]

export function InquiryDocument({
  inquiryId,
  initialContent,
  readOnly = false,
  onSave,
}: InquiryDocumentProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Parse initial content or use default
  const parsedInitialContent = React.useMemo(() => {
    if (initialContent && Array.isArray(initialContent) && initialContent.length > 0) {
      return initialContent
    }
    return defaultValue
  }, [initialContent])

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
          {!readOnly && <SaveStatus />}
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
