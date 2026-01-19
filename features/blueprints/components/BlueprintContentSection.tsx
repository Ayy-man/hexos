'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BlueprintViewer } from './BlueprintViewer'
import { BlueprintEditor } from './BlueprintEditor'
import { FullscreenBlueprint } from './FullscreenBlueprint'

interface BlueprintContentSectionProps {
  blueprintId: string
  blueprintName: string
  blueprintIcon?: string | null
  content: unknown
  isEditMode: boolean
}

export function BlueprintContentSection({
  blueprintId,
  blueprintName,
  blueprintIcon,
  content,
  isEditMode,
}: BlueprintContentSectionProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Blueprint Details</CardTitle>
          <CardDescription>
            {isEditMode
              ? 'Edit the blueprint content below'
              : 'Full specification and details'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isEditMode ? (
            <BlueprintEditor
              blueprintId={blueprintId}
              initialContent={content}
              onFullscreen={() => setIsFullscreen(true)}
            />
          ) : (
            <BlueprintViewer
              content={content}
              onFullscreen={() => setIsFullscreen(true)}
            />
          )}
        </CardContent>
      </Card>

      {isFullscreen && (
        <FullscreenBlueprint
          blueprintId={blueprintId}
          blueprintName={blueprintName}
          blueprintIcon={blueprintIcon}
          content={content}
          readOnly={!isEditMode}
          onClose={() => setIsFullscreen(false)}
        />
      )}
    </>
  )
}
