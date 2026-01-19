'use client'

import { useState, useCallback, useTransition } from 'react'
import { Plate, usePlateEditor } from 'platejs/react'
import { Editor, EditorContainer } from '@/components/ui/editor'
import { FixedToolbar } from '@/components/ui/fixed-toolbar'
import { FixedToolbarButtons } from '@/components/ui/fixed-toolbar-buttons'
import { BlueprintEditorPlugins } from '@/components/editor/plugins/blueprint-editor-kit'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Save, Loader2, X, Check } from 'lucide-react'
import { updateDocumentContentAction, renameItemAction } from '../../actions/fileActions'
import { useDebouncedCallback } from '@/hooks/use-debounce'

interface DocumentEditorProps {
  documentId: string
  projectId: string
  initialTitle: string
  initialContent: unknown
  onClose: () => void
}

export function DocumentEditor({
  documentId,
  projectId,
  initialTitle,
  initialContent,
  onClose,
}: DocumentEditorProps) {
  const [isPending, startTransition] = useTransition()
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [title, setTitle] = useState(initialTitle)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleInput, setTitleInput] = useState(initialTitle)

  const editor = usePlateEditor({
    plugins: BlueprintEditorPlugins,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: initialContent as any,
  })

  // Debounced auto-save for content
  const debouncedSave = useDebouncedCallback(
    (content: unknown) => {
      startTransition(async () => {
        await updateDocumentContentAction(documentId, content)
        setHasUnsavedChanges(false)
        setLastSaved(new Date())
      })
    },
    1500
  )

  const handleChange = useCallback(
    (value: { value: unknown }) => {
      setHasUnsavedChanges(true)
      debouncedSave(value.value)
    },
    [debouncedSave]
  )

  const handleManualSave = () => {
    startTransition(async () => {
      await updateDocumentContentAction(documentId, editor.children)
      setHasUnsavedChanges(false)
      setLastSaved(new Date())
    })
  }

  const handleTitleSave = () => {
    if (titleInput.trim() && titleInput !== title) {
      startTransition(async () => {
        await renameItemAction(documentId, titleInput.trim())
        setTitle(titleInput.trim())
        setIsEditingTitle(false)
      })
    } else {
      setTitleInput(title)
      setIsEditingTitle(false)
    }
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave()
    } else if (e.key === 'Escape') {
      setTitleInput(title)
      setIsEditingTitle(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>

          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <Input
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onKeyDown={handleTitleKeyDown}
                onBlur={handleTitleSave}
                className="h-8 w-64"
                autoFocus
              />
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleTitleSave}>
                <Check className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <h1
              className="text-lg font-semibold cursor-pointer hover:text-primary"
              onClick={() => setIsEditingTitle(true)}
            >
              {title}
            </h1>
          )}
        </div>

        <div className="flex items-center gap-4">
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
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualSave}
            disabled={isPending || !hasUnsavedChanges}
          >
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <Plate editor={editor} onChange={handleChange}>
          <FixedToolbar className="border-b rounded-none">
            <FixedToolbarButtons />
          </FixedToolbar>

          <EditorContainer className="h-[calc(100%-40px)] overflow-auto bg-background">
            <Editor
              variant="fullWidth"
              className="px-8 py-6 max-w-4xl mx-auto"
              placeholder="Start writing..."
            />
          </EditorContainer>
        </Plate>
      </div>
    </div>
  )
}
