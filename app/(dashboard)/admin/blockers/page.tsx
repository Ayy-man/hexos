import { requireRole } from '@/lib/auth/guards'
import { getAllBlockers } from '@/lib/api/blockers'
import { getProjects } from '@/lib/api/projects'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'
import { AdminBlockerQueue } from '@/features/admin/components/AdminBlockerQueue'

export default async function AdminBlockersPage() {
  const profile = await requireRole(['admin', 'internal', 'dev', 'dfy'])

  const [allBlockers, projects] = await Promise.all([
    getAllBlockers().catch(() => []),
    getProjects().catch(() => []),
  ])

  const critical = allBlockers.filter(
    b => b.priority === 'critical' && !['resolved', 'closed'].includes(b.status)
  ).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Blocker Queue</h1>
        <p className="text-muted-foreground">
          Manage blockers reported by developers across all projects
        </p>
      </div>

      {/* Critical Alert — only when critical blockers exist */}
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
      <AdminBlockerQueue blockers={allBlockers} projects={projects} userRole={profile.role} />
    </div>
  )
}
