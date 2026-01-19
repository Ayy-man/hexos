import { requireRole } from '@/lib/auth/guards'
import { getAllOrganizations } from '@/lib/api/organizations'
import { getPendingDfyFirstInvitations } from '@/lib/api/invitations'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Users, Mail, TrendingUp } from 'lucide-react'
import { AdminPartnersList } from '@/features/admin/components/AdminPartnersList'

export default async function AdminPartnersPage() {
  await requireRole(['admin', 'internal'])

  const [agencies, pendingInvitations] = await Promise.all([
    getAllOrganizations('dfy_agency'),
    getPendingDfyFirstInvitations(),
  ])

  const totalSeats = agencies.reduce((sum, org) => sum + org.max_seats, 0)
  const usedSeats = agencies.reduce((sum, org) => sum + org.member_count, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">DFY Partners</h1>
          <p className="text-muted-foreground">
            Manage DFY agencies and their teams
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <Card className="p-3 md:p-0">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Agencies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold">{agencies.length}</div>
          </CardContent>
        </Card>

        <Card className="p-3 md:p-0">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent className="p-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-cyan-600">{usedSeats}</div>
            <p className="text-xs text-muted-foreground hidden md:block">of {totalSeats} seats</p>
          </CardContent>
        </Card>

        <Card className="p-3 md:p-0">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Pending</CardTitle>
            <Mail className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent className="p-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-yellow-600">{pendingInvitations.length}</div>
            <p className="text-xs text-muted-foreground hidden md:block">Awaiting signup</p>
          </CardContent>
        </Card>

        <Card className="p-3 md:p-0">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Avg Team Size</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent className="p-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-green-600">
              {agencies.length > 0 ? (usedSeats / agencies.length).toFixed(1) : 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Partners List */}
      <AdminPartnersList agencies={agencies} pendingInvitations={pendingInvitations} />
    </div>
  )
}
