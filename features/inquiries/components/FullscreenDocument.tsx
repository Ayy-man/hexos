'use client'

import { useEffect, useCallback, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { X, Minimize2 } from 'lucide-react'
import { Plate, usePlateEditor } from 'platejs/react'
import { Editor, EditorContainer } from '@/components/ui/editor'
import { FloatingToolbar } from '@/components/ui/floating-toolbar'
import { FloatingToolbarButtons } from '@/components/ui/floating-toolbar-buttons'
import { createInquiryDocumentPlugins, type DiscussionUser, type TDiscussion } from './editor/plugins'
import { discussionPlugin } from '@/components/editor/plugins/discussion-kit'

interface FullscreenDocumentProps {
  inquiryId: string
  documentContent: unknown
  initialDiscussions?: TDiscussion[]
  readOnly: boolean
  canEdit: boolean
  currentUser?: DiscussionUser
  onClose: () => void
  onSave?: (content: unknown, discussions: TDiscussion[]) => Promise<void>
}

export function FullscreenDocument({
  inquiryId,
  documentContent,
  initialDiscussions,
  readOnly,
  canEdit,
  currentUser,
  onClose,
  onSave,
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

  // Create plugins with current user and initial discussions
  const plugins = useMemo(
    () => createInquiryDocumentPlugins(currentUser, initialDiscussions),
    [currentUser, initialDiscussions]
  )

  const editorRef = useRef<ReturnType<typeof usePlateEditor> | null>(null)

  const editor = usePlateEditor({
    plugins,
    value: documentContent as any,
  })
  // Keep a ref to the editor for use in callbacks
  editorRef.current = editor

  const handleChange = useCallback(
    (value: { value: unknown }) => {
      if (readOnly || !onSave) return
      // Extract current discussions from the editor plugin
      const currentEditor = editorRef.current
      const discussions = currentEditor
        ? (currentEditor.getOption(discussionPlugin, 'discussions') as TDiscussion[])
        : []
      onSave(value.value, discussions)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Document Editor - Full Width */}
        <div className="flex-1 overflow-auto">
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
