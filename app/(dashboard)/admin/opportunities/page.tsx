import { requireRole } from '@/lib/auth/guards'
import {
  getAllOpportunities,
  getAvailableDevs,
} from '@/lib/api/project-invitations'
import { getProjects } from '@/lib/api/projects'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Briefcase, Users, Send, CheckCircle2 } from 'lucide-react'
import { AdminOpportunitiesContent } from '@/features/admin/components/AdminOpportunitiesContent'

export default async function AdminOpportunitiesPage() {
  await requireRole(['admin', 'internal'])

  const [opportunities, availableDevs, projects] = await Promise.all([
    getAllOpportunities().catch(() => []),
    getAvailableDevs().catch(() => []),
    getProjects().catch(() => []),
  ])

  const draft = opportunities.filter(o => o.status === 'draft').length
  const open = opportunities.filter(o => o.status === 'open').length
  const filled = opportunities.filter(o => o.status === 'filled').length
  const closed = opportunities.filter(o => o.status === 'closed').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Project Opportunities</h1>
        <p className="text-muted-foreground">
          Create opportunities and invite developers to projects
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <Card className="p-3 md:p-0">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Open</CardTitle>
            <Briefcase className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent className="p-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-green-600">{open}</div>
            <p className="text-xs text-muted-foreground hidden md:block">Accepting applications</p>
          </CardContent>
        </Card>

        <Card className="p-3 md:p-0">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Drafts</CardTitle>
            <Send className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent className="p-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-amber-600">{draft}</div>
            <p className="text-xs text-muted-foreground hidden md:block">Not published</p>
          </CardContent>
        </Card>

        <Card className="p-3 md:p-0">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Available Devs</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="p-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-blue-600">{availableDevs.length}</div>
            <p className="text-xs text-muted-foreground hidden md:block">Ready for work</p>
          </CardContent>
        </Card>

        <Card className="p-3 md:p-0">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Filled</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent className="p-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-cyan-600">{filled}</div>
            <p className="text-xs text-muted-foreground hidden md:block">Successfully assigned</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <AdminOpportunitiesContent
        opportunities={opportunities}
        availableDevs={availableDevs}
        projects={projects}
      />
    </div>
  )
}
