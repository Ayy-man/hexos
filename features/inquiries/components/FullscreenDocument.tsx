'use client'

import { useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { X, Minimize2 } from 'lucide-react'
import { Plate, usePlateEditor } from 'platejs/react'
import { Editor, EditorContainer } from '@/components/ui/editor'
import { FloatingToolbar } from '@/components/ui/floating-toolbar'
import { FloatingToolbarButtons } from '@/components/ui/floating-toolbar-buttons'
import { CommentsSidebar } from './CommentsSidebar'
import { InquiryDocumentPlugins } from './editor/plugins'
import type { InquiryComment } from '@/lib/api/inquiry-comments'

interface FullscreenDocumentProps {
  inquiryId: string
  documentContent: unknown
  comments: InquiryComment[]
  readOnly: boolean
  canComment: boolean
  canEdit: boolean
  onClose: () => void
  onSave?: (content: unknown) => Promise<void>
  onAddComment?: (content: string, parentId?: string) => Promise<void>
  onResolve?: (commentId: string, resolved: boolean) => Promise<void>
  onDelete?: (commentId: string) => Promise<void>
}

export function FullscreenDocument({
  inquiryId,
  documentContent,
  comments,
  readOnly,
  canComment,
  canEdit,
  onClose,
  onSave,
  onAddComment,
  onResolve,
  onDelete,
}: FullscreenDocumentProps) {
  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Prevent body scroll when fullscreen is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const editor = usePlateEditor({
    plugins: InquiryDocumentPlugins,
    value: documentContent as any,
  })

  const handleChange = useCallback(
    (value: { value: unknown }) => {
      if (readOnly || !onSave) return
      // Auto-save is handled by debounce in parent - we just pass changes up
      onSave(value.value)
    },
    [onSave, readOnly]
  )

  const modalContent = (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-3">
        <h2 className="text-lg font-semibold">Document View</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content - Side by side */}
      <div className="flex flex-1 overflow-hidden">
        {/* Document Editor - 70% */}
        <div className="flex-[7] overflow-auto border-r">
          <Plate
            editor={editor}
            onChange={handleChange}
            readOnly={readOnly}
          >
            <EditorContainer className="min-h-full bg-background">
              <Editor
                placeholder="Start writing..."
                variant="fullWidth"
                className="mx-auto max-w-4xl px-12 py-8"
              />
            </EditorContainer>

            <FloatingToolbar>
              <FloatingToolbarButtons />
            </FloatingToolbar>
          </Plate>
        </div>

        {/* Comments Sidebar - 30% */}
        <div className="flex-[3] overflow-auto bg-muted/30 p-4">
          <CommentsSidebar
            inquiryId={inquiryId}
            comments={comments}
            canEdit={canComment}
            onAddComment={onAddComment}
            onResolve={canEdit ? onResolve : undefined}
            onDelete={canEdit ? onDelete : undefined}
          />
        </div>
      </div>

      {/* Footer hint */}
      <div className="border-t px-6 py-2 text-center text-xs text-muted-foreground">
        Press <kbd className="rounded border px-1">Esc</kbd> or click{' '}
        <Minimize2 className="inline h-3 w-3" /> to exit fullscreen
      </div>
    </div>
  )

  // Use portal to render at document root
  if (typeof window === 'undefined') return null
  return createPortal(modalContent, document.body)
}
