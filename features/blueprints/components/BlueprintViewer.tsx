'use client'

import { useMemo } from 'react'
import { Plate, usePlateEditor } from 'platejs/react'
import { Editor, EditorContainer } from '@/components/ui/editor'
import { BlueprintEditorPlugins } from '@/components/editor/plugins/blueprint-editor-kit'

interface BlueprintViewerProps {
  content: unknown
}

export function BlueprintViewer({ content }: BlueprintViewerProps) {
  const editor = usePlateEditor({
    plugins: BlueprintEditorPlugins,
    value: content as any,
  })

  return (
    <Plate editor={editor} readOnly>
      <EditorContainer className="min-h-[400px] bg-background">
        <Editor
          variant="fullWidth"
          className="px-0 py-4"
          placeholder="No content yet..."
        />
      </EditorContainer>
    </Plate>
  )
}
