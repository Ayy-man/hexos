'use client'

import * as React from 'react'
import { useCallback, useState, useTransition, useMemo, useRef, useEffect } from 'react'
import { Plate, usePlateEditor } from 'platejs/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Avatar } from '@/components/ui/avatar'
import { Editor, EditorContainer } from '@/components/ui/editor'
import { FloatingToolbar } from '@/components/ui/floating-toolbar'
import { FloatingToolbarButtons } from '@/components/ui/floating-toolbar-buttons'
import { ButtonHoldAndRelease } from '@/components/ui/hold-and-release-button'
import {
  FileText,
  Save,
  CheckCircle,
  Circle,
  Send,
  MessageSquare,
  Clock,
  MoreHorizontal,
  Reply,
  Trash2,
  SendHorizontal,
  Undo2,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createInquiryDocumentPlugins, type DiscussionUser, type TDiscussion } from './editor/plugins'
import { BlueprintEditorPlugins } from '@/components/editor/plugins/blueprint-editor-kit'
import { discussionPlugin } from '@/components/editor/plugins/discussion-kit'
import type { InquiryComment } from '@/lib/api/inquiry-comments'
import type { DeliverablesNegotiationStatus } from '@/lib/api/inquiries'
import { SuggestChangesButton } from './SuggestChangesButton'
import { toast } from 'sonner'

interface ProposalTabProps {
  inquiryId: string
  initialContent: unknown
  initialDiscussions?: TDiscussion[]
  proposalSubmittedAt: string | null
  isAdmin: boolean // admin/internal
  isDfyOwner: boolean // DFY who submitted the inquiry
  proposalComments: InquiryComment[]
  currentUser?: DiscussionUser
  deliverablesStatus?: DeliverablesNegotiationStatus
  saveProposal: (content: unknown, discussions: TDiscussion[]) => Promise<void>
  submitProposal: () => Promise<void>
  unsubmitProposal?: () => Promise<void> // Undo send - admin only
  addComment: (content: string, parentId?: string) => Promise<InquiryComment>
  resolveComment: (commentId: string, resolved: boolean) => Promise<void>
  deleteComment: (commentId: string) => Promise<void>
  onStartNegotiation?: () => Promise<void>
}

export function ProposalTab({
  inquiryId,
  initialContent,
  initialDiscussions,
  proposalSubmittedAt,
  isAdmin,
  isDfyOwner,
  proposalComments: initialComments = [],
  currentUser,
  deliverablesStatus = 'none',
  saveProposal,
  submitProposal,
  unsubmitProposal,
  addComment,
  resolveComment,
  deleteComment,
  onStartNegotiation,
}: ProposalTabProps) {
  const [comments, setComments] = useState<InquiryComment[]>(initialComments || [])
  const [isPending, startTransition] = useTransition()
  const isSubmitted = !!proposalSubmittedAt

  // Show suggest changes button for DFY when proposal is submitted and no negotiation started
  const canSuggestChanges = isDfyOwner && isSubmitted && deliverablesStatus === 'none' && onStartNegotiation

  // DFY who hasn't had proposal submitted yet
  if (isDfyOwner && !isSubmitted) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Proposal Not Yet Available</h3>
              <p className="text-muted-foreground mt-1">
                The team is still working on your proposal.<br />
                You&apos;ll be able to view it here once it&apos;s ready.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Handlers for comments
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

  const handleResolveComment = useCallback(
    async (commentId: string, resolved: boolean) => {
      startTransition(async () => {
        try {
          await resolveComment(commentId, resolved)
          setComments((prev) =>
            prev.map((c) => (c.id === commentId ? { ...c, resolved } : c))
          )
        } catch (error) {
          console.error('Failed to resolve comment:', error)
        }
      })
    },
    [resolveComment]
  )

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

  const handleSubmitProposal = useCallback(async () => {
    try {
      await submitProposal()
      toast.success('Proposal submitted to partner')
    } catch (error) {
      console.error('Failed to submit proposal:', error)
      toast.error('Failed to submit proposal')
    }
  }, [submitProposal])

  const handleUnsubmitProposal = useCallback(async () => {
    if (!unsubmitProposal) return
    try {
      await unsubmitProposal()
      toast.success('Proposal submission undone')
    } catch (error) {
      console.error('Failed to unsubmit proposal:', error)
      toast.error('Failed to undo submission')
    }
  }, [unsubmitProposal])

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Proposal Editor */}
      <div className="md:col-span-2">
        <ProposalEditor
          initialContent={initialContent}
          initialDiscussions={initialDiscussions}
          readOnly={!isAdmin}
          currentUser={currentUser}
          isSubmitted={isSubmitted}
          onSave={isAdmin ? saveProposal : undefined}
          onSubmit={isAdmin && !isSubmitted ? handleSubmitProposal : undefined}
          onUnsubmit={isAdmin && isSubmitted && unsubmitProposal ? handleUnsubmitProposal : undefined}
        />
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        {/* Suggest Changes Card for DFY */}
        {canSuggestChanges && (
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground mb-3">
                Want to suggest changes to the deliverables or pricing?
              </p>
              <SuggestChangesButton
                inquiryId={inquiryId}
                onStartNegotiation={onStartNegotiation!}
              />
            </CardContent>
          </Card>
        )}

        {/* Comments Sidebar */}
        <ProposalCommentsSidebar
          comments={comments}
          canComment={isAdmin || (isDfyOwner && isSubmitted)}
          canManage={isAdmin}
          onAddComment={handleAddComment}
          onResolve={handleResolveComment}
          onDelete={handleDeleteComment}
          isPending={isPending}
        />
      </div>
    </div>
  )
}

// ============================================
// Proposal Editor Component
// ============================================

interface ProposalEditorProps {
  initialContent: unknown
  initialDiscussions?: TDiscussion[]
  readOnly: boolean
  currentUser?: DiscussionUser
  isSubmitted: boolean
  onSave?: (content: unknown, discussions: TDiscussion[]) => Promise<void>
  onSubmit?: () => Promise<void>
  onUnsubmit?: () => Promise<void>
}

function ProposalEditor({
  initialContent,
  initialDiscussions,
  readOnly,
  currentUser,
  isSubmitted,
  onSave,
  onSubmit,
  onUnsubmit,
}: ProposalEditorProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const editorRef = useRef<ReturnType<typeof usePlateEditor> | null>(null)

  // Sanitize content for read-only view by stripping plugin-specific marks
  // This prevents errors when content saved with full plugins is rendered with simpler plugins
  const sanitizeContentForReadOnly = useCallback((content: unknown[]): unknown[] => {
    const sanitizeNode = (node: Record<string, unknown>): Record<string, unknown> => {
      const sanitized: Record<string, unknown> = {}

      for (const [key, value] of Object.entries(node)) {
        // Skip comment, suggestion, and discussion-related keys
        if (
          key.startsWith('comment') ||
          key.startsWith('suggestion') ||
          key.startsWith('discussion') ||
          key === 'suggestionId' ||
          key === 'suggestionDeletion' ||
          key === 'commentId'
        ) {
          continue
        }

        // Recursively sanitize children
        if (key === 'children' && Array.isArray(value)) {
          sanitized.children = value.map((child: Record<string, unknown>) => sanitizeNode(child))
        } else {
          sanitized[key] = value
        }
      }

      return sanitized
    }

    return content.map((node) => sanitizeNode(node as Record<string, unknown>))
  }, [])

  const parsedInitialContent = useMemo(() => {
    if (initialContent && Array.isArray(initialContent) && initialContent.length > 0) {
      // Sanitize content for read-only mode to remove plugin-specific marks
      if (readOnly) {
        return sanitizeContentForReadOnly(initialContent as unknown[])
      }
      return initialContent
    }
    return [{ type: 'p', children: [{ text: 'Start writing your proposal...' }] }]
  }, [initialContent, readOnly, sanitizeContentForReadOnly])

  // Use simpler plugins for read-only view (DFY) to avoid complex discussion plugin issues
  // Full discussion plugins only for admin edit mode
  const plugins = useMemo(() => {
    if (readOnly) {
      // Simpler plugins for read-only - no discussion/suggestion/comment plugins
      return BlueprintEditorPlugins
    }
    // Ensure discussions are valid arrays with proper structure
    const safeDiscussions = initialDiscussions && Array.isArray(initialDiscussions)
      ? initialDiscussions.filter(
          (d): d is TDiscussion =>
            d &&
            typeof d === 'object' &&
            typeof d.id === 'string' &&
            Array.isArray(d.comments)
        )
      : []
    return createInquiryDocumentPlugins(currentUser, safeDiscussions)
  }, [readOnly, currentUser, initialDiscussions])

  const editor = usePlateEditor({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plugins: plugins as any,
    value: parsedInitialContent,
  })
  editorRef.current = editor

  // Debounced auto-save
  const debouncedSave = useCallback(
    async (content: unknown) => {
      if (!onSave || readOnly) return

      setIsSaving(true)
      try {
        const currentEditor = editorRef.current
        const discussions = currentEditor
          ? (currentEditor.getOption(discussionPlugin, 'discussions') as TDiscussion[])
          : []
        await onSave(content, discussions)
        setLastSaved(new Date())
        setHasChanges(false)
      } catch (error) {
        console.error('Failed to save proposal:', error)
      } finally {
        setIsSaving(false)
      }
    },
    [onSave, readOnly]
  )

  const handleChange = useCallback(
    (value: { value: unknown }) => {
      if (readOnly) return
      setHasChanges(true)

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      saveTimeoutRef.current = setTimeout(() => {
        debouncedSave(value.value)
      }, 1500)
    },
    [debouncedSave, readOnly]
  )

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  const SaveStatus = () => {
    if (isSaving) {
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Save className="h-3 w-3 animate-pulse" />
          Saving...
        </span>
      )
    }
    if (lastSaved) {
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <CheckCircle className="h-3 w-3 text-green-500" />
          Saved
        </span>
      )
    }
    if (hasChanges) {
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-yellow-500" />
          Unsaved changes
        </span>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Proposal
            {readOnly && (
              <span className="text-xs font-normal text-muted-foreground">
                (Read Only)
              </span>
            )}
            {isSubmitted && (
              <Badge variant="secondary" className="ml-2">
                <CheckCircle className="h-3 w-3 mr-1" />
                Submitted
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {!readOnly && <SaveStatus />}
            {onSubmit && !isSubmitted && (
              <ButtonHoldAndRelease
                holdDuration={2000}
                onHoldComplete={onSubmit}
                icon={<SendHorizontal className="h-4 w-4" />}
                defaultText="Submit to Partner"
                holdingText="Submitting..."
                variant="default"
                className="bg-cyan-600 hover:bg-cyan-700 text-white border-cyan-700"
              />
            )}
            {onUnsubmit && isSubmitted && (
              <ButtonHoldAndRelease
                holdDuration={2000}
                onHoldComplete={onUnsubmit}
                icon={<Undo2 className="h-4 w-4" />}
                defaultText="Undo Send"
                holdingText="Undoing..."
                variant="default"
              />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Plate
          editor={editor}
          onChange={handleChange}
          readOnly={readOnly}
        >
          <EditorContainer className="min-h-[400px] rounded-lg border bg-background">
            <Editor
              placeholder="Start writing your proposal..."
              variant="fullWidth"
              className="px-6 py-4"
            />
          </EditorContainer>

          {!readOnly && (
            <FloatingToolbar>
              <FloatingToolbarButtons />
            </FloatingToolbar>
          )}
        </Plate>
      </CardContent>
    </Card>
  )
}

// ============================================
// Proposal Comments Sidebar
// ============================================

interface ProposalCommentsSidebarProps {
  comments: InquiryComment[]
  canComment: boolean
  canManage: boolean
  onAddComment: (content: string, parentId?: string) => Promise<void>
  onResolve: (commentId: string, resolved: boolean) => Promise<void>
  onDelete: (commentId: string) => Promise<void>
  isPending: boolean
}

function ProposalCommentsSidebar({
  comments,
  canComment,
  canManage,
  onAddComment,
  onResolve,
  onDelete,
  isPending,
}: ProposalCommentsSidebarProps) {
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [showResolved, setShowResolved] = useState(false)

  // Group comments
  const topLevelComments = comments.filter((c) => !c.parent_id)
  const repliesMap = new Map<string, InquiryComment[]>()
  comments
    .filter((c) => c.parent_id)
    .forEach((comment) => {
      const existing = repliesMap.get(comment.parent_id!) || []
      repliesMap.set(comment.parent_id!, [...existing, comment])
    })

  const filteredComments = topLevelComments.filter(
    (c) => showResolved || !c.resolved
  )
  const unresolvedCount = topLevelComments.filter((c) => !c.resolved).length

  const handleAddComment = async () => {
    if (!newComment.trim()) return
    await onAddComment(newComment.trim())
    setNewComment('')
  }

  const handleAddReply = async (parentId: string) => {
    if (!replyContent.trim()) return
    await onAddComment(replyContent.trim(), parentId)
    setReplyContent('')
    setReplyingTo(null)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4" />
          Discussion
          {unresolvedCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {unresolvedCount}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new comment */}
        {canComment && (
          <div className="space-y-2">
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[80px] resize-none text-sm"
              disabled={isPending}
            />
            <Button
              size="sm"
              onClick={handleAddComment}
              disabled={!newComment.trim() || isPending}
              className="w-full"
            >
              <Send className="mr-2 h-3 w-3" />
              Add Comment
            </Button>
          </div>
        )}

        {/* Show All / Hide Resolved toggle */}
        {topLevelComments.length > 0 && (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowResolved(!showResolved)}
              className="text-xs h-6"
            >
              {showResolved ? 'Hide Resolved' : 'Show All'}
            </Button>
          </div>
        )}

        {/* Comments list */}
        <div className="space-y-3">
          {filteredComments.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {topLevelComments.length === 0
                ? 'No comments yet'
                : 'No unresolved comments'}
            </p>
          ) : (
            filteredComments.map((comment) => (
              <div
                key={comment.id}
                className={`rounded-lg border p-3 ${
                  comment.resolved ? 'bg-muted/50 opacity-75' : ''
                }`}
              >
                {/* Comment header */}
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <div className="flex h-full w-full items-center justify-center bg-primary text-xs text-primary-foreground">
                        {comment.author?.name?.charAt(0) || '?'}
                      </div>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {comment.author?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(comment.created_at)}
                      </p>
                    </div>
                  </div>

                  {canManage && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => onResolve(comment.id, !comment.resolved)}
                          disabled={isPending}
                        >
                          {comment.resolved ? (
                            <>
                              <Circle className="mr-2 h-3 w-3" />
                              Unresolve
                            </>
                          ) : (
                            <>
                              <CheckCircle className="mr-2 h-3 w-3" />
                              Resolve
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDelete(comment.id)}
                          disabled={isPending}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-3 w-3" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {/* Comment content */}
                <p className="mb-2 whitespace-pre-wrap text-sm">{comment.content}</p>

                {/* Status badge */}
                {comment.resolved && (
                  <Badge variant="outline" className="mb-2 text-xs">
                    <CheckCircle className="mr-1 h-3 w-3 text-green-500" />
                    Resolved
                  </Badge>
                )}

                {/* Reply button */}
                {canComment && !comment.resolved && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() =>
                      setReplyingTo(replyingTo === comment.id ? null : comment.id)
                    }
                  >
                    <Reply className="mr-1 h-3 w-3" />
                    Reply
                  </Button>
                )}

                {/* Reply input */}
                {replyingTo === comment.id && (
                  <div className="mt-2 space-y-2">
                    <Textarea
                      placeholder="Write a reply..."
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      className="min-h-[60px] resize-none text-sm"
                      disabled={isPending}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAddReply(comment.id)}
                        disabled={!replyContent.trim() || isPending}
                      >
                        Reply
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setReplyingTo(null)
                          setReplyContent('')
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Replies */}
                {(repliesMap.get(comment.id) || []).length > 0 && (
                  <div className="mt-3 space-y-2 border-l-2 border-muted pl-3">
                    {(repliesMap.get(comment.id) || []).map((reply) => (
                      <div key={reply.id} className="text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {reply.author?.name || 'Unknown'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(reply.created_at)}
                          </span>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap">{reply.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
