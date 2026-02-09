import Link from 'next/link'
import { getProjects } from '@/lib/api/projects'
import { requireAuth } from '@/lib/auth/guards'
import { ProjectProgressBar, ProjectProgressInline } from '@/features/projects/components/ProjectProgressBar'
import { RetainerDashboardCard } from '@/features/projects/components/retainer/RetainerDashboardCard'
import { getLatestCheckIn, getNextCheckInDueDate } from '@/lib/api/retainer-check-ins'
import { getRetainerTaskCounts } from '@/lib/api/retainer-tasks'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  inquiry_new: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  ai_matching: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  qualified: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  proposal_drafting: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  proposal_sent: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  in_progress: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
  retainer: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  cancelled: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
  on_hold: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
}

// Map statuses to categories for filtering
function getStatusCategory(status: string): 'active' | 'retainer' | 'completed' {
  if (status === 'retainer') return 'retainer'
  if (['completed', 'cancelled'].includes(status)) return 'completed'
  return 'active'
}

function getStatusColor(status: string) {
  return STATUS_COLORS[status] || 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

interface ProjectsPageProps {
  searchParams: Promise<{
    q?: string
    view?: 'active' | 'retainer' | 'completed'
  }>
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  await requireAuth()
  const { q: search, view = 'active' } = await searchParams

  let projects: Awaited<ReturnType<typeof getProjects>> = []
  try {
    // All views fetch active projects, then filter by status category
    projects = await getProjects('active')
  } catch {
    // RLS or no data
  }

  // Filter projects based on search and view tab
  const filteredProjects = projects.filter((project) => {
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      const matchesSearch =
        project.project_name.toLowerCase().includes(searchLower) ||
        project.client_name?.toLowerCase().includes(searchLower) ||
        project.assigned_dev?.name?.toLowerCase().includes(searchLower)
      if (!matchesSearch) return false
    }

    // View tab filter (active/retainer/completed)
    if (view && view !== 'active') {
      const category = getStatusCategory(project.status)
      if (category !== view) return false
    } else if (!view || view === 'active') {
      // Active tab excludes retainer and completed
      const category = getStatusCategory(project.status)
      if (category !== 'active') return false
    }

    return true
  })

  // Fetch retainer supplemental data if viewing retainer tab
  let retainerData: Map<string, { lastCheckIn: unknown, dueInfo: unknown, taskCounts: unknown }> | null = null
  if (view === 'retainer') {
    retainerData = new Map()
    const retainerProjects = filteredProjects.filter(p => p.status === 'retainer')
    await Promise.all(retainerProjects.map(async (p) => {
      const [lastCheckIn, dueInfo, taskCounts] = await Promise.all([
        getLatestCheckIn(p.id).catch(() => null),
        getNextCheckInDueDate(p.id).catch(() => null),
        getRetainerTaskCounts(p.id).catch(() => ({ todo: 0, in_progress: 0, done: 0, total: 0 })),
      ])
      retainerData!.set(p.id, { lastCheckIn, dueInfo, taskCounts })
    }))
  }

  // Build filter URL helper
  const buildFilterUrl = (params: { q?: string; view?: string }) => {
    const urlParams = new URLSearchParams()
    if (params.q) urlParams.set('q', params.q)
    if (params.view && params.view !== 'active') urlParams.set('view', params.view)
    const queryString = urlParams.toString()
    return queryString ? `/projects?${queryString}` : '/projects'
  }

  const viewFilters = [
    { value: 'active', label: 'Active' },
    { value: 'retainer', label: 'Retainer' },
    { value: 'completed', label: 'Completed' },
  ]

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-semibold text-stone-900 dark:text-stone-100">
          Projects
        </h1>
        <Link
          href="/projects/new"
          className="rounded-md bg-cyan-600 px-3 py-2 md:px-4 text-sm font-medium text-white hover:bg-cyan-700"
        >
          <span className="hidden sm:inline">New Project</span>
          <span className="sm:hidden">New</span>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <form className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            name="q"
            placeholder="Search projects..."
            defaultValue={search}
            className="pl-8"
          />
          {/* Preserve view on search */}
          {view && view !== 'active' && <input type="hidden" name="view" value={view} />}
        </form>

        {/* View Tabs (Active/Retainer/Completed) */}
        <div className="flex flex-wrap gap-1">
          {viewFilters.map((filter) => (
            <Link
              key={filter.value}
              href={buildFilterUrl({ q: search, view: filter.value })}
            >
              <Badge
                variant={view === filter.value ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-muted"
              >
                {filter.label}
              </Badge>
            </Link>
          ))}
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="rounded-lg border border-stone-200 bg-white p-8 md:p-12 text-center dark:border-stone-800 dark:bg-stone-900">
          <p className="text-stone-500 dark:text-stone-400 text-sm md:text-base">
            {search
              ? 'No projects match your search. Try adjusting your query.'
              : view === 'retainer'
              ? 'No retainer projects.'
              : view === 'completed'
              ? 'No completed projects.'
              : 'No active projects. Create your first project to get started.'}
          </p>
        </div>
      ) : (
        <>
          {/* Results count */}
          <p className="text-sm text-stone-500 dark:text-stone-400">
            {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
            {search && filteredProjects.length !== projects.length && (
              <span className="ml-1">
                (filtered from {projects.length})
              </span>
            )}
          </p>

          {/* Retainer view - grid of dashboard cards */}
          {view === 'retainer' ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map((project) => {
                const data = retainerData?.get(project.id)
                return (
                  <RetainerDashboardCard
                    key={project.id}
                    project={project}
                    lastCheckIn={data?.lastCheckIn as never}
                    dueInfo={data?.dueInfo as never}
                    taskCounts={data?.taskCounts as never}
                  />
                )
              })}
            </div>
          ) : (
            <>
              {/* Mobile card view */}
              <div className="space-y-3 md:hidden">
                {filteredProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="block rounded-lg border border-stone-200 bg-white p-4 active:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:active:bg-stone-800/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-medium text-stone-900 dark:text-stone-100">
                          {project.project_name}
                        </h3>
                        <p className="mt-0.5 text-sm text-stone-600 dark:text-stone-400">
                          {project.client_name}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(project.status)}`}
                      >
                        {formatStatus(project.status)}
                      </span>
                    </div>
                    {/* Progress bar or completion date */}
                    {view === 'completed' && project.completed_at ? (
                      <div className="mt-3 text-sm text-stone-500 dark:text-stone-400">
                        Completed: {new Date(project.completed_at).toLocaleDateString()}
                      </div>
                    ) : (
                      <ProjectProgressInline project={project} className="mt-3" />
                    )}
                    <div className="mt-2 flex items-center gap-4 text-xs text-stone-500 dark:text-stone-400">
                      {project.assigned_dev?.name && (
                        <span>Dev: {project.assigned_dev.name}</span>
                      )}
                      {project.target_delivery_date && view !== 'completed' && (
                        <span>
                          Due: {new Date(project.target_delivery_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>

              {/* Desktop table view */}
              <div className="hidden overflow-hidden rounded-lg border border-stone-200 bg-white md:block dark:border-stone-800 dark:bg-stone-900">
            <table className="min-w-full divide-y divide-stone-200 dark:divide-stone-800">
              <thead className="bg-stone-50 dark:bg-stone-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    Project
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    Client
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    Progress
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    Assigned Dev
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    {view === 'completed' ? 'Completed' : 'Target Date'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                {filteredProjects.map((project) => (
                  <tr key={project.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/projects/${project.id}`}
                        className="font-medium text-stone-900 hover:text-cyan-600 dark:text-stone-100 dark:hover:text-cyan-400"
                      >
                        {project.project_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-600 dark:text-stone-400">
                      {project.client_name}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(project.status)}`}
                      >
                        {formatStatus(project.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ProjectProgressBar project={project} variant="compact" />
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-600 dark:text-stone-400">
                      {project.assigned_dev?.name || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-600 dark:text-stone-400">
                      {view === 'completed' && project.completed_at
                        ? new Date(project.completed_at).toLocaleDateString()
                        : project.target_delivery_date
                        ? new Date(project.target_delivery_date).toLocaleDateString()
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
