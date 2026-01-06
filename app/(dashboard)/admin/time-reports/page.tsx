import { requireRole } from '@/lib/auth/guards'
import {
  getDevTimeReports,
  getProjectTimeReports,
  getTimeSummaryStats,
  getAllDevs,
} from '@/lib/api/admin-reports'
import { getProjects } from '@/lib/api/projects'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Users, TrendingUp, Calendar } from 'lucide-react'
import { TimeReportsContent } from '@/features/admin/components/TimeReportsContent'

export default async function AdminTimeReportsPage() {
  await requireRole(['admin', 'internal'])

  // Get current week date range
  const now = new Date()
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() + mondayOffset)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  const startDate = weekStart.toISOString().split('T')[0]
  const endDate = weekEnd.toISOString().split('T')[0]

  const [devReports, projectReports, stats, devs, projects] = await Promise.all([
    getDevTimeReports({ startDate, endDate }).catch(() => []),
    getProjectTimeReports({ startDate, endDate }).catch(() => []),
    getTimeSummaryStats().catch(() => ({
      today_total: 0,
      week_total: 0,
      month_total: 0,
      active_devs: 0,
    })),
    getAllDevs().catch(() => []),
    getProjects().catch(() => []),
  ])

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    if (h > 0 && m > 0) return `${h}h ${m}m`
    if (h > 0) return `${h}h`
    return `${m}m`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Time Reports</h1>
        <p className="text-muted-foreground">
          Track time logged by developers across all projects
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <Card className="p-3 md:p-0">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Today</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold">
              {formatDuration(stats.today_total)}
            </div>
          </CardContent>
        </Card>

        <Card className="p-3 md:p-0">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">This Week</CardTitle>
            <TrendingUp className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent className="p-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-cyan-600">
              {formatDuration(stats.week_total)}
            </div>
          </CardContent>
        </Card>

        <Card className="p-3 md:p-0">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">This Month</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="p-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-blue-600">
              {formatDuration(stats.month_total)}
            </div>
          </CardContent>
        </Card>

        <Card className="p-3 md:p-0">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Active Devs</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent className="p-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-green-600">
              {stats.active_devs}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <TimeReportsContent
        initialDevReports={devReports}
        initialProjectReports={projectReports}
        devs={devs}
        projects={projects}
        initialStartDate={startDate}
        initialEndDate={endDate}
      />
    </div>
  )
}
