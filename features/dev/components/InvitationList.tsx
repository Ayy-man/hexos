'use client'

import { useState, useTransition } from 'react'
import { Mail, Check, X, Clock, CalendarDays } from 'lucide-react'
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
import { toast } from 'sonner'
import {
  acceptInvitationAction,
  declineInvitationAction,
} from '@/features/dev/actions/invitationActions'
import type { ProjectInvitation } from '@/lib/api/project-invitations'

interface InvitationListProps {
  invitations: ProjectInvitation[]
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
                <Card key={invitation.id}>
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
                          <p className="text-sm mt-2 text-muted-foreground">
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
                            onClick={() => {
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
                            onClick={() => {
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
    </>
  )
}
