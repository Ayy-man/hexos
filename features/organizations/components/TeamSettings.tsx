'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Building2, Users, UserPlus, Mail, MoreHorizontal, RefreshCw, X, Shield, User } from 'lucide-react'
import { inviteTeamMemberAction, revokeInvitationAction, resendInvitationAction } from '@/features/organizations/actions/invitationActions'
import { updateOrganizationAction, deactivateMemberAction, updateMemberRoleAction } from '@/features/organizations/actions/organizationActions'
import { useOnlineUsers } from '@/hooks/use-presence'
import { MemberStatusIndicator } from '@/components/member-status-indicator'
import { InvitationStatusBadge } from '@/components/invitation-status-badge'
import type { Organization, OrganizationMemberWithProfile, InvitationWithDetails, OrgMemberRole } from '@/lib/types/organization'

interface TeamSettingsProps {
  organization: Organization
  members: OrganizationMemberWithProfile[]
  pendingInvitations: InvitationWithDetails[]
  currentUserId: string
  type: 'dfy_agency' | 'dev_agency'
  seats: {
    max_seats: number
    used_seats: number
    pending_invites: number
    available_seats: number
  }
}

export function TeamSettings({
  organization,
  members,
  pendingInvitations,
  currentUserId,
  type,
  seats,
}: TeamSettingsProps) {
  const [isEditingName, setIsEditingName] = useState(false)
  const [orgName, setOrgName] = useState(organization.name)
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { onlineUsers } = useOnlineUsers()
  const onlineUserIds = new Set(onlineUsers.map(u => u.id))

  const currentMember = members.find((m) => m.user_id === currentUserId)
  const isAdmin = currentMember?.role === 'owner' || currentMember?.role === 'admin'
  const inviteType = type === 'dfy_agency' ? 'dfy_team' : 'dev_team'

  const handleSaveName = async () => {
    setIsSubmitting(true)
    const result = await updateOrganizationAction(organization.id, { name: orgName })
    setIsSubmitting(false)

    if (result.success) {
      setIsEditingName(false)
    } else {
      setError(result.error || 'Failed to update name')
    }
  }

  const handleInvite = async () => {
    setIsSubmitting(true)
    setError(null)

    const result = await inviteTeamMemberAction(
      { email: inviteEmail, organization_id: organization.id },
      inviteType
    )

    setIsSubmitting(false)

    if (!result.success) {
      setError(result.error || 'Failed to send invitation')
      return
    }

    setIsInviteOpen(false)
    setInviteEmail('')
  }

  const handleDeactivate = async (memberId: string) => {
    await deactivateMemberAction(memberId)
  }

  const handleChangeRole = async (memberId: string, role: OrgMemberRole) => {
    await updateMemberRoleAction(memberId, role)
  }

  const handleRevoke = async (invitationId: string) => {
    await revokeInvitationAction(invitationId)
  }

  const handleResend = async (invitationId: string) => {
    await resendInvitationAction(invitationId)
  }

  const getRoleBadgeColor = (role: OrgMemberRole) => {
    switch (role) {
      case 'owner':
        return 'destructive'
      case 'admin':
        return 'default'
      default:
        return 'secondary'
    }
  }

  return (
    <div className="space-y-6">
      {/* Organization Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organization
          </CardTitle>
          <CardDescription>
            Manage your {type === 'dfy_agency' ? 'agency' : 'team'} settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditingName ? (
            <div className="flex gap-2">
              <Input
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="max-w-sm"
              />
              <Button onClick={handleSaveName} disabled={isSubmitting}>
                Save
              </Button>
              <Button variant="outline" onClick={() => setIsEditingName(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p className="text-lg font-semibold">{organization.name}</p>
              </div>
              {isAdmin && (
                <Button variant="outline" size="sm" onClick={() => setIsEditingName(true)}>
                  Edit
                </Button>
              )}
            </div>
          )}

          {/* Seats Info */}
          <div className="flex items-center gap-6 pt-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                <span className="font-medium">{seats.used_seats}</span>
                <span className="text-muted-foreground"> of {seats.max_seats} seats used</span>
              </span>
            </div>
            {seats.pending_invites > 0 && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {seats.pending_invites} pending
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              {members.length} member{members.length !== 1 ? 's' : ''} in your organization
            </CardDescription>
          </div>
          {isAdmin && seats.available_seats > 0 && (
            <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation to join {organization.name}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {error && (
                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="colleague@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>

                  <p className="text-sm text-muted-foreground">
                    They will receive an email invitation to join your team.
                  </p>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleInvite} disabled={!inviteEmail || isSubmitting}>
                    {isSubmitting ? 'Sending...' : 'Send Invitation'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                {isAdmin && <TableHead></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{member.profile.name || 'Unnamed'}</p>
                        <p className="text-sm text-muted-foreground">{member.profile.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeColor(member.role)}>
                      {member.role === 'owner' && <Shield className="h-3 w-3 mr-1" />}
                      {member.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <MemberStatusIndicator
                      userId={member.user_id}
                      lastSeenAt={member.profile.last_seen_at}
                      onlineUserIds={onlineUserIds}
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(member.joined_at).toLocaleDateString()}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      {member.user_id !== currentUserId && member.role !== 'owner' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {member.role === 'member' && (
                              <DropdownMenuItem onClick={() => handleChangeRole(member.id, 'admin')}>
                                Make Admin
                              </DropdownMenuItem>
                            )}
                            {member.role === 'admin' && (
                              <DropdownMenuItem onClick={() => handleChangeRole(member.id, 'member')}>
                                Remove Admin
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => handleDeactivate(member.id)}
                              className="text-red-600"
                            >
                              Deactivate
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {isAdmin && pendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Pending Invitations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingInvitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{inv.email}</p>
                    <div className="flex items-center gap-2">
                      <InvitationStatusBadge status={inv.status} />
                      <span className="text-xs text-muted-foreground">
                        Sent {new Date(inv.created_at).toLocaleDateString()} • Expires {new Date(inv.expires_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleResend(inv.id)}>
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Resend
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevoke(inv.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Revoke
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Available Seats Warning */}
      {isAdmin && seats.available_seats === 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-900/20">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200">No Available Seats</p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  All {seats.max_seats} seats are in use. Contact Hexona to increase your seat limit.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
