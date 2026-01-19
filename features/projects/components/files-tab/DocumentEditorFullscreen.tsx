'use client'

import { useState, useCallback, useTransition, useEffect, useRef } from 'react'
import { Plate, usePlateEditor } from 'platejs/react'
import { Editor, EditorContainer } from '@/components/ui/editor'
import { FixedToolbar } from '@/components/ui/fixed-toolbar'
import { FixedToolbarButtons } from '@/components/ui/fixed-toolbar-buttons'
import { GameplanEditorPlugins } from '@/components/editor/plugins/gameplan-editor-kit'
import {
  MentionablesProvider,
  type MentionableItem,
} from '@/components/editor/plugins/gameplan-mention-kit'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Save, Loader2, BookmarkPlus } from 'lucide-react'
import {
  updateGameplanContentAction,
  createCheckpointAction,
} from '../../actions/documentActions'
import { useDebouncedCallback } from '@/hooks/use-debounce'
import type { ProjectDocument } from '@/lib/api/project-documents'
import type { ProjectMentionables } from '@/lib/api/mentionables'

interface DocumentEditorFullscreenProps {
  document: ProjectDocument
  projectId: string
  mentionables: ProjectMentionables
  canEdit: boolean
}

function formatLastSaved(date: Date | null): string {
  if (!date) return 'Not saved yet'
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Last saved: just now'
  if (diffMins === 1) return 'Last saved: 1 min ago'
  if (diffMins < 60) return `Last saved: ${diffMins} mins ago`
  return `Last saved: ${date.toLocaleTimeString()}`
}

export function DocumentEditorFullscreen({
  document,
  projectId,
  mentionables,
  canEdit,
}: DocumentEditorFullscreenProps) {
  const [isPending, startTransition] = useTransition()
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [showCheckpointDialog, setShowCheckpointDialog] = useState(false)
  const [checkpointName, setCheckpointName] = useState('')
  const contentRef = useRef<unknown>(null)
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const editor = usePlateEditor({
    plugins: GameplanEditorPlugins,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: document.content as any,
    readOnly: !canEdit,
  })

  // Convert mentionables to the format expected by the editor
  const mentionableUsers: MentionableItem[] = mentionables.users.map((u) => ({
    key: u.id,
    text: u.name,
    type: 'user' as const,
    data: { email: u.email },
  }))

  const mentionableDeliverables: MentionableItem[] = mentionables.deliverables.map((d) => ({
    key: d.id,
    text: d.title,
    type: 'deliverable' as const,
    data: { status: d.status },
  }))

  // Save function
  const saveContent = useCallback(async (content: unknown) => {
    if (!canEdit) return
    await updateGameplanContentAction(document.id, projectId, content)
    setHasUnsavedChanges(false)
    setLastSaved(new Date())
  }, [canEdit, document.id, projectId])

  // Debounced auto-save for content (1.5 seconds)
  const debouncedSave = useDebouncedCallback(
    (content: unknown) => {
      startTransition(async () => {
        await saveContent(content)
      })
    },
    1500
  )

  // 30-second interval auto-save
  useEffect(() => {
    if (!canEdit) return

    autoSaveIntervalRef.current = setInterval(() => {
      if (hasUnsavedChanges && contentRef.current) {
        startTransition(async () => {
          await saveContent(contentRef.current)
        })
      }
    }, 30000)

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current)
      }
    }
  }, [canEdit, hasUnsavedChanges, saveContent])

  // Blur handler for immediate save
  const handleBlur = useCallback(() => {
    if (hasUnsavedChanges && contentRef.current && canEdit) {
      startTransition(async () => {
        await saveContent(contentRef.current)
      })
    }
  }, [hasUnsavedChanges, canEdit, saveContent])

  const handleChange = useCallback(
    (value: { value: unknown }) => {
      if (!canEdit) return
      contentRef.current = value.value
      setHasUnsavedChanges(true)
      debouncedSave(value.value)
    },
    [debouncedSave, canEdit]
  )

  const handleManualSave = () => {
    if (!canEdit) return
    startTransition(async () => {
      await saveContent(editor.children)
    })
  }

  const handleCreateCheckpoint = () => {
    if (!canEdit) return
    startTransition(async () => {
      await createCheckpointAction(document.id, projectId, editor.children, checkpointName.trim() || undefined)
      setCheckpointName('')
      setShowCheckpointDialog(false)
      setLastSaved(new Date())
    })
  }

  // Save status indicator
  const saveStatus = isPending ? (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Loader2 className="h-3 w-3 animate-spin" />
      Saving...
    </span>
  ) : hasUnsavedChanges ? (
    <span className="text-xs text-amber-500">Unsaved</span>
  ) : lastSaved ? (
    <span className="text-xs text-muted-foreground">Saved</span>
  ) : null

  return (
    <MentionablesProvider
      users={mentionableUsers}
      deliverables={mentionableDeliverables}
    >
      <div className="flex flex-col h-full w-full" onBlur={handleBlur}>
        {/* Editor with toolbar */}
        <div className="flex-1 min-h-0 overflow-auto">
          <Plate editor={editor} onChange={handleChange}>
            {canEdit && (
              <FixedToolbar className="border-b">
                <div className="flex items-center justify-between w-full">
                  <FixedToolbarButtons />

                  {/* Right side: status + actions */}
                  <div className="flex items-center gap-3 pl-4 border-l border-border/50 ml-2">
                    {saveStatus}

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1.5"
                      onClick={() => setShowCheckpointDialog(true)}
                    >
                      <BookmarkPlus className="h-3.5 w-3.5" />
                      Checkpoint
                    </Button>

                    <Button
                      variant="default"
                      size="sm"
                      className="h-7 text-xs gap-1.5"
                      onClick={handleManualSave}
                      disabled={isPending || !hasUnsavedChanges}
                    >
                      <Save className="h-3.5 w-3.5" />
                      Save
                    </Button>
                  </div>
                </div>
              </FixedToolbar>
            )}
            <EditorContainer className="bg-background">
              <Editor
                variant="fullWidth"
                className="min-h-[calc(100vh-200px)]"
                placeholder="Start writing..."
              />
            </EditorContainer>
          </Plate>
        </div>

        {/* Checkpoint Dialog */}
        <AlertDialog open={showCheckpointDialog} onOpenChange={setShowCheckpointDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Create Checkpoint</AlertDialogTitle>
              <AlertDialogDescription>
                Give this checkpoint a name to easily find it later (optional).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input
              value={checkpointName}
              onChange={(e) => setCheckpointName(e.target.value)}
              placeholder="e.g., Before major changes"
              className="mt-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateCheckpoint()
                }
              }}
            />
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCreateCheckpoint}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Create
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MentionablesProvider>
  )
}
