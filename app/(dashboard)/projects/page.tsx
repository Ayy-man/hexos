import Link from 'next/link'
import { getProjects } from '@/lib/api/projects'
import { requireAuth } from '@/lib/auth/guards'
import { ProjectProgressBar, ProjectProgressInline } from '@/features/projects/components/ProjectProgressBar'

const STATUS_COLORS: Record<string, string> = {
  inquiry_new: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  ai_matching: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  qualified: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  proposal_drafting: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  proposal_sent: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  in_progress: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  cancelled: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
  on_hold: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
}

function getStatusColor(status: string) {
  return STATUS_COLORS[status] || 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export default async function ProjectsPage() {
  await requireAuth()

  let projects: Awaited<ReturnType<typeof getProjects>> = []
  try {
    projects = await getProjects()
  } catch {
    // RLS or no data
  }

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

      {projects.length === 0 ? (
        <div className="rounded-lg border border-stone-200 bg-white p-8 md:p-12 text-center dark:border-stone-800 dark:bg-stone-900">
          <p className="text-stone-500 dark:text-stone-400 text-sm md:text-base">
            No projects yet. Create your first project to get started.
          </p>
        </div>
      ) : (
        <>
          {/* Results count */}
          <p className="text-sm text-stone-500 dark:text-stone-400">
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </p>

          {/* Mobile card view */}
          <div className="space-y-3 md:hidden">
            {projects.map((project) => (
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
                {/* Progress bar */}
                <ProjectProgressInline project={project} className="mt-3" />
                <div className="mt-2 flex items-center gap-4 text-xs text-stone-500 dark:text-stone-400">
                  {project.assigned_dev?.name && (
                    <span>Dev: {project.assigned_dev.name}</span>
                  )}
                  {project.target_delivery_date && (
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
                    Target Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                {projects.map((project) => (
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
                      {project.target_delivery_date
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
    </div>
  )
}
