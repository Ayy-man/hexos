'use client'

import { useState, useCallback, useTransition } from 'react'
import dynamic from 'next/dynamic'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Check, Loader2 } from 'lucide-react'
import { updateWhiteboardContentAction, renameItemAction } from '../../actions/fileActions'
import { useDebouncedCallback } from '@/hooks/use-debounce'

// Dynamic import for Excalidraw (no SSR)
const ExcalidrawWrapper = dynamic(
  () => import('@/components/whiteboard/ExcalidrawWrapper'),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-muted animate-pulse">
        <span className="text-muted-foreground">Loading whiteboard...</span>
      </div>
    ),
  }
)

interface WhiteboardEditorProps {
  whiteboardId: string
  projectId: string
  initialTitle: string
  initialContent: unknown
  onClose: () => void
}

interface ExcalidrawContent {
  elements?: unknown[]
  appState?: Record<string, unknown>
  files?: Record<string, unknown>
}

export function WhiteboardEditor({
  whiteboardId,
  projectId,
  initialTitle,
  initialContent,
  onClose,
}: WhiteboardEditorProps) {
  const { resolvedTheme } = useTheme()
  const [isPending, startTransition] = useTransition()
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [title, setTitle] = useState(initialTitle)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleInput, setTitleInput] = useState(initialTitle)

  // Parse initial content
  const parsedContent = (initialContent as ExcalidrawContent) || {
    elements: [],
    appState: {},
    files: {},
  }

  // Debounced auto-save
  const debouncedSave = useDebouncedCallback(
    (content: unknown) => {
      startTransition(async () => {
        await updateWhiteboardContentAction(whiteboardId, content)
        setHasUnsavedChanges(false)
        setLastSaved(new Date())
      })
    },
    2000 // 2 second debounce for whiteboard (more frequent changes)
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChange = useCallback(
    (elements: unknown[], appState: unknown, files: unknown) => {
      setHasUnsavedChanges(true)
      debouncedSave({ elements, appState, files })
    },
    [debouncedSave]
  )

  const handleTitleSave = () => {
    if (titleInput.trim() && titleInput !== title) {
      startTransition(async () => {
        await renameItemAction(whiteboardId, titleInput.trim())
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
      <div className="border-b px-4 py-3 flex items-center justify-between bg-background z-10">
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
      </div>

      {/* Excalidraw Canvas */}
      <div className="flex-1">
        <ExcalidrawWrapper
          onChange={handleChange}
        />
      </div>
    </div>
  )
}
