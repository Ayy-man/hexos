import { requireRole } from '@/lib/auth/guards'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { getHexonaTeamInvitations } from '@/lib/api/invitations'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, UserPlus, Mail, Shield, Briefcase } from 'lucide-react'
import { AdminTeamList } from '@/features/admin/components/AdminTeamList'

interface TeamMember {
  id: string
  email: string
  name: string | null
  role: string
  created_at: string
  last_seen_at: string | null
}

async function getHexonaTeam(): Promise<TeamMember[]> {
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, name, role, created_at, last_seen_at')
    .in('role', ['admin', 'internal'])
    .order('role')
    .order('created_at')

  if (error) {
    console.error('[getHexonaTeam] Error:', error)
    return []
  }

  return data || []
}

export default async function AdminTeamPage() {
  await requireRole(['admin'])

  const [team, pendingInvitations] = await Promise.all([
    getHexonaTeam(),
    getHexonaTeamInvitations(),
  ])

  const admins = team.filter((m) => m.role === 'admin')
  const internal = team.filter((m) => m.role === 'internal')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hexona Team</h1>
          <p className="text-muted-foreground">
            Manage admin and internal team members
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <Card className="p-3 md:p-0">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Total Team</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold">{team.length}</div>
          </CardContent>
        </Card>

        <Card className="p-3 md:p-0">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent className="p-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-red-600">{admins.length}</div>
          </CardContent>
        </Card>

        <Card className="p-3 md:p-0">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Internal</CardTitle>
            <Briefcase className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="p-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-blue-600">{internal.length}</div>
          </CardContent>
        </Card>

        <Card className="p-3 md:p-0">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Pending</CardTitle>
            <Mail className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent className="p-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-yellow-600">{pendingInvitations.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Team List */}
      <AdminTeamList team={team} pendingInvitations={pendingInvitations} />
    </div>
  )
}
