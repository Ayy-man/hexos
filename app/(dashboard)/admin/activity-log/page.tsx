import { requireRole } from '@/lib/auth/guards'
import { getActivityLogs, getActivityLogStats, getActivityUsers } from '@/lib/api/activity-logs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Database, Clock, Bot, AlertCircle } from 'lucide-react'
import { ActivityLogContent } from '@/features/admin/activity-log/components/ActivityLogContent'

export default async function AdminActivityLogPage() {
  await requireRole(['admin', 'internal'])

  const [{ data: logs, count }, stats, users] = await Promise.all([
    getActivityLogs({ limit: 50 }),
    getActivityLogStats(),
    getActivityUsers(),
  ])

  const aiCount = stats?.logs_by_category?.ai || 0
  const errorCount = stats?.logs_by_category?.error || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Activity Log</h1>
        <p className="text-muted-foreground">System-wide activity and audit trail</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <Card className="p-3 md:p-0">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Total Logs</CardTitle>
            <Database className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="p-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-blue-600">
              {stats?.total_logs?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground hidden md:block">All time</p>
          </CardContent>
        </Card>

        <Card className="p-3 md:p-0">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Today</CardTitle>
            <Clock className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent className="p-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-green-600">
              {stats?.logs_today?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground hidden md:block">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card className="p-3 md:p-0">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">AI Queries</CardTitle>
            <Bot className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent className="p-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-cyan-600">
              {Number(aiCount).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground hidden md:block">Copilot usage</p>
          </CardContent>
        </Card>

        <Card className="p-3 md:p-0">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Errors</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent className="p-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-red-600">
              {Number(errorCount).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground hidden md:block">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <ActivityLogContent initialLogs={logs} initialCount={count} users={users} />
    </div>
  )
}
