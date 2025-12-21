'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CaseStudyViewer } from './CaseStudyViewer'
import { CaseStudyEditor } from './CaseStudyEditor'
import { FullscreenCaseStudy } from './FullscreenCaseStudy'

interface CaseStudyContentSectionProps {
  caseStudyId: string
  caseStudyName: string
  caseStudyIcon?: string | null
  content: unknown
  isEditMode: boolean
}

export function CaseStudyContentSection({
  caseStudyId,
  caseStudyName,
  caseStudyIcon,
  content,
  isEditMode,
}: CaseStudyContentSectionProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Case Study Details</CardTitle>
          <CardDescription>
            {isEditMode
              ? 'Edit the case study content below'
              : 'Full specification and details'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isEditMode ? (
            <CaseStudyEditor
              caseStudyId={caseStudyId}
              initialContent={content}
              onFullscreen={() => setIsFullscreen(true)}
            />
          ) : (
            <CaseStudyViewer
              content={content}
              onFullscreen={() => setIsFullscreen(true)}
            />
          )}
        </CardContent>
      </Card>

      {isFullscreen && (
        <FullscreenCaseStudy
          caseStudyId={caseStudyId}
          caseStudyName={caseStudyName}
          caseStudyIcon={caseStudyIcon}
          content={content}
          readOnly={!isEditMode}
          onClose={() => setIsFullscreen(false)}
        />
      )}
    </>
  )
}
