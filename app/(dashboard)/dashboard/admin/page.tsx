import Link from 'next/link'
import { requireRole } from '@/lib/auth/guards'
import { getProjectStats, getProjects } from '@/lib/api/projects'

export default async function AdminDashboard() {
  await requireRole(['admin'])

  let stats = { total: 0, inquiry: 0, active: 0, completed: 0 }
  let recentProjects: Awaited<ReturnType<typeof getProjects>> = []

  try {
    stats = await getProjectStats()
    recentProjects = (await getProjects()).slice(0, 5)
  } catch {
    // RLS or no data
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
        Admin Dashboard
      </h1>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
          <p className="text-sm text-stone-500 dark:text-stone-400">Total Projects</p>
          <p className="text-2xl font-semibold text-stone-900 dark:text-stone-100">{stats.total}</p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
          <p className="text-sm text-stone-500 dark:text-stone-400">Active</p>
          <p className="text-2xl font-semibold text-cyan-600">{stats.active}</p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
          <p className="text-sm text-stone-500 dark:text-stone-400">Inquiries</p>
          <p className="text-2xl font-semibold text-blue-600">{stats.inquiry}</p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
          <p className="text-sm text-stone-500 dark:text-stone-400">Completed</p>
          <p className="text-2xl font-semibold text-green-600">{stats.completed}</p>
        </div>
      </div>

      {/* Recent Projects */}
      <div className="rounded-lg border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3 dark:border-stone-800">
          <h2 className="font-medium text-stone-900 dark:text-stone-100">Recent Projects</h2>
          <Link href="/projects" className="text-sm text-cyan-600 hover:text-cyan-700">
            View all
          </Link>
        </div>
        {recentProjects.length === 0 ? (
          <div className="p-8 text-center text-stone-500 dark:text-stone-400">
            No projects yet.{' '}
            <Link href="/projects/new" className="text-cyan-600 hover:underline">
              Create your first project
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-stone-200 dark:divide-stone-800">
            {recentProjects.map((project) => (
              <li key={project.id} className="px-4 py-3">
                <Link
                  href={`/projects/${project.id}`}
                  className="flex items-center justify-between hover:text-cyan-600"
                >
                  <div>
                    <p className="font-medium text-stone-900 dark:text-stone-100">
                      {project.project_name}
                    </p>
                    <p className="text-sm text-stone-500 dark:text-stone-400">
                      {project.client_name}
                    </p>
                  </div>
                  <span className="text-sm text-stone-500 dark:text-stone-400">
                    {project.status.replace(/_/g, ' ')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
