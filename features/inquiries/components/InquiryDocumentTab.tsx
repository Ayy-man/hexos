'use client'

import { useCallback, useState, useMemo } from 'react'
import { InquiryDocument } from './InquiryDocument'
import { FullscreenDocument } from './FullscreenDocument'
import type { DiscussionUser, TDiscussion } from './editor/plugins'

interface InquiryDocumentTabProps {
  inquiryId: string
  initialDocumentContent: unknown
  generatedDocumentContent: unknown // Generated from form_data
  initialInlineDiscussions?: TDiscussion[] // Persisted inline discussions
  canEdit: boolean
  currentUser?: DiscussionUser // Current logged-in user for discussions
  saveDocument: (content: unknown, discussions: TDiscussion[]) => Promise<void>
}

export function InquiryDocumentTab({
  inquiryId,
  initialDocumentContent,
  generatedDocumentContent,
  initialInlineDiscussions,
  canEdit,
  currentUser,
  saveDocument,
}: InquiryDocumentTabProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Compute the current document content (saved or generated)
  const currentDocumentContent = useMemo(() => {
    if (initialDocumentContent && Array.isArray(initialDocumentContent) && initialDocumentContent.length > 0) {
      return initialDocumentContent
    }
    if (generatedDocumentContent && Array.isArray(generatedDocumentContent) && generatedDocumentContent.length > 0) {
      return generatedDocumentContent
    }
    return [{ type: 'p', children: [{ text: 'No content available' }] }]
  }, [initialDocumentContent, generatedDocumentContent])

  // Handle saving document with inline discussions
  const handleSaveDocument = useCallback(
    async (content: unknown, discussions: TDiscussion[]) => {
      await saveDocument(content, discussions)
    },
    [saveDocument]
  )

  return (
    <>
      <div>
        {/* Document Editor */}
        <InquiryDocument
          inquiryId={inquiryId}
          initialContent={initialDocumentContent}
          generatedContent={generatedDocumentContent}
          initialDiscussions={initialInlineDiscussions}
          readOnly={!canEdit}
          currentUser={currentUser}
          onSave={canEdit ? handleSaveDocument : undefined}
          onFullscreen={() => setIsFullscreen(true)}
        />
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <FullscreenDocument
          inquiryId={inquiryId}
          documentContent={currentDocumentContent}
          initialDiscussions={initialInlineDiscussions}
          readOnly={!canEdit}
          canEdit={canEdit}
          currentUser={currentUser}
          onClose={() => setIsFullscreen(false)}
          onSave={canEdit ? handleSaveDocument : undefined}
        />
      )}
    </>
  )
}
