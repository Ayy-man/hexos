'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Search, Users, CheckCircle2, XCircle, Briefcase, Clock, UserPlus, Mail, RefreshCw, X, Copy, Check } from 'lucide-react'
import { inviteDevAction, revokeInvitationAction, resendInvitationAction } from '@/features/organizations/actions/invitationActions'
import { InvitationStatusBadge } from '@/components/invitation-status-badge'
import type { InvitationWithDetails } from '@/lib/types/organization'

interface DevWithDetails {
  id: string
  name: string
  email: string
  availability?: {
    is_available: boolean
    available_hours_per_week: number
    headline: string | null
  }
  skills?: { skill: string; proficiency: number }[]
  assigned_projects_count?: number
  total_hours_logged?: number
}

interface AdminDevDirectoryProps {
  devs: DevWithDetails[]
  pendingInvitations: InvitationWithDetails[]
}

export function AdminDevDirectory({ devs, pendingInvitations }: AdminDevDirectoryProps) {
  const [search, setSearch] = useState('')
  const [filterAvailability, setFilterAvailability] = useState<string>('all')
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleInvite = async () => {
    setIsSubmitting(true)
    setError(null)

    const result = await inviteDevAction(inviteEmail)

    setIsSubmitting(false)

    if (!result.success) {
      setError(result.error || 'Failed to send invitation')
      return
    }

    setIsInviteOpen(false)
    const email = inviteEmail
    setInviteEmail('')
    setSuccessMessage(`Invitation sent to ${email}. Copy the link from pending invitations below.`)
    setTimeout(() => setSuccessMessage(null), 5000)
  }

  const handleCopyLink = async (token: string) => {
    const url = `${window.location.origin}/invite/${token}`
    await navigator.clipboard.writeText(url)
    setCopiedId(token)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleRevoke = async (invitationId: string) => {
    await revokeInvitationAction(invitationId)
  }

  const handleResend = async (invitationId: string) => {
    await resendInvitationAction(invitationId)
  }

  // Filter devs
  let filteredDevs = devs

  if (search) {
    const searchLower = search.toLowerCase()
    filteredDevs = filteredDevs.filter(
      d => d.name.toLowerCase().includes(searchLower) ||
           d.email.toLowerCase().includes(searchLower) ||
           d.skills?.some(s => s.skill.toLowerCase().includes(searchLower))
    )
  }

  if (filterAvailability === 'available') {
    filteredDevs = filteredDevs.filter(d => d.availability?.is_available)
  } else if (filterAvailability === 'unavailable') {
    filteredDevs = filteredDevs.filter(d => !d.availability?.is_available)
  }

  return (
    <div className="space-y-4">
      {/* Success Message */}
      {successMessage && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
          {successMessage}
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-4 flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or skill..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterAvailability} onValueChange={setFilterAvailability}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Availability" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="unavailable">Unavailable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Developer
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Developer</DialogTitle>
                  <DialogDescription>
                    Send an invitation to join as a developer
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {error && (
                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="developer@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>

                  <p className="text-sm text-muted-foreground">
                    They will receive an email invitation to join as a developer.
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
          </div>
        </CardContent>
      </Card>

      {/* Dev List */}
      <Card>
        <CardHeader>
          <CardTitle>Developers ({filteredDevs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredDevs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No developers found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Developer</TableHead>
                  <TableHead>Availability</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Skills</TableHead>
                  <TableHead>Projects</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDevs.map((dev) => (
                  <TableRow key={dev.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{dev.name}</p>
                        <p className="text-sm text-muted-foreground">{dev.email}</p>
                        {dev.availability?.headline && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {dev.availability.headline}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {dev.availability?.is_available ? (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Available
                        </Badge>
                      ) : (
                        <Badge className="bg-stone-100 text-stone-700 dark:bg-stone-900 dark:text-stone-300 gap-1">
                          <XCircle className="h-3 w-3" />
                          Unavailable
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {dev.availability ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {dev.availability.available_hours_per_week}h/week
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Not set</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {dev.skills && dev.skills.length > 0 ? (
                          <>
                            {dev.skills.slice(0, 3).map((skill) => (
                              <Badge key={skill.skill} variant="outline" className="text-xs">
                                {skill.skill}
                                <span className="ml-1 text-muted-foreground">
                                  {skill.proficiency}/5
                                </span>
                              </Badge>
                            ))}
                            {dev.skills.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{dev.skills.length - 3}
                              </Badge>
                            )}
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground">No skills</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Briefcase className="h-3 w-3 text-muted-foreground" />
                        {dev.assigned_projects_count || 0} active
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
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
                        Expires {new Date(inv.expires_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleCopyLink(inv.token)}>
                      {copiedId === inv.token ? (
                        <Check className="h-4 w-4 mr-1 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4 mr-1" />
                      )}
                      {copiedId === inv.token ? 'Copied!' : 'Copy Link'}
                    </Button>
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
    </div>
  )
}
