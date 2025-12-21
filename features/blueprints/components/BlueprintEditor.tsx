'use client'

import { useState, useCallback, useTransition, useMemo } from 'react'
import { Plate, usePlateEditor } from 'platejs/react'
import { Editor, EditorContainer } from '@/components/ui/editor'
import { FloatingToolbar } from '@/components/ui/floating-toolbar'
import { FloatingToolbarButtons } from '@/components/ui/floating-toolbar-buttons'
import { BlueprintEditorPlugins } from '@/components/editor/plugins/blueprint-editor-kit'
import { Button } from '@/components/ui/button'
import { Save, Loader2 } from 'lucide-react'
import { updateBlueprintContentAction } from '../actions/blueprintActions'
import { useDebouncedCallback } from '@/hooks/use-debounce'

interface BlueprintEditorProps {
  blueprintId: string
  initialContent: unknown
}

export function BlueprintEditor({ blueprintId, initialContent }: BlueprintEditorProps) {
  const [isPending, startTransition] = useTransition()
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  const editor = usePlateEditor({
    plugins: BlueprintEditorPlugins,
    value: initialContent as any,
  })

  // Debounced auto-save
  const debouncedSave = useDebouncedCallback(
    (content: unknown) => {
      startTransition(async () => {
        await updateBlueprintContentAction(blueprintId, content)
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
      await updateBlueprintContentAction(blueprintId, editor.children)
      setHasUnsavedChanges(false)
      setLastSaved(new Date())
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {isPending ? (
            <span className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </span>
          ) : hasUnsavedChanges ? (
            'Unsaved changes'
          ) : lastSaved ? (
            `Last saved ${lastSaved.toLocaleTimeString()}`
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

      <div className="border rounded-lg">
        <Plate editor={editor} onChange={handleChange}>
          <EditorContainer className="min-h-[500px] bg-background">
            <Editor
              variant="fullWidth"
              className="px-8 py-6"
              placeholder="Start writing your blueprint content..."
            />
          </EditorContainer>

          <FloatingToolbar>
            <FloatingToolbarButtons />
          </FloatingToolbar>
        </Plate>
      </div>
    </div>
  )
}
