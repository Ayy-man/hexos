'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Label } from '@/components/ui/label'
import { Search, Building2, Mail, MoreHorizontal, RefreshCw, X, Users } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { inviteDfyAgencyAction, inviteDfyToExistingOrgAction, revokeInvitationAction, resendInvitationAction } from '@/features/organizations/actions/invitationActions'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { OrganizationWithStats, InvitationWithDetails } from '@/lib/types/organization'

interface AdminPartnersListProps {
  agencies: OrganizationWithStats[]
  pendingInvitations: InvitationWithDetails[]
}

export function AdminPartnersList({ agencies, pendingInvitations }: AdminPartnersListProps) {
  const [search, setSearch] = useState('')
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [agencyName, setAgencyName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteMode, setInviteMode] = useState<'new' | 'existing'>('new')
  const [selectedOrgId, setSelectedOrgId] = useState('')

  // Filter agencies
  const filteredAgencies = agencies.filter((org) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      org.name.toLowerCase().includes(searchLower) ||
      org.contact_email?.toLowerCase().includes(searchLower)
    )
  })

  const handleInvite = async () => {
    setIsSubmitting(true)
    setError(null)

    let result: { success: boolean; invitationId?: string; error?: string }

    if (inviteMode === 'new') {
      result = await inviteDfyAgencyAction({
        email: inviteEmail,
        organization_name: agencyName,
      })
    } else {
      result = await inviteDfyToExistingOrgAction({
        email: inviteEmail,
        organization_id: selectedOrgId,
      })
    }

    setIsSubmitting(false)

    if (!result.success) {
      setError(result.error || 'Failed to send invitation')
      return
    }

    // Reset all state on success
    setIsInviteOpen(false)
    setInviteEmail('')
    setAgencyName('')
    setSelectedOrgId('')
    setInviteMode('new')
  }

  const handleRevoke = async (invitationId: string) => {
    await revokeInvitationAction(invitationId)
  }

  const handleResend = async (invitationId: string) => {
    await resendInvitationAction(invitationId)
  }

  return (
    <div className="space-y-4">
      {/* Search and Actions */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search agencies..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Dialog open={isInviteOpen} onOpenChange={(open) => {
              setIsInviteOpen(open)
              if (!open) {
                setError(null)
                setInviteMode('new')
                setSelectedOrgId('')
                setInviteEmail('')
                setAgencyName('')
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Building2 className="h-4 w-4 mr-2" />
                  Invite Agency
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite DFY Agency</DialogTitle>
                  <DialogDescription>
                    {inviteMode === 'new'
                      ? 'Invite a new DFY partner to create their agency on the platform'
                      : 'Add a DFY partner to an existing agency'}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {error && (
                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                      {error}
                    </div>
                  )}

                  <div className="flex rounded-md border border-border overflow-hidden">
                    <button
                      type="button"
                      className={`flex-1 py-2 text-sm font-medium transition-colors ${
                        inviteMode === 'new'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background text-muted-foreground hover:bg-muted'
                      }`}
                      onClick={() => setInviteMode('new')}
                    >
                      Create new agency
                    </button>
                    <button
                      type="button"
                      className={`flex-1 py-2 text-sm font-medium transition-colors ${
                        inviteMode === 'existing'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background text-muted-foreground hover:bg-muted'
                      }`}
                      onClick={() => setInviteMode('existing')}
                    >
                      Add to existing
                    </button>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">
                      {inviteMode === 'new' ? 'Owner Email' : 'Partner Email'}
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="owner@agency.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>

                  {inviteMode === 'new' ? (
                    <div className="space-y-2">
                      <Label htmlFor="agencyName">Agency Name</Label>
                      <Input
                        id="agencyName"
                        placeholder="Acme Digital"
                        value={agencyName}
                        onChange={(e) => setAgencyName(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        This will be the name of the agency when they accept the invitation
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="organization">Agency</Label>
                      <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an agency" />
                        </SelectTrigger>
                        <SelectContent>
                          {agencies.map((org) => (
                            <SelectItem key={org.id} value={org.id}>
                              {org.name} ({org.member_count}/{org.max_seats} members)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        The partner will be added as a team member to this agency
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleInvite}
                    disabled={
                      !inviteEmail ||
                      (inviteMode === 'new' ? !agencyName : !selectedOrgId) ||
                      isSubmitting
                    }
                  >
                    {isSubmitting ? 'Sending...' : 'Send Invitation'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Agencies Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agency</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Projects</TableHead>
              <TableHead>Created</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAgencies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No agencies found
                </TableCell>
              </TableRow>
            ) : (
              filteredAgencies.map((org) => (
                <TableRow key={org.id}>
                  <TableCell>
                    <div className="font-medium">{org.name}</div>
                    <div className="text-xs text-muted-foreground">{org.slug}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {org.contact_email || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{org.member_count}/{org.max_seats}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {org.project_count || 0}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(org.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Edit Settings</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Pending Agency Invitations
            </h3>
            <div className="space-y-2">
              {pendingInvitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{inv.new_organization_name}</p>
                    <p className="text-sm text-muted-foreground">{inv.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Expires {new Date(inv.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleResend(inv.id)}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Resend
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleRevoke(inv.id)}
                        className="text-red-600"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Revoke
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
