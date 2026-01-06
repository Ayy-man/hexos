'use client'

import { useState, useTransition } from 'react'
import { format, formatDistanceToNow, isPast } from 'date-fns'
import {
  Mail,
  Check,
  X,
  CalendarDays,
  Clock,
  BarChart3,
  AlertCircle,
  Briefcase,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  acceptInvitationAction,
  declineInvitationAction,
} from '@/features/dev/actions/invitationActions'
import type { ProjectInvitation, ProjectComplexity } from '@/lib/api/project-invitations'

interface InvitationListProps {
  invitations: ProjectInvitation[]
}

const complexityConfig: Record<ProjectComplexity, { label: string; color: string }> = {
  low: { label: 'Low', color: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' },
  medium: { label: 'Medium', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' },
  high: { label: 'High', color: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' },
}

const statusConfig = {
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200' },
  accepted: { label: 'Accepted', className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' },
  declined: { label: 'Declined', className: 'bg-stone-100 text-stone-700 dark:bg-stone-900 dark:text-stone-200' },
  expired: { label: 'Expired', className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200' },
  withdrawn: { label: 'Withdrawn', className: 'bg-stone-100 text-stone-700 dark:bg-stone-900 dark:text-stone-200' },
}

export function InvitationList({ invitations }: InvitationListProps) {
  const [actionInvitation, setActionInvitation] = useState<ProjectInvitation | null>(null)
  const [action, setAction] = useState<'accept' | 'decline' | null>(null)
  const [responseMessage, setResponseMessage] = useState('')
  const [isPending, startTransition] = useTransition()
  const [viewingInvitation, setViewingInvitation] = useState<ProjectInvitation | null>(null)

  const handleAction = () => {
    if (!actionInvitation || !action) return

    startTransition(async () => {
      const actionFn = action === 'accept' ? acceptInvitationAction : declineInvitationAction
      const result = await actionFn(actionInvitation.id, responseMessage || undefined)

      if (result.success) {
        toast.success(action === 'accept' ? 'Invitation accepted!' : 'Invitation declined')
        setActionInvitation(null)
        setAction(null)
        setResponseMessage('')
      } else {
        toast.error(result.message || `Failed to ${action} invitation`)
      }
    })
  }

  if (invitations.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Mail className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground text-center">
            No invitations yet.
            <br />
            When an admin invites you to a project, it will appear here.
          </p>
        </CardContent>
      </Card>
    )
  }

  const pendingInvitations = invitations.filter(i => i.status === 'pending')
  const pastInvitations = invitations.filter(i => i.status !== 'pending')

  return (
    <>
      <div className="space-y-6">
        {/* Pending */}
        {pendingInvitations.length > 0 && (
          <div>
            <h3 className="font-medium mb-3">Pending Invitations</h3>
            <div className="space-y-3">
              {pendingInvitations.map((invitation) => (
                <Card
                  key={invitation.id}
                  className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
                  onClick={() => setViewingInvitation(invitation)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                        <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-semibold">
                              {invitation.opportunity?.title || invitation.project?.project_name || 'Project Invitation'}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {invitation.project?.client_name}
                            </p>
                          </div>
                          <Badge className={statusConfig[invitation.status].className}>
                            {statusConfig[invitation.status].label}
                          </Badge>
                        </div>

                        {invitation.message && (
                          <p className="text-sm mt-2 text-muted-foreground line-clamp-1">
                            &ldquo;{invitation.message}&rdquo;
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-muted-foreground">
                          {invitation.inviter && (
                            <span>From: {invitation.inviter.name}</span>
                          )}
                          {invitation.match_percentage && (
                            <Badge variant="secondary">
                              {invitation.match_percentage}% match
                            </Badge>
                          )}
                          {invitation.expires_at && (
                            <span className="flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              Expires: {new Date(invitation.expires_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        <div className="flex gap-2 mt-4">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setActionInvitation(invitation)
                              setAction('accept')
                            }}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Accept
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setActionInvitation(invitation)
                              setAction('decline')
                            }}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Decline
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Past */}
        {pastInvitations.length > 0 && (
          <div>
            <h3 className="font-medium mb-3 text-muted-foreground">Past Invitations</h3>
            <div className="space-y-3">
              {pastInvitations.map((invitation) => (
                <Card key={invitation.id} className="opacity-75">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">
                          {invitation.opportunity?.title || invitation.project?.project_name || 'Project Invitation'}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {invitation.project?.client_name}
                        </p>
                      </div>
                      <Badge className={statusConfig[invitation.status].className}>
                        {statusConfig[invitation.status].label}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Dialog */}
      <Dialog open={!!actionInvitation && !!action} onOpenChange={(open) => {
        if (!open) {
          setActionInvitation(null)
          setAction(null)
          setResponseMessage('')
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === 'accept' ? 'Accept Invitation' : 'Decline Invitation'}
            </DialogTitle>
            <DialogDescription>
              {action === 'accept'
                ? 'You will be added to this project after accepting.'
                : 'Let the team know why you cannot take this project.'}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <label className="text-sm font-medium mb-1 block">
              Response Message (optional)
            </label>
            <Textarea
              placeholder={
                action === 'accept'
                  ? 'Thanks for the opportunity! I\'m excited to work on this...'
                  : 'Unfortunately, I\'m not available at the moment because...'
              }
              value={responseMessage}
              onChange={(e) => setResponseMessage(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setActionInvitation(null)
              setAction(null)
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={isPending}
              variant={action === 'decline' ? 'destructive' : 'default'}
            >
              {isPending ? 'Processing...' : action === 'accept' ? 'Accept' : 'Decline'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invitation Detail Dialog */}
      <Dialog open={!!viewingInvitation} onOpenChange={(open) => !open && setViewingInvitation(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {viewingInvitation && (
            <>
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <span>Invitations</span>
                <span>/</span>
                <span className="text-foreground truncate">
                  {viewingInvitation.opportunity?.title || viewingInvitation.project?.project_name}
                </span>
              </div>

              {/* Title */}
              <DialogHeader className="pb-0">
                <DialogTitle className="text-xl font-semibold pr-8">
                  {viewingInvitation.opportunity?.title || viewingInvitation.project?.project_name || 'Project Invitation'}
                </DialogTitle>
              </DialogHeader>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                  Pending
                </Badge>

                {viewingInvitation.project && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Briefcase className="h-4 w-4" />
                    <span>{viewingInvitation.project.client_name}</span>
                  </div>
                )}

                {viewingInvitation.opportunity?.deadline && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <CalendarDays className="h-4 w-4" />
                    <span>
                      {format(new Date(), 'MMM d, yyyy')}
                      <ArrowRight className="h-3 w-3 inline mx-1" />
                      {format(new Date(viewingInvitation.opportunity.deadline), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}
              </div>

              {/* Invitation Message */}
              {viewingInvitation.message && (
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900">
                  <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 mb-1">
                    <Mail className="h-3 w-3" />
                    Message from {viewingInvitation.inviter?.name || 'Admin'}
                  </div>
                  <p className="text-sm">&ldquo;{viewingInvitation.message}&rdquo;</p>
                </div>
              )}

              {/* Tech Stack */}
              {viewingInvitation.opportunity?.tech_stack && viewingInvitation.opportunity.tech_stack.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {viewingInvitation.opportunity.tech_stack.map((tech) => (
                    <Badge key={tech} variant="secondary">
                      {tech}
                    </Badge>
                  ))}
                </div>
              )}

              <Separator className="my-4" />

              {/* Description */}
              {viewingInvitation.opportunity?.description && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                    Description
                  </Label>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {viewingInvitation.opportunity.description}
                  </p>
                </div>
              )}

              {/* Details grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
                {/* Estimated hours */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Estimated
                  </Label>
                  <p className="text-lg font-semibold">
                    {viewingInvitation.opportunity?.estimated_hours || '—'} hours
                  </p>
                </div>

                {/* Complexity */}
                {viewingInvitation.opportunity && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <BarChart3 className="h-3 w-3" />
                      Complexity
                    </Label>
                    <Badge className={cn('mt-1', complexityConfig[viewingInvitation.opportunity.complexity].color)}>
                      {complexityConfig[viewingInvitation.opportunity.complexity].label}
                    </Badge>
                  </div>
                )}

                {/* Match percentage */}
                {viewingInvitation.match_percentage && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                      Match Score
                    </Label>
                    <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                      {viewingInvitation.match_percentage}%
                    </p>
                  </div>
                )}

                {/* Invitation expires */}
                {viewingInvitation.expires_at && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Respond By
                    </Label>
                    <p className={cn(
                      'text-sm font-medium',
                      isPast(new Date(viewingInvitation.expires_at)) && 'text-red-500'
                    )}>
                      {isPast(new Date(viewingInvitation.expires_at))
                        ? 'Expired'
                        : formatDistanceToNow(new Date(viewingInvitation.expires_at), { addSuffix: true })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(viewingInvitation.expires_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                )}
              </div>

              {/* Requirements */}
              {viewingInvitation.opportunity?.requirements && (
                <>
                  <Separator className="my-4" />
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                      Requirements
                    </Label>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {viewingInvitation.opportunity.requirements}
                    </p>
                  </div>
                </>
              )}

              <Separator className="my-4" />

              {/* Actions */}
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setViewingInvitation(null)
                    setActionInvitation(viewingInvitation)
                    setAction('decline')
                  }}
                >
                  <X className="h-4 w-4 mr-1.5" />
                  Decline
                </Button>
                <Button
                  onClick={() => {
                    setViewingInvitation(null)
                    setActionInvitation(viewingInvitation)
                    setAction('accept')
                  }}
                >
                  <Check className="h-4 w-4 mr-1.5" />
                  Accept Invitation
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
