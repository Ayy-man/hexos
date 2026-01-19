'use client'

import { useState, useCallback, useTransition } from 'react'
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
import { Save, Loader2, Check, Trash2, BookmarkPlus } from 'lucide-react'
import {
  updateGameplanContentAction,
  createCheckpointAction,
  updateDocumentTitleAction,
  deleteDocumentAction,
} from '../../actions/documentActions'
import { useDebouncedCallback } from '@/hooks/use-debounce'
import type { ProjectDocument } from '@/lib/api/project-documents'
import type { ProjectMentionables } from '@/lib/api/mentionables'

interface GameplanEditorProps {
  document: ProjectDocument
  projectId: string
  mentionables: ProjectMentionables
  canEdit: boolean
  canDelete: boolean
  onDeleted?: () => void
}

export function GameplanEditor({
  document,
  projectId,
  mentionables,
  canEdit,
  canDelete,
  onDeleted,
}: GameplanEditorProps) {
  const [isPending, startTransition] = useTransition()
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [title, setTitle] = useState(document.title)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleInput, setTitleInput] = useState(document.title)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showCheckpointDialog, setShowCheckpointDialog] = useState(false)
  const [checkpointName, setCheckpointName] = useState('')

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

  // Debounced auto-save for content
  const debouncedSave = useDebouncedCallback(
    (content: unknown) => {
      startTransition(async () => {
        await updateGameplanContentAction(document.id, projectId, content)
        setHasUnsavedChanges(false)
        setLastSaved(new Date())
      })
    },
    1500
  )

  const handleChange = useCallback(
    (value: { value: unknown }) => {
      if (!canEdit) return
      setHasUnsavedChanges(true)
      debouncedSave(value.value)
    },
    [debouncedSave, canEdit]
  )

  const handleManualSave = () => {
    if (!canEdit) return
    startTransition(async () => {
      await updateGameplanContentAction(document.id, projectId, editor.children)
      setHasUnsavedChanges(false)
      setLastSaved(new Date())
    })
  }

  const handleTitleSave = () => {
    if (!canEdit) return
    if (titleInput.trim() && titleInput !== title) {
      startTransition(async () => {
        await updateDocumentTitleAction(document.id, projectId, titleInput.trim())
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

  const handleCreateCheckpoint = () => {
    if (!canEdit || !checkpointName.trim()) return
    startTransition(async () => {
      await createCheckpointAction(document.id, projectId, editor.children, checkpointName.trim())
      setCheckpointName('')
      setShowCheckpointDialog(false)
    })
  }

  const handleDelete = () => {
    if (!canDelete) return
    startTransition(async () => {
      await deleteDocumentAction(document.id, projectId)
      setShowDeleteDialog(false)
      onDeleted?.()
    })
  }

  return (
    <MentionablesProvider
      users={mentionableUsers}
      deliverables={mentionableDeliverables}
    >
      <div className="flex flex-col h-full border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="border-b px-4 py-3 flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-4">
            {isEditingTitle && canEdit ? (
              <div className="flex items-center gap-2">
                <Input
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onKeyDown={handleTitleKeyDown}
                  onBlur={handleTitleSave}
                  className="h-8 w-64"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleTitleSave}
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <h2
                className={`text-lg font-semibold ${canEdit ? 'cursor-pointer hover:text-primary' : ''}`}
                onClick={() => canEdit && setIsEditingTitle(true)}
              >
                {title}
              </h2>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground mr-2">
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

            {canEdit && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCheckpointDialog(true)}
                >
                  <BookmarkPlus className="h-4 w-4 mr-2" />
                  Checkpoint
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualSave}
                  disabled={isPending || !hasUnsavedChanges}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </>
            )}

            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-auto">
          <Plate editor={editor} onChange={handleChange}>
            {canEdit && (
              <FixedToolbar>
                <FixedToolbarButtons />
              </FixedToolbar>
            )}
            <EditorContainer>
              <Editor placeholder="Start writing your gameplan..." />
            </EditorContainer>
          </Plate>
        </div>

        {/* Checkpoint Dialog */}
        <AlertDialog open={showCheckpointDialog} onOpenChange={setShowCheckpointDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Create Checkpoint</AlertDialogTitle>
              <AlertDialogDescription>
                Give this checkpoint a name to easily find it later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input
              value={checkpointName}
              onChange={(e) => setCheckpointName(e.target.value)}
              placeholder="e.g., Before major changes"
              className="mt-2"
            />
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCreateCheckpoint}
                disabled={!checkpointName.trim() || isPending}
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Create
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Document</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{title}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MentionablesProvider>
  )
}
