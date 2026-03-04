'use client'

import { useState, useTransition } from 'react'
import { AlertTriangle, MessageCircle, Check, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { toast } from 'sonner'
import {
  updateBlockerStatusAction,
  addBlockerCommentAction,
} from '@/features/dev/actions/blockerActions'
import { BlockerPriorityBadge } from './BlockerReportDialog'
import type { Blocker, BlockerStatus, BlockerComment } from '@/lib/api/blockers'

interface BlockersListProps {
  blockers: Blocker[]
  comments?: Record<string, BlockerComment[]>
  isAdmin?: boolean
  onUpdate?: () => void
}

const statusConfig: Record<BlockerStatus, { label: string; icon: React.ElementType; className: string }> = {
  reported: {
    label: 'Reported',
    icon: AlertTriangle,
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  },
  acknowledged: {
    label: 'Acknowledged',
    icon: Clock,
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  },
  in_progress: {
    label: 'In Progress',
    icon: Clock,
    className: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
  },
  resolved: {
    label: 'Resolved',
    icon: Check,
    className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  },
  closed: {
    label: 'Closed',
    icon: Check,
    className: 'bg-stone-100 text-stone-700 dark:bg-stone-900 dark:text-stone-300',
  },
}

export function BlockersList({ blockers, comments = {}, isAdmin = false, onUpdate }: BlockersListProps) {
  if (blockers.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Check className="h-12 w-12 text-green-500/50 mb-4" />
          <p className="text-muted-foreground">No blockers! Keep up the great work.</p>
        </CardContent>
      </Card>
    )
  }

  const activeBlockers = blockers.filter(b => !['resolved', 'closed'].includes(b.status))
  const resolvedBlockers = blockers.filter(b => ['resolved', 'closed'].includes(b.status))

  return (
    <div className="space-y-4">
      {activeBlockers.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Active Blockers ({activeBlockers.length})
          </h3>
          {activeBlockers.map((blocker) => (
            <BlockerCard
              key={blocker.id}
              blocker={blocker}
              comments={comments[blocker.id] || []}
              isAdmin={isAdmin}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      )}

      {resolvedBlockers.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              <span className="text-muted-foreground">
                Resolved ({resolvedBlockers.length})
              </span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-2">
            {resolvedBlockers.map((blocker) => (
              <BlockerCard
                key={blocker.id}
                blocker={blocker}
                comments={comments[blocker.id] || []}
                isAdmin={isAdmin}
                onUpdate={onUpdate}
                isResolved
              />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  )
}

interface BlockerCardProps {
  blocker: Blocker
  comments: BlockerComment[]
  isAdmin: boolean
  onUpdate?: () => void
  isResolved?: boolean
}

function BlockerCard({ blocker, comments, isAdmin, onUpdate, isResolved }: BlockerCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [isPending, startTransition] = useTransition()

  const StatusIcon = statusConfig[blocker.status].icon

  const handleStatusChange = (newStatus: BlockerStatus) => {
    startTransition(async () => {
      const result = await updateBlockerStatusAction(blocker.id, newStatus)
      if (result.success) {
        toast.success(`Blocker marked as ${newStatus}`)
        onUpdate?.()
      } else {
        toast.error(result.message || 'Failed to update status')
      }
    })
  }

  const handleAddComment = () => {
    if (!newComment.trim()) return

    startTransition(async () => {
      const result = await addBlockerCommentAction(blocker.id, newComment.trim())
      if (result.success) {
        toast.success('Comment added')
        setNewComment('')
        onUpdate?.()
      } else {
        toast.error(result.message || 'Failed to add comment')
      }
    })
  }

  return (
    <Card className={isResolved ? 'opacity-60' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-full ${statusConfig[blocker.status].className}`}>
            <StatusIcon className="h-4 w-4" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className="font-medium">{blocker.title}</h4>
              <BlockerPriorityBadge priority={blocker.priority} />
            </div>

            {blocker.description && (
              <p className="text-sm text-muted-foreground mb-2">{blocker.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className={statusConfig[blocker.status].className}>
                {statusConfig[blocker.status].label}
              </Badge>
              <span>
                Reported {formatDistanceToNow(new Date(blocker.created_at), { addSuffix: true })}
              </span>
              {blocker.reporter && <span>by {blocker.reporter.name}</span>}
              {blocker.deliverable && (
                <span className="truncate">• {blocker.deliverable.title}</span>
              )}
            </div>

            {/* Action buttons */}
            {!isResolved && (
              <div className="flex flex-wrap gap-2 mt-3">
                {isAdmin && blocker.status === 'reported' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusChange('acknowledged')}
                    disabled={isPending}
                  >
                    Acknowledge
                  </Button>
                )}
                {isAdmin && blocker.status === 'acknowledged' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusChange('in_progress')}
                    disabled={isPending}
                  >
                    Mark In Progress
                  </Button>
                )}
                {(isAdmin || blocker.reported_by === blocker.reporter?.id) &&
                 ['acknowledged', 'in_progress'].includes(blocker.status) && (
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange('resolved')}
                    disabled={isPending}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Resolve
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setExpanded(!expanded)}
                >
                  <MessageCircle className="h-3 w-3 mr-1" />
                  {comments.length || 'Comment'}
                </Button>
              </div>
            )}

            {/* Comments section */}
            {expanded && (
              <div className="mt-4 pt-4 border-t space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{comment.user?.name || 'Unknown'}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-muted-foreground">{comment.content}</p>
                  </div>
                ))}

                <div className="flex gap-2">
                  <Textarea
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={2}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={handleAddComment}
                    disabled={isPending || !newComment.trim()}
                  >
                    Send
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Compact blocker count for dashboard
export function BlockerCountBadge({ count, critical = 0 }: { count: number; critical?: number }) {
  if (count === 0) return null

  return (
    <span className="text-sm font-medium text-red-500">
      {count}
      {critical > 0 && <span className="text-xs"> ({critical} critical)</span>}
    </span>
  )
}
