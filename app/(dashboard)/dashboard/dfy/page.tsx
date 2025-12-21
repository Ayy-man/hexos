import { requireRole } from '@/lib/auth/guards'

export default async function DfyDashboard() {
  await requireRole(['dfy'])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
        DFY Partner Dashboard
      </h1>
      <p className="text-stone-600 dark:text-stone-400">
        Your deals and referred projects.
      </p>

      <div className="rounded-lg border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
        <p className="text-center text-stone-500 dark:text-stone-400">
          No deals yet. Submit an inquiry to get started.
        </p>
      </div>
    </div>
  )
}
