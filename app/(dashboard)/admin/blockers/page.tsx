import { requireRole } from '@/lib/auth/guards'
import { getAllActiveBlockers, getBlockerCounts } from '@/lib/api/blockers'
import { getProjects } from '@/lib/api/projects'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { AdminBlockerQueue } from '@/features/admin/components/AdminBlockerQueue'

export default async function AdminBlockersPage() {
  await requireRole(['admin', 'internal'])

  const [blockers, projects] = await Promise.all([
    getAllActiveBlockers().catch(() => []),
    getProjects().catch(() => []),
  ])

  // Count by status and priority
  const reported = blockers.filter(b => b.status === 'reported').length
  const acknowledged = blockers.filter(b => b.status === 'acknowledged').length
  const inProgress = blockers.filter(b => b.status === 'in_progress').length
  const critical = blockers.filter(b => b.priority === 'critical').length
  const high = blockers.filter(b => b.priority === 'high').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Blocker Queue</h1>
        <p className="text-muted-foreground">
          Manage blockers reported by developers across all projects
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <Card className="p-3 md:p-0">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">New</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent className="p-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-amber-600">{reported}</div>
            <p className="text-xs text-muted-foreground hidden md:block">Awaiting review</p>
          </CardContent>
        </Card>

        <Card className="p-3 md:p-0">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Acknowledged</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="p-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-blue-600">{acknowledged}</div>
            <p className="text-xs text-muted-foreground hidden md:block">Being looked at</p>
          </CardContent>
        </Card>

        <Card className="p-3 md:p-0">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">In Progress</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent className="p-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-cyan-600">{inProgress}</div>
            <p className="text-xs text-muted-foreground hidden md:block">Being resolved</p>
          </CardContent>
        </Card>

        <Card className="p-3 md:p-0">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Critical/High</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent className="p-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-red-600">{critical + high}</div>
            <p className="text-xs text-muted-foreground hidden md:block">
              {critical} critical, {high} high
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Alert */}
      {critical > 0 && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-red-800 dark:text-red-200">
                {critical} Critical Blocker{critical !== 1 ? 's' : ''} Requires Immediate Attention
              </p>
              <p className="text-sm text-red-600 dark:text-red-400">
                These are causing complete work stoppages
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <AdminBlockerQueue blockers={blockers} projects={projects} />
    </div>
  )
}
