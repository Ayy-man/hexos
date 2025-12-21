import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProject } from '@/lib/api/projects'
import { requireAuth, getProfile } from '@/lib/auth/guards'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
  in_progress: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
  blocked: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  done: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAuth()
  const profile = await getProfile()
  const { id } = await params

  let project
  try {
    project = await getProject(id)
  } catch {
    notFound()
  }

  const isAdmin = profile?.role === 'admin'
  const deliverables = project.deliverables || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/projects"
              className="text-sm text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
            >
              Projects
            </Link>
            <span className="text-stone-400">/</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-stone-900 dark:text-stone-100">
            {project.project_name}
          </h1>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
            {project.client_name}
            {project.client_business && ` · ${project.client_business}`}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            STATUS_COLORS[project.status] || 'bg-stone-100 text-stone-700'
          }`}
        >
          {formatStatus(project.status)}
        </span>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
          <p className="text-sm text-stone-500 dark:text-stone-400">Assigned Dev</p>
          <p className="mt-1 font-medium text-stone-900 dark:text-stone-100">
            {project.assigned_dev?.name || 'Unassigned'}
          </p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
          <p className="text-sm text-stone-500 dark:text-stone-400">Target Delivery</p>
          <p className="mt-1 font-medium text-stone-900 dark:text-stone-100">
            {project.target_delivery_date
              ? new Date(project.target_delivery_date).toLocaleDateString()
              : 'Not set'}
          </p>
        </div>
        {isAdmin && (
          <div className="rounded-lg border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
            <p className="text-sm text-stone-500 dark:text-stone-400">Quoted Price</p>
            <p className="mt-1 font-medium text-stone-900 dark:text-stone-100">
              {project.quoted_price
                ? `$${project.quoted_price.toLocaleString()}`
                : 'Not set'}
            </p>
          </div>
        )}
      </div>

      {/* Deliverables */}
      <div className="rounded-lg border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3 dark:border-stone-800">
          <h2 className="font-medium text-stone-900 dark:text-stone-100">
            Deliverables
          </h2>
          <span className="text-sm text-stone-500 dark:text-stone-400">
            {deliverables.filter((d) => d.status === 'done').length} / {deliverables.length} done
          </span>
        </div>

        {deliverables.length === 0 ? (
          <div className="p-8 text-center text-stone-500 dark:text-stone-400">
            No deliverables yet.
          </div>
        ) : (
          <ul className="divide-y divide-stone-200 dark:divide-stone-800">
            {deliverables.map((deliverable) => (
              <li
                key={deliverable.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      deliverable.status === 'done'
                        ? 'bg-green-500'
                        : deliverable.status === 'in_progress'
                          ? 'bg-cyan-500'
                          : deliverable.status === 'blocked'
                            ? 'bg-red-500'
                            : 'bg-stone-300 dark:bg-stone-600'
                    }`}
                  />
                  <span className="text-stone-900 dark:text-stone-100">
                    {deliverable.title}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  {deliverable.due_date && (
                    <span className="text-sm text-stone-500 dark:text-stone-400">
                      Due {new Date(deliverable.due_date).toLocaleDateString()}
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      STATUS_COLORS[deliverable.status] || STATUS_COLORS.pending
                    }`}
                  >
                    {formatStatus(deliverable.status)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Notes */}
      {project.notes && (
        <div className="rounded-lg border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
          <h2 className="font-medium text-stone-900 dark:text-stone-100">Notes</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-stone-600 dark:text-stone-400">
            {project.notes}
          </p>
        </div>
      )}
    </div>
  )
}
