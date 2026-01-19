'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertTriangle,
  Clock,
  Check,
  MessageCircle,
  Filter,
  ChevronDown,
} from 'lucide-react'
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
import type { Blocker, BlockerStatus, BlockerPriority } from '@/lib/api/blockers'

interface Project {
  id: string
  project_name: string
  client_name: string
}

interface AdminBlockerQueueProps {
  blockers: Blocker[]
  projects: Project[]
}

const priorityConfig: Record<BlockerPriority, { label: string; className: string; order: number }> = {
  critical: {
    label: 'Critical',
    className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border-red-300',
    order: 0,
  },
  high: {
    label: 'High',
    className: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 border-orange-300',
    order: 1,
  },
  medium: {
    label: 'Medium',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 border-amber-300',
    order: 2,
  },
  low: {
    label: 'Low',
    className: 'bg-stone-100 text-stone-700 dark:bg-stone-900 dark:text-stone-300 border-stone-300',
    order: 3,
  },
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

export function AdminBlockerQueue({ blockers, projects }: AdminBlockerQueueProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [filterProject, setFilterProject] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('active')
  const [resolveDialog, setResolveDialog] = useState<Blocker | null>(null)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [commentDialog, setCommentDialog] = useState<Blocker | null>(null)
  const [newComment, setNewComment] = useState('')

  // Filter blockers
  let filteredBlockers = blockers

  if (filterProject !== 'all') {
    filteredBlockers = filteredBlockers.filter(b => b.project_id === filterProject)
  }

  if (filterPriority !== 'all') {
    filteredBlockers = filteredBlockers.filter(b => b.priority === filterPriority)
  }

  if (filterStatus === 'active') {
    filteredBlockers = filteredBlockers.filter(b => !['resolved', 'closed'].includes(b.status))
  } else if (filterStatus !== 'all') {
    filteredBlockers = filteredBlockers.filter(b => b.status === filterStatus)
  }

  // Sort by priority then by date
  filteredBlockers = [...filteredBlockers].sort((a, b) => {
    const priorityDiff = priorityConfig[a.priority].order - priorityConfig[b.priority].order
    if (priorityDiff !== 0) return priorityDiff
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })

  const handleStatusChange = (blocker: Blocker, newStatus: BlockerStatus, notes?: string) => {
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
    if (!resolveDialog) return
    handleStatusChange(resolveDialog, 'resolved', resolutionNotes || undefined)
    setResolveDialog(null)
    setResolutionNotes('')
  }

  const handleAddComment = () => {
    if (!commentDialog || !newComment.trim()) return

    startTransition(async () => {
      const result = await addBlockerCommentAction(commentDialog.id, newComment.trim())
      if (result.success) {
        toast.success('Comment added')
        setCommentDialog(null)
        setNewComment('')
        router.refresh()
      } else {
        toast.error(result.message || 'Failed to add comment')
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            <Select value={filterProject} onValueChange={setFilterProject}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.project_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[140px]">
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
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="reported">Reported</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Blockers List */}
      {filteredBlockers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Check className="h-12 w-12 text-green-500/50 mb-4" />
            <p className="text-muted-foreground">No blockers matching your filters</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredBlockers.map((blocker) => {
            const StatusIcon = statusConfig[blocker.status].icon
            const project = projects.find(p => p.id === blocker.project_id)

            return (
              <Card key={blocker.id} className={blocker.priority === 'critical' ? 'border-red-300 dark:border-red-800' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full flex-shrink-0 ${statusConfig[blocker.status].className}`}>
                      <StatusIcon className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-medium">{blocker.title}</h4>
                        <Badge className={priorityConfig[blocker.priority].className}>
                          {priorityConfig[blocker.priority].label}
                        </Badge>
                      </div>

                      {blocker.description && (
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {blocker.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-3">
                        <Badge variant="outline" className={statusConfig[blocker.status].className}>
                          {statusConfig[blocker.status].label}
                        </Badge>
                        {project && (
                          <span className="truncate">{project.project_name}</span>
                        )}
                        <span>
                          Reported {formatDistanceToNow(new Date(blocker.created_at), { addSuffix: true })}
                        </span>
                        {blocker.reporter && <span>by {blocker.reporter.name}</span>}
                        {blocker.deliverable && (
                          <span className="truncate">on {blocker.deliverable.title}</span>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap gap-2">
                        {blocker.status === 'reported' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(blocker, 'acknowledged')}
                            disabled={isPending}
                          >
                            Acknowledge
                          </Button>
                        )}
                        {blocker.status === 'acknowledged' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(blocker, 'in_progress')}
                            disabled={isPending}
                          >
                            Start Working
                          </Button>
                        )}
                        {['acknowledged', 'in_progress'].includes(blocker.status) && (
                          <Button
                            size="sm"
                            onClick={() => setResolveDialog(blocker)}
                            disabled={isPending}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Resolve
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setCommentDialog(blocker)}
                        >
                          <MessageCircle className="h-3 w-3 mr-1" />
                          Comment
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Resolve Dialog */}
      <Dialog open={!!resolveDialog} onOpenChange={() => setResolveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Blocker</DialogTitle>
            <DialogDescription>
              Mark this blocker as resolved. You can optionally add resolution notes.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Resolution notes (optional)..."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleResolve} disabled={isPending}>
              {isPending ? 'Resolving...' : 'Resolve Blocker'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comment Dialog */}
      <Dialog open={!!commentDialog} onOpenChange={() => setCommentDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Comment</DialogTitle>
            <DialogDescription>
              Add a comment to this blocker.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Your comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCommentDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleAddComment} disabled={isPending || !newComment.trim()}>
              {isPending ? 'Adding...' : 'Add Comment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
