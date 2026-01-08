import { requireRole } from '@/lib/auth/guards'
import { getAvailableDevs } from '@/lib/api/project-invitations'
import { getAllDevs } from '@/lib/api/admin-reports'
import { getPendingDevInvitations } from '@/lib/api/invitations'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, UserCheck, Clock, Briefcase } from 'lucide-react'
import { AdminDevDirectory } from '@/features/admin/components/AdminDevDirectory'

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

async function getDevsWithDetails(): Promise<DevWithDetails[]> {
  const supabase = await createClient()

  // Get all devs
  const { data: devs, error: devsError } = await supabase
    .from('profiles')
    .select('id, name, email')
    .eq('role', 'dev')
    .order('name')

  if (devsError) throw devsError

  // Get availability for all devs
  const { data: availability } = await supabase
    .from('dev_availability')
    .select('dev_id, is_available, available_hours_per_week, headline')

  // Get skills for all devs
  const { data: skills } = await supabase
    .from('dev_skills')
    .select('dev_id, skill, proficiency')
    .order('proficiency', { ascending: false })

  // Get assigned projects count
  const { data: assignments } = await supabase
    .from('projects')
    .select('assigned_dev_id')
    .not('assigned_dev_id', 'is', null)
    .in('status', ['in_progress', 'blocked_client', 'blocked_internal', 'review_checkpoint'])

  // Build the combined data
  return (devs || []).map((dev) => {
    const devAvailability = availability?.find(a => a.dev_id === dev.id)
    const devSkills = skills?.filter(s => s.dev_id === dev.id) || []
    const projectCount = assignments?.filter(a => a.assigned_dev_id === dev.id).length || 0

    return {
      ...dev,
      availability: devAvailability ? {
        is_available: devAvailability.is_available,
        available_hours_per_week: devAvailability.available_hours_per_week,
        headline: devAvailability.headline,
      } : undefined,
      skills: devSkills,
      assigned_projects_count: projectCount,
    }
  })
}

export default async function AdminDevsPage() {
  await requireRole(['admin', 'internal'])

  const [devs, pendingInvitations] = await Promise.all([
    getDevsWithDetails().catch(() => []),
    getPendingDevInvitations().catch(() => []),
  ])

  const totalDevs = devs.length
  const availableDevs = devs.filter(d => d.availability?.is_available).length
  const busyDevs = devs.filter(d => (d.assigned_projects_count || 0) > 0).length
  const totalCapacity = devs.reduce((sum, d) => sum + (d.availability?.available_hours_per_week || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Developer Directory</h1>
        <p className="text-muted-foreground">
          View developer availability, skills, and workload
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <Card className="p-3 md:p-0">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Total Devs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold">{totalDevs}</div>
          </CardContent>
        </Card>

        <Card className="p-3 md:p-0">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Available</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent className="p-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-green-600">{availableDevs}</div>
            <p className="text-xs text-muted-foreground hidden md:block">Ready for work</p>
          </CardContent>
        </Card>

        <Card className="p-3 md:p-0">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Assigned</CardTitle>
            <Briefcase className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="p-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-blue-600">{busyDevs}</div>
            <p className="text-xs text-muted-foreground hidden md:block">On active projects</p>
          </CardContent>
        </Card>

        <Card className="p-3 md:p-0">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Total Capacity</CardTitle>
            <Clock className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent className="p-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-cyan-600">{totalCapacity}h</div>
            <p className="text-xs text-muted-foreground hidden md:block">Per week</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <AdminDevDirectory devs={devs} pendingInvitations={pendingInvitations} />
    </div>
  )
}
