'use client'

import { useState, useCallback, useTransition } from 'react'
import { Plate, usePlateEditor } from 'platejs/react'
import { Editor, EditorContainer } from '@/components/ui/editor'
import { FixedToolbar } from '@/components/ui/fixed-toolbar'
import { FixedToolbarButtons } from '@/components/ui/fixed-toolbar-buttons'
import { BlueprintEditorPlugins } from '@/components/editor/plugins/blueprint-editor-kit'
import { Button } from '@/components/ui/button'
import { Save, Loader2, Maximize2 } from 'lucide-react'
import { updateCaseStudyContentAction } from '../actions/caseStudyActions'
import { useDebouncedCallback } from '@/hooks/use-debounce'

interface CaseStudyEditorProps {
  caseStudyId: string
  initialContent: unknown
  onFullscreen?: () => void
}

export function CaseStudyEditor({ caseStudyId, initialContent, onFullscreen }: CaseStudyEditorProps) {
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
        await updateCaseStudyContentAction(caseStudyId, content)
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
      await updateCaseStudyContentAction(caseStudyId, editor.children)
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualSave}
            disabled={isPending || !hasUnsavedChanges}
          >
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
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

      <div className="border rounded-lg overflow-hidden">
        <Plate editor={editor} onChange={handleChange}>
          {/* Fixed Toolbar Header */}
          <FixedToolbar className="rounded-t-lg rounded-b-none">
            <FixedToolbarButtons />
          </FixedToolbar>

          <EditorContainer className="min-h-[500px] bg-background">
            <Editor
              variant="fullWidth"
              className="px-8 py-6"
              placeholder="Start writing your case study content..."
            />
          </EditorContainer>
        </Plate>
      </div>
    </div>
  )
}
