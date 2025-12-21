'use client'

import { Plate, usePlateEditor } from 'platejs/react'
import { Editor, EditorContainer } from '@/components/ui/editor'
import { BlueprintEditorPlugins } from '@/components/editor/plugins/blueprint-editor-kit'
import { Button } from '@/components/ui/button'
import { Maximize2 } from 'lucide-react'

interface BlueprintViewerProps {
  content: unknown
  onFullscreen?: () => void
}

export function BlueprintViewer({ content, onFullscreen }: BlueprintViewerProps) {
  const editor = usePlateEditor({
    plugins: BlueprintEditorPlugins,
    value: content as any,
  })

  return (
    <div className="space-y-2">
      {onFullscreen && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={onFullscreen}
            className="h-8 w-8"
            title="Open fullscreen"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      )}
      <Plate editor={editor} readOnly>
        <EditorContainer className="min-h-[400px] bg-background">
          <Editor
            variant="fullWidth"
            className="px-0 py-4"
            placeholder="No content yet..."
          />
        </EditorContainer>
      </Plate>
    </div>
  )
}
