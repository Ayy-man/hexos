'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { Send, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { RoleAvatar } from '@/components/ui/role-avatar'
import type { UserRole } from '@/lib/auth/types'
import {
  getBlockerCommentsAction,
  addBlockerCommentAction,
  updateBlockerCommentAction,
  deleteBlockerCommentAction,
} from '@/features/dev/actions/blockerActions'
import type { BlockerComment } from '@/lib/api/blockers'

interface BlockerConversationProps {
  blockerId: string
}

export function BlockerConversation({ blockerId }: BlockerConversationProps) {
  const router = useRouter()
  const [comments, setComments] = useState<BlockerComment[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [isPending, startTransition] = useTransition()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Fetch comments when blockerId changes
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setComments([])
    getBlockerCommentsAction(blockerId).then((result) => {
      if (!cancelled) {
        setComments(result.comments)
        setLoading(false)
      }
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [blockerId])

  // Auto-scroll to bottom when comments change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [comments])

  const handleSend = () => {
    if (!message.trim()) return
    const content = message.trim()
    setMessage('')

    startTransition(async () => {
      const result = await addBlockerCommentAction(blockerId, content)
      if (result.success && result.comment) {
        setComments(prev => [...prev, result.comment!])
        router.refresh()
      } else {
        toast.error('Failed to send message')
        setMessage(content) // restore on failure
      }
    })
  }

  const handleEdit = (commentId: string) => {
    if (!editContent.trim()) return
    startTransition(async () => {
      const result = await updateBlockerCommentAction(commentId, editContent.trim())
      if (result.success && result.comment) {
        setComments(prev => prev.map(c => c.id === commentId ? result.comment! : c))
        setEditingId(null)
        setEditContent('')
      } else {
        toast.error('Failed to update message')
      }
    })
  }

  const handleDelete = (commentId: string) => {
    startTransition(async () => {
      const result = await deleteBlockerCommentAction(commentId)
      if (result.success) {
        setComments(prev => prev.filter(c => c.id !== commentId))
        router.refresh()
      } else {
        toast.error('Failed to delete message')
      }
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-full text-text-tertiary text-sm py-8">
            Loading...
          </div>
        ) : comments.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-tertiary text-sm py-8">
            No messages yet. Start the conversation.
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="group flex gap-2">
              <RoleAvatar
                role={(comment.user?.role as UserRole) || 'dev'}
                name={comment.user?.name || 'Unknown'}
                avatarUrl={comment.user?.avatar_url}
                size="sm"
                className="mt-0.5 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-medium text-text-primary">
                    {comment.user?.name || 'Unknown'}
                  </span>
                  <span className="text-[10px] text-text-ghost">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </span>
                  {/* Edit/delete actions on hover */}
                  <div className="ml-auto flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(comment.id)
                        setEditContent(comment.content)
                      }}
                      className="p-0.5 rounded hover:bg-bg-hover text-text-ghost hover:text-text-secondary"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(comment.id)}
                      className="p-0.5 rounded hover:bg-signal-bad-dim text-text-ghost hover:text-signal-bad"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                {editingId === comment.id ? (
                  <div className="mt-1 space-y-1">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="min-h-[60px] text-xs"
                      autoFocus
                    />
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-6 text-xs">
                        Cancel
                      </Button>
                      <Button size="sm" onClick={() => handleEdit(comment.id)} disabled={isPending} className="h-6 text-xs">
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-text-secondary whitespace-pre-wrap break-words">
                    {comment.content}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-border-hairline p-3">
        <div className="flex gap-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="min-h-[36px] max-h-[120px] text-xs resize-none"
            rows={1}
          />
          <Button
            size="icon-sm"
            onClick={handleSend}
            disabled={isPending || !message.trim()}
            className="flex-shrink-0 self-end"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
