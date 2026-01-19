'use client'

import { useEffect, useCallback, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { X, Minimize2, Save, Loader2 } from 'lucide-react'
import { Plate, usePlateEditor } from 'platejs/react'
import { Editor, EditorContainer } from '@/components/ui/editor'
import { FixedToolbar } from '@/components/ui/fixed-toolbar'
import { FixedToolbarButtons } from '@/components/ui/fixed-toolbar-buttons'
import { BlueprintEditorPlugins } from '@/components/editor/plugins/blueprint-editor-kit'
import { useDebouncedCallback } from '@/hooks/use-debounce'
import { updateCaseStudyContentAction } from '../actions/caseStudyActions'

interface FullscreenCaseStudyProps {
  caseStudyId: string
  caseStudyName: string
  caseStudyIcon?: string | null
  content: unknown
  readOnly: boolean
  onClose: () => void
  onSave?: (content: unknown) => Promise<void>
}

export function FullscreenCaseStudy({
  caseStudyId,
  caseStudyName,
  caseStudyIcon,
  content,
  readOnly,
  onClose,
  onSave,
}: FullscreenCaseStudyProps) {
  const [isPending, startTransition] = useTransition()
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

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
    plugins: BlueprintEditorPlugins,
    value: content as any,
  })

  // Debounced auto-save
  const debouncedSave = useDebouncedCallback(
    (newContent: unknown) => {
      if (readOnly) return
      startTransition(async () => {
        if (onSave) {
          await onSave(newContent)
        } else {
          await updateCaseStudyContentAction(caseStudyId, newContent)
        }
        setHasUnsavedChanges(false)
        setLastSaved(new Date())
      })
    },
    1500
  )

  const handleChange = useCallback(
    (value: { value: unknown }) => {
      if (readOnly) return
      setHasUnsavedChanges(true)
      debouncedSave(value.value)
    },
    [debouncedSave, readOnly]
  )

  const handleManualSave = () => {
    startTransition(async () => {
      if (onSave) {
        await onSave(editor.children)
      } else {
        await updateCaseStudyContentAction(caseStudyId, editor.children)
      }
      setHasUnsavedChanges(false)
      setLastSaved(new Date())
    })
  }

  const modalContent = (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-3">
          {caseStudyIcon && <span className="text-2xl">{caseStudyIcon}</span>}
          <h2 className="text-lg font-semibold">{caseStudyName}</h2>
          {readOnly && (
            <span className="text-xs text-muted-foreground">(Read Only)</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {/* Save Status */}
          {!readOnly && (
            <div className="text-sm text-muted-foreground">
              {isPending ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving...
                </span>
              ) : hasUnsavedChanges ? (
                'Unsaved changes'
              ) : lastSaved ? (
                `Saved ${lastSaved.toLocaleTimeString()}`
              ) : (
                'Auto-save enabled'
              )}
            </div>
          )}
          {!readOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualSave}
              disabled={isPending || !hasUnsavedChanges}
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Toolbar (edit mode only) */}
      {!readOnly && (
        <div className="border-b bg-muted/30">
          <Plate editor={editor}>
            <FixedToolbar className="border-0 bg-transparent">
              <FixedToolbarButtons />
            </FixedToolbar>
          </Plate>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <Plate
          editor={editor}
          onChange={handleChange}
          readOnly={readOnly}
        >
          <EditorContainer className="min-h-full bg-background">
            <Editor
              placeholder={readOnly ? 'No content yet...' : 'Start writing...'}
              variant="fullWidth"
              className="mx-auto max-w-4xl px-12 py-8"
            />
          </EditorContainer>
        </Plate>
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
