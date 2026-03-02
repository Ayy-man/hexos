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
      const result = await deleteBlockerAction(blocker.id, blocker.project_id ?? undefined)
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

                {/* Resolution notes (if resolved/closed) */}
                {(blocker.status === 'resolved' || blocker.status === 'closed') && blocker.resolution_notes && (
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
