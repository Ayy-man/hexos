'use client'

import * as React from 'react'
import { useState, useCallback, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  MessageSquare,
  Send,
  CheckCircle,
  Circle,
  MoreHorizontal,
  Reply,
  Trash2,
  Users,
  Building2,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { InquiryComment, CommentType } from '@/lib/api/inquiry-comments'

interface CommentsSidebarProps {
  inquiryId: string
  internalComments: InquiryComment[]
  dfyComments: InquiryComment[]
  canEdit?: boolean
  showInternalTab?: boolean // Admin/internal can see internal chat
  showDfyTab?: boolean // Everyone can see DFY chat (if they have access to inquiry)
  onAddComment?: (content: string, commentType: CommentType, parentId?: string) => Promise<void>
  onResolve?: (commentId: string, resolved: boolean) => Promise<void>
  onDelete?: (commentId: string) => Promise<void>
}

export function CommentsSidebar({
  inquiryId,
  internalComments,
  dfyComments,
  canEdit = false,
  showInternalTab = false,
  showDfyTab = true,
  onAddComment,
  onResolve,
  onDelete,
}: CommentsSidebarProps) {
  // Default to first available tab
  const defaultTab = showInternalTab ? 'internal' : 'dfy'
  const [activeTab, setActiveTab] = useState<CommentType>(defaultTab)

  const internalUnresolved = internalComments.filter((c) => !c.resolved && !c.parent_id).length
  const dfyUnresolved = dfyComments.filter((c) => !c.resolved && !c.parent_id).length

  // Only show tabs if user has access to both
  const showTabs = showInternalTab && showDfyTab

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4" />
          Comments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showTabs ? (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CommentType)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="internal" className="gap-2">
                <Users className="h-3 w-3" />
                Internal
                {internalUnresolved > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {internalUnresolved}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="dfy" className="gap-2">
                <Building2 className="h-3 w-3" />
                DFY
                {dfyUnresolved > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {dfyUnresolved}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="internal" className="mt-4">
              <CommentsList
                comments={internalComments}
                commentType="internal"
                canEdit={canEdit}
                onAddComment={onAddComment}
                onResolve={onResolve}
                onDelete={onDelete}
              />
            </TabsContent>
            <TabsContent value="dfy" className="mt-4">
              <CommentsList
                comments={dfyComments}
                commentType="dfy"
                canEdit={canEdit}
                onAddComment={onAddComment}
                onResolve={onResolve}
                onDelete={onDelete}
              />
            </TabsContent>
          </Tabs>
        ) : (
          // Single tab view (for DFY users who only see DFY chat)
          <CommentsList
            comments={showInternalTab ? internalComments : dfyComments}
            commentType={showInternalTab ? 'internal' : 'dfy'}
            canEdit={canEdit}
            onAddComment={onAddComment}
            onResolve={onResolve}
            onDelete={onDelete}
          />
        )}
      </CardContent>
    </Card>
  )
}

interface CommentsListProps {
  comments: InquiryComment[]
  commentType: CommentType
  canEdit: boolean
  onAddComment?: (content: string, commentType: CommentType, parentId?: string) => Promise<void>
  onResolve?: (commentId: string, resolved: boolean) => Promise<void>
  onDelete?: (commentId: string) => Promise<void>
}

function CommentsList({
  comments,
  commentType,
  canEdit,
  onAddComment,
  onResolve,
  onDelete,
}: CommentsListProps) {
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [isPending, startTransition] = useTransition()
  const [showResolved, setShowResolved] = useState(false)

  // Group comments: top-level and replies
  const topLevelComments = comments.filter((c) => !c.parent_id)
  const repliesMap = new Map<string, InquiryComment[]>()
  comments
    .filter((c) => c.parent_id)
    .forEach((comment) => {
      const existing = repliesMap.get(comment.parent_id!) || []
      repliesMap.set(comment.parent_id!, [...existing, comment])
    })

  // Filter by resolved status
  const filteredComments = topLevelComments.filter(
    (c) => showResolved || !c.resolved
  )

  const unresolvedCount = topLevelComments.filter((c) => !c.resolved).length

  const handleAddComment = useCallback(async () => {
    if (!newComment.trim() || !onAddComment) return

    startTransition(async () => {
      await onAddComment(newComment.trim(), commentType)
      setNewComment('')
    })
  }, [newComment, onAddComment, commentType])

  const handleAddReply = useCallback(
    async (parentId: string) => {
      if (!replyContent.trim() || !onAddComment) return

      startTransition(async () => {
        await onAddComment(replyContent.trim(), commentType, parentId)
        setReplyContent('')
        setReplyingTo(null)
      })
    },
    [replyContent, onAddComment, commentType]
  )

  const handleResolve = useCallback(
    async (commentId: string, resolved: boolean) => {
      if (!onResolve) return
      startTransition(async () => {
        await onResolve(commentId, resolved)
      })
    },
    [onResolve]
  )

  const handleDelete = useCallback(
    async (commentId: string) => {
      if (!onDelete) return
      startTransition(async () => {
        await onDelete(commentId)
      })
    },
    [onDelete]
  )

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
    <div className="space-y-4">
      {/* Add new comment */}
      {canEdit && (
        <div className="space-y-2">
          <Textarea
            placeholder={commentType === 'internal' ? 'Internal note...' : 'Message to DFY partner...'}
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
            <CommentThread
              key={comment.id}
              comment={comment}
              replies={repliesMap.get(comment.id) || []}
              canEdit={canEdit}
              replyingTo={replyingTo}
              replyContent={replyContent}
              isPending={isPending}
              onSetReplyingTo={setReplyingTo}
              onSetReplyContent={setReplyContent}
              onAddReply={handleAddReply}
              onResolve={handleResolve}
              onDelete={handleDelete}
              formatDate={formatDate}
            />
          ))
        )}
      </div>
    </div>
  )
}

interface CommentThreadProps {
  comment: InquiryComment
  replies: InquiryComment[]
  canEdit: boolean
  replyingTo: string | null
  replyContent: string
  isPending: boolean
  onSetReplyingTo: (id: string | null) => void
  onSetReplyContent: (content: string) => void
  onAddReply: (parentId: string) => Promise<void>
  onResolve: (commentId: string, resolved: boolean) => Promise<void>
  onDelete: (commentId: string) => Promise<void>
  formatDate: (date: string) => string
}

function CommentThread({
  comment,
  replies,
  canEdit,
  replyingTo,
  replyContent,
  isPending,
  onSetReplyingTo,
  onSetReplyContent,
  onAddReply,
  onResolve,
  onDelete,
  formatDate,
}: CommentThreadProps) {
  const isReplying = replyingTo === comment.id

  return (
    <div
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

        {canEdit && (
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
      {canEdit && !comment.resolved && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() =>
            onSetReplyingTo(isReplying ? null : comment.id)
          }
        >
          <Reply className="mr-1 h-3 w-3" />
          Reply
        </Button>
      )}

      {/* Reply input */}
      {isReplying && (
        <div className="mt-2 space-y-2">
          <Textarea
            placeholder="Write a reply..."
            value={replyContent}
            onChange={(e) => onSetReplyContent(e.target.value)}
            className="min-h-[60px] resize-none text-sm"
            disabled={isPending}
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => onAddReply(comment.id)}
              disabled={!replyContent.trim() || isPending}
            >
              Reply
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onSetReplyingTo(null)
                onSetReplyContent('')
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Replies */}
      {replies.length > 0 && (
        <div className="mt-3 space-y-2 border-l-2 border-muted pl-3">
          {replies.map((reply) => (
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
  )
}

// Loading skeleton for the comments sidebar
export function CommentsSidebarSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-24" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </CardContent>
    </Card>
  )
}
