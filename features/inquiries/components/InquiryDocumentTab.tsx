'use client'

import { useCallback, useState, useTransition, useMemo } from 'react'
import { InquiryDocument } from './InquiryDocument'
import { CommentsSidebar } from './CommentsSidebar'
import { FullscreenDocument } from './FullscreenDocument'
import type { InquiryComment, CommentType } from '@/lib/api/inquiry-comments'
import type { DiscussionUser, TDiscussion } from './editor/plugins'

interface InquiryDocumentTabProps {
  inquiryId: string
  initialDocumentContent: unknown
  generatedDocumentContent: unknown // Generated from form_data
  initialInlineDiscussions?: TDiscussion[] // Persisted inline discussions
  internalComments: InquiryComment[]
  dfyComments: InquiryComment[]
  canEdit: boolean
  canComment: boolean // DFY can comment but not edit
  showInternalTab: boolean // Admin/internal can see internal chat
  showDfyTab: boolean // Everyone can see DFY chat
  currentUser?: DiscussionUser // Current logged-in user for discussions
  saveDocument: (content: unknown, discussions: TDiscussion[]) => Promise<void>
  addComment: (content: string, commentType: CommentType, parentId?: string) => Promise<InquiryComment>
  resolveComment: (commentId: string, resolved: boolean) => Promise<void>
  deleteComment: (commentId: string) => Promise<void>
}

export function InquiryDocumentTab({
  inquiryId,
  initialDocumentContent,
  generatedDocumentContent,
  initialInlineDiscussions,
  internalComments: initialInternalComments,
  dfyComments: initialDfyComments,
  canEdit,
  canComment,
  showInternalTab,
  showDfyTab,
  currentUser,
  saveDocument,
  addComment,
  resolveComment,
  deleteComment,
}: InquiryDocumentTabProps) {
  const [internalComments, setInternalComments] = useState<InquiryComment[]>(initialInternalComments)
  const [dfyComments, setDfyComments] = useState<InquiryComment[]>(initialDfyComments)
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

  // Handle saving document with inline discussions
  const handleSaveDocument = useCallback(
    async (content: unknown, discussions: TDiscussion[]) => {
      await saveDocument(content, discussions)
    },
    [saveDocument]
  )

  // Handle adding comment
  const handleAddComment = useCallback(
    async (content: string, commentType: CommentType, parentId?: string) => {
      startTransition(async () => {
        try {
          const newComment = await addComment(content, commentType, parentId)
          if (commentType === 'internal') {
            setInternalComments((prev) => [...prev, newComment])
          } else {
            setDfyComments((prev) => [...prev, newComment])
          }
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
          // Update in both arrays (we don't know which type)
          setInternalComments((prev) =>
            prev.map((c) =>
              c.id === commentId ? { ...c, resolved } : c
            )
          )
          setDfyComments((prev) =>
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
          // Remove from both arrays (we don't know which type)
          setInternalComments((prev) => prev.filter((c) => c.id !== commentId))
          setDfyComments((prev) => prev.filter((c) => c.id !== commentId))
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
            initialDiscussions={initialInlineDiscussions}
            readOnly={!canEdit}
            currentUser={currentUser}
            onSave={canEdit ? handleSaveDocument : undefined}
            onFullscreen={() => setIsFullscreen(true)}
          />
        </div>

        {/* Comments Sidebar */}
        <div>
          <CommentsSidebar
            inquiryId={inquiryId}
            internalComments={internalComments}
            dfyComments={dfyComments}
            canEdit={canComment}
            showInternalTab={showInternalTab}
            showDfyTab={showDfyTab}
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
          initialDiscussions={initialInlineDiscussions}
          internalComments={internalComments}
          dfyComments={dfyComments}
          readOnly={!canEdit}
          canComment={canComment}
          canEdit={canEdit}
          showInternalTab={showInternalTab}
          showDfyTab={showDfyTab}
          currentUser={currentUser}
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
