import { requireRole } from '@/lib/auth/guards'
import { getDevApplications } from '@/lib/api/invitations'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Clock, CheckCircle, XCircle } from 'lucide-react'
import { AdminApplicationsList } from '@/features/admin/components/AdminApplicationsList'
import { createClient as createAdminClient } from '@/lib/supabase/admin'

async function getApplicationStats() {
  const supabase = await createAdminClient()

  // Get counts for different statuses
  const { count: pending } = await supabase
    .from('invitations')
    .select('*', { count: 'exact', head: true })
    .eq('type', 'dev_solo')
    .eq('status', 'pending_approval')

  const { count: approved } = await supabase
    .from('invitations')
    .select('*', { count: 'exact', head: true })
    .eq('type', 'dev_solo')
    .eq('status', 'pending')

  const { count: accepted } = await supabase
    .from('invitations')
    .select('*', { count: 'exact', head: true })
    .eq('type', 'dev_solo')
    .eq('status', 'accepted')

  const { count: rejected } = await supabase
    .from('invitations')
    .select('*', { count: 'exact', head: true })
    .eq('type', 'dev_solo')
    .eq('status', 'rejected')

  return {
    pending: pending || 0,
    approved: approved || 0,
    accepted: accepted || 0,
    rejected: rejected || 0,
  }
}

export default async function AdminApplicationsPage() {
  await requireRole(['admin', 'internal'])

  const [applications, stats] = await Promise.all([
    getDevApplications(),
    getApplicationStats(),
  ])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Developer Applications</h1>
          <p className="text-muted-foreground">
            Review and manage developer applications
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <Card className="p-3 md:p-0">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent className="p-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card className="p-3 md:p-0">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent className="p-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-green-600">{stats.approved}</div>
            <p className="text-xs text-muted-foreground hidden md:block">Awaiting signup</p>
          </CardContent>
        </Card>

        <Card className="p-3 md:p-0">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Joined</CardTitle>
            <FileText className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent className="p-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-cyan-600">{stats.accepted}</div>
          </CardContent>
        </Card>

        <Card className="p-3 md:p-0">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent className="p-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-red-600">{stats.rejected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Applications List */}
      <AdminApplicationsList applications={applications} />
    </div>
  )
}
