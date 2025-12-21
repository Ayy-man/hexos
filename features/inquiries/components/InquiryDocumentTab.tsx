'use client'

import { useCallback, useState, useTransition, useMemo } from 'react'
import { InquiryDocument } from './InquiryDocument'
import { CommentsSidebar } from './CommentsSidebar'
import { FullscreenDocument } from './FullscreenDocument'
import type { InquiryComment } from '@/lib/api/inquiry-comments'

interface InquiryDocumentTabProps {
  inquiryId: string
  initialDocumentContent: unknown
  generatedDocumentContent: unknown // Generated from form_data
  initialComments: InquiryComment[]
  canEdit: boolean
  canComment: boolean // DFY can comment but not edit
  saveDocument: (content: unknown) => Promise<void>
  addComment: (content: string, parentId?: string) => Promise<InquiryComment>
  resolveComment: (commentId: string, resolved: boolean) => Promise<void>
  deleteComment: (commentId: string) => Promise<void>
}

export function InquiryDocumentTab({
  inquiryId,
  initialDocumentContent,
  generatedDocumentContent,
  initialComments,
  canEdit,
  canComment,
  saveDocument,
  addComment,
  resolveComment,
  deleteComment,
}: InquiryDocumentTabProps) {
  const [comments, setComments] = useState<InquiryComment[]>(initialComments)
  const [isPending, startTransition] = useTransition()
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

  // Handle saving document
  const handleSaveDocument = useCallback(
    async (content: unknown) => {
      await saveDocument(content)
    },
    [saveDocument]
  )

  // Handle adding comment
  const handleAddComment = useCallback(
    async (content: string, parentId?: string) => {
      startTransition(async () => {
        try {
          const newComment = await addComment(content, parentId)
          setComments((prev) => [...prev, newComment])
        } catch (error) {
          console.error('Failed to add comment:', error)
        }
      })
    },
    [addComment]
  )

  // Handle resolving comment
  const handleResolveComment = useCallback(
    async (commentId: string, resolved: boolean) => {
      startTransition(async () => {
        try {
          await resolveComment(commentId, resolved)
          setComments((prev) =>
            prev.map((c) =>
              c.id === commentId ? { ...c, resolved } : c
            )
          )
        } catch (error) {
          console.error('Failed to resolve comment:', error)
        }
      })
    },
    [resolveComment]
  )

  // Handle deleting comment
  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      startTransition(async () => {
        try {
          await deleteComment(commentId)
          setComments((prev) => prev.filter((c) => c.id !== commentId))
        } catch (error) {
          console.error('Failed to delete comment:', error)
        }
      })
    },
    [deleteComment]
  )

  return (
    <>
      <div className="grid gap-6 md:grid-cols-3">
        {/* Document Editor */}
        <div className="md:col-span-2">
          <InquiryDocument
            inquiryId={inquiryId}
            initialContent={initialDocumentContent}
            generatedContent={generatedDocumentContent}
            readOnly={!canEdit}
            onSave={canEdit ? handleSaveDocument : undefined}
            onFullscreen={() => setIsFullscreen(true)}
          />
        </div>

        {/* Comments Sidebar */}
        <div>
          <CommentsSidebar
            inquiryId={inquiryId}
            comments={comments}
            canEdit={canComment}
            onAddComment={canComment ? handleAddComment : undefined}
            onResolve={canEdit ? handleResolveComment : undefined}
            onDelete={canEdit ? handleDeleteComment : undefined}
          />
        </div>
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <FullscreenDocument
          inquiryId={inquiryId}
          documentContent={currentDocumentContent}
          comments={comments}
          readOnly={!canEdit}
          canComment={canComment}
          canEdit={canEdit}
          onClose={() => setIsFullscreen(false)}
          onSave={canEdit ? handleSaveDocument : undefined}
          onAddComment={canComment ? handleAddComment : undefined}
          onResolve={canEdit ? handleResolveComment : undefined}
          onDelete={canEdit ? handleDeleteComment : undefined}
        />
      )}
    </>
  )
}
