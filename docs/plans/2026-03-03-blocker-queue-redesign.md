# Blocker Queue Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the dense, dialog-heavy admin blocker queue with a scannable card list + slide-over sidebar with Overview and Conversation tabs.

**Architecture:** The `AdminBlockerQueue` component gets rebuilt as a list of minimal `BlockerCard` components. Clicking a card opens a `Sheet` (right, ~40vw) containing `BlockerSidebar` with two tabs: Overview (full detail + actions) and Conversation (chat-like thread). Comments are fetched lazily when a blocker is selected. Both resolve and comment dialogs are eliminated — actions move inline into the sidebar.

**Tech Stack:** React 19, Next.js, shadcn Sheet/Tabs/Avatar/ScrollArea, existing Supabase API layer (`lib/api/blockers.ts`), existing server actions (`features/dev/actions/blockerActions.ts`).

**Design Intent:**
- **Who:** Admins/PMs triaging developer-reported blockers across projects. Also devs and DFY partners checking on their blockers.
- **Task:** Scan, prioritize, discuss, and resolve blockers quickly.
- **Feel:** Triage desk — quiet interface, priority colors do the signaling work. Dense enough to scan, spacious when you open one.
- **Palette:** Uses existing brand tokens. Priority colors: `signal-bad` (critical), orange-ish warm (high), `signal-warn` (medium), muted stone (low). Status uses accent/signal tokens.
- **Depth:** Cards use `bg-card` with `border-hairline`. Selected card gets `ring-1 ring-accent-border`. Sheet uses `shadow-float`.
- **Spacing:** 4px base (`space-*` tokens). Cards get `p-3` internal, `gap-2` between cards.

---

## Task 1: Build the BlockerCard component

**Files:**
- Create: `features/admin/components/BlockerCard.tsx`

**Step 1: Create the minimal card component**

This is a presentational component. It receives a blocker + project info and renders a compact, clickable card.

```tsx
'use client'

import { formatDistanceToNow } from 'date-fns'
import { MessageCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { Blocker, BlockerPriority, BlockerStatus } from '@/lib/api/blockers'

const priorityColors: Record<BlockerPriority, string> = {
  critical: 'bg-signal-bad',
  high: 'bg-orange-500',
  medium: 'bg-signal-warn',
  low: 'bg-text-ghost',
}

const priorityLabels: Record<BlockerPriority, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

const statusConfig: Record<BlockerStatus, { label: string; className: string }> = {
  reported: {
    label: 'New',
    className: 'bg-signal-warn-dim text-signal-warn border-transparent',
  },
  acknowledged: {
    label: 'Acknowledged',
    className: 'bg-accent-dim text-accent border-transparent',
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-accent-dim text-accent border-transparent',
  },
  resolved: {
    label: 'Resolved',
    className: 'bg-signal-good-dim text-signal-good border-transparent',
  },
  closed: {
    label: 'Closed',
    className: 'bg-bg-hover text-text-tertiary border-transparent',
  },
}

interface BlockerCardProps {
  blocker: Blocker
  projectName?: string
  isSelected: boolean
  onClick: () => void
}

export function BlockerCard({ blocker, projectName, isSelected, onClick }: BlockerCardProps) {
  const status = statusConfig[blocker.status]

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-lg border bg-bg-card p-3 transition-colors hover:bg-bg-hover ${
        isSelected
          ? 'ring-1 ring-accent-border border-accent-border'
          : 'border-border-hairline'
      }`}
    >
      {/* Row 1: priority bar + title */}
      <div className="flex items-start gap-2">
        <div
          className={`mt-1.5 h-3 w-1 flex-shrink-0 rounded-full ${priorityColors[blocker.priority]}`}
        />
        <span className="font-medium text-text-primary truncate text-sm">
          {blocker.title}
        </span>
      </div>

      {/* Row 2: description preview */}
      {blocker.description && (
        <p className="mt-1 ml-3 text-xs text-text-secondary truncate">
          {blocker.description}
        </p>
      )}

      {/* Row 3: status + project + time + comments + reporter */}
      <div className="mt-1.5 ml-3 flex flex-wrap items-center gap-1.5 text-xs text-text-tertiary">
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${status.className}`}>
          {status.label}
        </Badge>
        {projectName && (
          <span className="truncate max-w-[120px]">{projectName}</span>
        )}
        <span>&middot;</span>
        <span>{formatDistanceToNow(new Date(blocker.created_at), { addSuffix: false })}</span>
        {(blocker.comments_count ?? 0) > 0 && (
          <>
            <span>&middot;</span>
            <span className="inline-flex items-center gap-0.5">
              <MessageCircle className="h-3 w-3" />
              {blocker.comments_count}
            </span>
          </>
        )}
        {blocker.reporter?.name && (
          <>
            <span>&middot;</span>
            <span className="truncate max-w-[100px]">{blocker.reporter.name}</span>
          </>
        )}
      </div>
    </button>
  )
}
```

**Step 2: Verify it renders in isolation**

Temporarily import into `AdminBlockerQueue.tsx` and render one card to confirm styling. Then revert.

**Step 3: Commit**

```bash
git add features/admin/components/BlockerCard.tsx
git commit -m "feat(blockers): add minimal BlockerCard component for queue list"
```

---

## Task 2: Build the BlockerConversation component

**Files:**
- Create: `features/admin/components/BlockerConversation.tsx`

**Step 1: Create the chat-like conversation component**

This component fetches comments for a blocker and renders them as a chat thread with a composer at the bottom.

```tsx
'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { Send, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  addBlockerCommentAction,
  updateBlockerCommentAction,
  deleteBlockerCommentAction,
} from '@/features/dev/actions/blockerActions'
import { getBlockerComments, type BlockerComment } from '@/lib/api/blockers'

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
  const composerRef = useRef<HTMLTextAreaElement>(null)

  // Fetch comments when blockerId changes
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getBlockerComments(blockerId).then((data) => {
      if (!cancelled) {
        setComments(data)
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

  const getInitials = (name?: string) => {
    if (!name) return '?'
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-hide">
        {loading ? (
          <div className="flex items-center justify-center h-full text-text-tertiary text-sm">
            Loading...
          </div>
        ) : comments.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-tertiary text-sm">
            No messages yet. Start the conversation.
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="group flex gap-2">
              <Avatar size="sm" className="mt-0.5 flex-shrink-0">
                <AvatarFallback className="text-[10px]">
                  {getInitials(comment.user?.name)}
                </AvatarFallback>
              </Avatar>
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
            ref={composerRef}
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
```

**Important note about `getBlockerComments`:** This is a server-side function using `createClient()` from `lib/supabase/server.ts`. It will work when called from a client component during SSR, but for client-side fetches after mount we need a server action. Create a thin wrapper:

Add to `features/dev/actions/blockerActions.ts`:

```ts
export async function getBlockerCommentsAction(blockerId: string) {
  try {
    const comments = await getBlockerComments(blockerId)
    return { success: true, comments }
  } catch (error) {
    console.error('Error fetching blocker comments:', error)
    return { success: false, comments: [] as BlockerComment[] }
  }
}
```

Then update `BlockerConversation` to use `getBlockerCommentsAction` instead of `getBlockerComments` directly.

**Step 2: Commit**

```bash
git add features/admin/components/BlockerConversation.tsx features/dev/actions/blockerActions.ts
git commit -m "feat(blockers): add chat-like BlockerConversation component"
```

---

## Task 3: Build the BlockerSidebar component

**Files:**
- Create: `features/admin/components/BlockerSidebar.tsx`

**Step 1: Create the sidebar with Overview + Conversation tabs**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  Clock,
  Play,
  Trash2,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  updateBlockerStatusAction,
  escalateBlockerAction,
  deleteBlockerAction,
} from '@/features/dev/actions/blockerActions'
import { BlockerConversation } from './BlockerConversation'
import type { Blocker, BlockerPriority, BlockerStatus } from '@/lib/api/blockers'

// -- Priority + status config (reuse same tokens as BlockerCard) --

const priorityConfig: Record<BlockerPriority, { label: string; className: string }> = {
  critical: { label: 'Critical', className: 'bg-signal-bad-dim text-signal-bad border-transparent' },
  high: { label: 'High', className: 'bg-orange-500/10 text-orange-400 border-transparent' },
  medium: { label: 'Medium', className: 'bg-signal-warn-dim text-signal-warn border-transparent' },
  low: { label: 'Low', className: 'bg-bg-hover text-text-tertiary border-transparent' },
}

const statusConfig: Record<BlockerStatus, { label: string; icon: React.ElementType; className: string }> = {
  reported: { label: 'New', icon: AlertTriangle, className: 'bg-signal-warn-dim text-signal-warn border-transparent' },
  acknowledged: { label: 'Acknowledged', icon: Clock, className: 'bg-accent-dim text-accent border-transparent' },
  in_progress: { label: 'In Progress', icon: Play, className: 'bg-accent-dim text-accent border-transparent' },
  resolved: { label: 'Resolved', icon: Check, className: 'bg-signal-good-dim text-signal-good border-transparent' },
  closed: { label: 'Closed', icon: Check, className: 'bg-bg-hover text-text-tertiary border-transparent' },
}

interface BlockerSidebarProps {
  blocker: Blocker | null
  onClose: () => void
}

export function BlockerSidebar({ blocker, onClose }: BlockerSidebarProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showResolveInput, setShowResolveInput] = useState(false)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Reset state when blocker changes
  const [prevBlockerId, setPrevBlockerId] = useState<string | null>(null)
  if (blocker?.id !== prevBlockerId) {
    setPrevBlockerId(blocker?.id ?? null)
    setShowResolveInput(false)
    setResolutionNotes('')
    setShowDeleteConfirm(false)
  }

  const handleStatusChange = (newStatus: BlockerStatus, notes?: string) => {
    if (!blocker) return
    startTransition(async () => {
      const result = await updateBlockerStatusAction(blocker.id, newStatus, notes)
      if (result.success) {
        toast.success(`Blocker marked as ${newStatus}`)
        router.refresh()
      } else {
        toast.error(result.message || 'Failed to update status')
      }
    })
  }

  const handleResolve = () => {
    handleStatusChange('resolved', resolutionNotes || undefined)
    setShowResolveInput(false)
    setResolutionNotes('')
  }

  const handleEscalate = () => {
    if (!blocker) return
    startTransition(async () => {
      const result = await escalateBlockerAction(blocker.id)
      if (result.success) {
        toast.success('Escalated to DFY partner')
        router.refresh()
      } else {
        toast.error(result.message || 'Failed to escalate')
      }
    })
  }

  const handleDelete = () => {
    if (!blocker) return
    startTransition(async () => {
      const result = await deleteBlockerAction(blocker.id, blocker.project_id)
      if (result.success) {
        toast.success('Blocker deleted')
        onClose()
        router.refresh()
      } else {
        toast.error(result.message || 'Failed to delete')
      }
    })
  }

  const getInitials = (name?: string) => {
    if (!name) return '?'
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  }

  const status = blocker ? statusConfig[blocker.status] : null
  const StatusIcon = status?.icon ?? AlertTriangle

  return (
    <Sheet open={!!blocker} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[40vw] sm:min-w-[400px] p-0 flex flex-col"
        showCloseButton
      >
        {blocker && (
          <>
            {/* Header */}
            <SheetHeader className="px-5 pt-5 pb-0">
              <div className="flex items-start gap-2 pr-8">
                <Badge variant="outline" className={`${priorityConfig[blocker.priority].className} flex-shrink-0`}>
                  {priorityConfig[blocker.priority].label}
                </Badge>
                <Badge variant="outline" className={`${status!.className} flex-shrink-0`}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {status!.label}
                </Badge>
                {blocker.escalated_to_dfy && (
                  <Badge variant="outline" className="bg-signal-warn-dim text-signal-warn border-transparent flex-shrink-0">
                    Escalated
                  </Badge>
                )}
              </div>
              <SheetTitle className="text-base mt-2">{blocker.title}</SheetTitle>
              <SheetDescription className="sr-only">
                Blocker details and conversation
              </SheetDescription>
            </SheetHeader>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0 px-5 pt-2">
              <TabsList variant="line" className="w-full justify-start">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="conversation">
                  Conversation
                  {(blocker.comments_count ?? 0) > 0 && (
                    <span className="ml-1.5 text-[10px] bg-bg-hover rounded-full px-1.5 py-0.5">
                      {blocker.comments_count}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="flex-1 overflow-y-auto mt-3 space-y-4 pb-4">
                {/* Meta */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Avatar size="sm">
                      <AvatarFallback className="text-[10px]">
                        {getInitials(blocker.reporter?.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <span className="text-text-primary font-medium">{blocker.reporter?.name || 'Unknown'}</span>
                      <span className="text-text-ghost ml-1">reported</span>
                      <span className="text-text-tertiary ml-1">
                        {formatDistanceToNow(new Date(blocker.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  {blocker.project?.project_name && (
                    <div className="flex items-center gap-2 text-text-secondary">
                      <span className="text-text-ghost w-16">Project</span>
                      <span>{blocker.project.project_name}</span>
                    </div>
                  )}

                  {blocker.deliverable?.title && (
                    <div className="flex items-center gap-2 text-text-secondary">
                      <span className="text-text-ghost w-16">Blocks</span>
                      <span>{blocker.deliverable.title}</span>
                    </div>
                  )}

                  {blocker.acknowledged_at && (
                    <div className="flex items-center gap-2 text-text-secondary">
                      <span className="text-text-ghost w-16">Ack&apos;d</span>
                      <span>{formatDistanceToNow(new Date(blocker.acknowledged_at), { addSuffix: true })}</span>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Description */}
                {blocker.description ? (
                  <div>
                    <h4 className="text-xs font-medium text-text-tertiary mb-1.5">Description</h4>
                    <p className="text-sm text-text-secondary whitespace-pre-wrap">{blocker.description}</p>
                  </div>
                ) : (
                  <p className="text-xs text-text-ghost italic">No description provided.</p>
                )}

                {/* Resolution notes (if resolved) */}
                {blocker.resolution_notes && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-xs font-medium text-signal-good mb-1.5">Resolution</h4>
                      <p className="text-sm text-text-secondary whitespace-pre-wrap">{blocker.resolution_notes}</p>
                      {blocker.resolver?.name && (
                        <p className="text-xs text-text-ghost mt-1">
                          Resolved by {blocker.resolver.name}
                          {blocker.resolved_at && (
                            <> {formatDistanceToNow(new Date(blocker.resolved_at), { addSuffix: true })}</>
                          )}
                        </p>
                      )}
                    </div>
                  </>
                )}

                <Separator />

                {/* Inline resolve input */}
                {showResolveInput && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-text-tertiary">Resolution notes</h4>
                    <Textarea
                      placeholder="How was this resolved? (optional)"
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      rows={3}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleResolve} disabled={isPending}>
                        {isPending ? 'Resolving...' : 'Confirm Resolve'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowResolveInput(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Delete confirmation */}
                {showDeleteConfirm && (
                  <div className="rounded-lg border border-signal-bad/20 bg-signal-bad-dim p-3 space-y-2">
                    <p className="text-xs text-signal-bad font-medium">Delete this blocker permanently?</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="destructive" onClick={handleDelete} disabled={isPending}>
                        {isPending ? 'Deleting...' : 'Delete'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                {!['resolved', 'closed'].includes(blocker.status) && !showResolveInput && (
                  <div className="flex flex-wrap gap-2">
                    {blocker.status === 'reported' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange('acknowledged')}
                        disabled={isPending}
                      >
                        <Clock className="h-3 w-3 mr-1" />
                        Acknowledge
                      </Button>
                    )}
                    {blocker.status === 'acknowledged' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange('in_progress')}
                        disabled={isPending}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Start Working
                      </Button>
                    )}
                    {['acknowledged', 'in_progress'].includes(blocker.status) && (
                      <Button
                        size="sm"
                        onClick={() => setShowResolveInput(true)}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Resolve
                      </Button>
                    )}
                    {!blocker.escalated_to_dfy && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleEscalate}
                        disabled={isPending}
                      >
                        <ArrowUpRight className="h-3 w-3 mr-1" />
                        Escalate to DFY
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-text-ghost hover:text-signal-bad"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* Conversation Tab */}
              <TabsContent value="conversation" className="flex-1 min-h-0 -mx-5">
                <BlockerConversation blockerId={blocker.id} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
```

**Step 2: Commit**

```bash
git add features/admin/components/BlockerSidebar.tsx
git commit -m "feat(blockers): add BlockerSidebar with overview and conversation tabs"
```

---

## Task 4: Rebuild AdminBlockerQueue as orchestrator

**Files:**
- Modify: `features/admin/components/AdminBlockerQueue.tsx` (full rewrite)

**Step 1: Replace the entire component**

The new `AdminBlockerQueue` becomes a thin orchestrator: filter bar + list of `BlockerCard` components + `BlockerSidebar`.

```tsx
'use client'

import { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Check, Filter } from 'lucide-react'
import { BlockerCard } from './BlockerCard'
import { BlockerSidebar } from './BlockerSidebar'
import type { Blocker, BlockerPriority, BlockerStatus } from '@/lib/api/blockers'

interface Project {
  id: string
  project_name: string
  client_name: string
}

interface AdminBlockerQueueProps {
  blockers: Blocker[]
  projects: Project[]
}

const priorityOrder: Record<BlockerPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

export function AdminBlockerQueue({ blockers, projects }: AdminBlockerQueueProps) {
  const [filterProject, setFilterProject] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('active')
  const [selectedBlocker, setSelectedBlocker] = useState<Blocker | null>(null)

  // Filter
  let filtered = blockers

  if (filterProject !== 'all') {
    filtered = filtered.filter(b => b.project_id === filterProject)
  }
  if (filterPriority !== 'all') {
    filtered = filtered.filter(b => b.priority === filterPriority)
  }
  if (filterStatus === 'active') {
    filtered = filtered.filter(b => !['resolved', 'closed'].includes(b.status))
  } else if (filterStatus !== 'all') {
    filtered = filtered.filter(b => b.status === filterStatus)
  }

  // Sort: priority first, then oldest first
  filtered = [...filtered].sort((a, b) => {
    const pd = priorityOrder[a.priority] - priorityOrder[b.priority]
    if (pd !== 0) return pd
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })

  // Keep selected blocker in sync with latest data
  const selectedBlockerData = selectedBlocker
    ? blockers.find(b => b.id === selectedBlocker.id) ?? null
    : null

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 text-text-ghost" />
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="All projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="All priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="reported">New</SelectItem>
            <SelectItem value="acknowledged">Acknowledged</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-text-tertiary">
          <Check className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm">No blockers matching your filters</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((blocker) => {
            const project = projects.find(p => p.id === blocker.project_id)
            return (
              <BlockerCard
                key={blocker.id}
                blocker={blocker}
                projectName={project?.project_name}
                isSelected={selectedBlocker?.id === blocker.id}
                onClick={() => setSelectedBlocker(blocker)}
              />
            )
          })}
        </div>
      )}

      {/* Sidebar */}
      <BlockerSidebar
        blocker={selectedBlockerData}
        onClose={() => setSelectedBlocker(null)}
      />
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add features/admin/components/AdminBlockerQueue.tsx
git commit -m "feat(blockers): rebuild AdminBlockerQueue with card list + sidebar"
```

---

## Task 5: Add getBlockerCommentsAction server action

**Files:**
- Modify: `features/dev/actions/blockerActions.ts`

**Step 1: Add the thin server action wrapper**

At the end of `blockerActions.ts`, add:

```ts
import { getBlockerComments, type BlockerComment } from '@/lib/api/blockers'

// (import getBlockerComments — may need to add to existing import)

export async function getBlockerCommentsAction(blockerId: string) {
  try {
    const comments = await getBlockerComments(blockerId)
    return { success: true, comments }
  } catch (error) {
    console.error('Error fetching blocker comments:', error)
    return { success: false, comments: [] as BlockerComment[] }
  }
}
```

**Step 2: Update BlockerConversation to use the action**

In `BlockerConversation.tsx`, change the import from `getBlockerComments` to `getBlockerCommentsAction` and update the fetch call:

```tsx
// Change import:
import { getBlockerCommentsAction } from '@/features/dev/actions/blockerActions'
// (remove getBlockerComments import from @/lib/api/blockers — keep the type import)

// Change the useEffect fetch:
getBlockerCommentsAction(blockerId).then((result) => {
  if (!cancelled) {
    setComments(result.comments)
    setLoading(false)
  }
})
```

**Step 3: Commit**

```bash
git add features/dev/actions/blockerActions.ts features/admin/components/BlockerConversation.tsx
git commit -m "feat(blockers): add getBlockerCommentsAction for client-side comment fetching"
```

---

## Task 6: Update the admin blockers page to pass all blockers (not just active)

**Files:**
- Modify: `app/(dashboard)/admin/blockers/page.tsx`

**Step 1: Fetch all blockers instead of just active**

The current page uses `getAllActiveBlockers()` which only returns non-resolved/closed. Since the queue now has status filters including "All" and "Resolved", we need all blockers. Add a new API function or modify the query.

Add to `lib/api/blockers.ts`:

```ts
/**
 * Get all blockers (admin view — includes resolved/closed)
 */
export async function getAllBlockers(): Promise<Blocker[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('blockers')
    .select(`
      *,
      reporter:profiles!reported_by(id, name, email),
      resolver:profiles!resolved_by(id, name),
      deliverable:deliverables(id, title),
      project:projects(id, project_name)
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map(normalizeBlockerRelations)
}
```

Then update `page.tsx`:

```tsx
import { getAllBlockers, getAllActiveBlockers } from '@/lib/api/blockers'

// Change: const [blockers, ...] = await Promise.all([getAllActiveBlockers()...])
// To: const [allBlockers, activeBlockers, ...] = ...
// Use activeBlockers for stat counts, pass allBlockers to the queue
```

Specifically in the page component, change:

```tsx
const [allBlockers, projects] = await Promise.all([
  getAllBlockers().catch(() => []),
  getProjects().catch(() => []),
])

// Stats still computed from allBlockers (filter to active)
const activeBlockers = allBlockers.filter(b => !['resolved', 'closed'].includes(b.status))
const reported = activeBlockers.filter(b => b.status === 'reported').length
const acknowledged = activeBlockers.filter(b => b.status === 'acknowledged').length
const inProgress = activeBlockers.filter(b => b.status === 'in_progress').length
const critical = activeBlockers.filter(b => b.priority === 'critical').length
const high = activeBlockers.filter(b => b.priority === 'high').length
```

And pass `allBlockers` to the component:

```tsx
<AdminBlockerQueue blockers={allBlockers} projects={projects} />
```

**Step 2: Commit**

```bash
git add lib/api/blockers.ts app/\(dashboard\)/admin/blockers/page.tsx
git commit -m "feat(blockers): fetch all blockers for queue with resolved/closed filter support"
```

---

## Task 7: Smoke test and polish

**Step 1: Run the dev server**

```bash
npm run dev
```

**Step 2: Navigate to the admin blockers page**

Go to `/admin/blockers`. Verify:
- [ ] Stat cards still render correctly at the top
- [ ] Filter bar renders with 3 dropdowns (project, priority, status)
- [ ] Blocker cards show: priority bar, title, description preview, status badge, project name, time, comment count, reporter
- [ ] Clicking a card opens the sidebar sheet from the right
- [ ] Selected card has a highlight ring
- [ ] Sidebar shows Overview tab with full blocker detail
- [ ] Status transition buttons work (Acknowledge, Start Working, Resolve)
- [ ] "Resolve" shows inline textarea, not a dialog
- [ ] "Escalate to DFY" button works
- [ ] "Delete" shows inline confirmation, not a dialog
- [ ] Switching to Conversation tab shows chat thread
- [ ] Can send a message (Enter to send, Shift+Enter for newline)
- [ ] Messages appear immediately after sending
- [ ] Hover over own message shows edit/delete icons
- [ ] Closing the sheet deselects the card

**Step 3: Fix any issues found**

Address styling or functionality issues. Common things to watch:
- Sheet width may need `sm:max-w-[40vw]` override since default is `sm:max-w-sm`
- Conversation tab flex layout may need `min-h-0` on parent to scroll correctly
- Badge `variant="outline"` class merging — test that brand token classes override defaults

**Step 4: Commit**

```bash
git add -A
git commit -m "fix(blockers): polish blocker queue styling and layout"
```

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | BlockerCard (minimal list item) | `features/admin/components/BlockerCard.tsx` |
| 2 | BlockerConversation (chat thread) | `features/admin/components/BlockerConversation.tsx` |
| 3 | BlockerSidebar (Sheet + tabs) | `features/admin/components/BlockerSidebar.tsx` |
| 4 | Rebuild AdminBlockerQueue (orchestrator) | `features/admin/components/AdminBlockerQueue.tsx` |
| 5 | Add getBlockerCommentsAction | `features/dev/actions/blockerActions.ts` |
| 6 | Update page to fetch all blockers | `lib/api/blockers.ts`, `app/(dashboard)/admin/blockers/page.tsx` |
| 7 | Smoke test + polish | All of the above |
