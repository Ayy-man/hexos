import Link from 'next/link'
import { requireProfile } from '@/lib/auth/guards'
import { signOut } from '@/lib/auth/actions'
import { DASHBOARD_ROUTES } from '@/lib/auth/types'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await requireProfile()
  const dashboardPath = DASHBOARD_ROUTES[profile.role]
  const isAdmin = profile.role === 'admin' || profile.role === 'internal'

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link
              href={dashboardPath}
              className="text-lg font-semibold text-stone-900 dark:text-stone-100"
            >
              hexOS
            </Link>

            <nav className="flex items-center gap-4">
              <Link
                href={dashboardPath}
                className="text-sm text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
              >
                Dashboard
              </Link>
              <Link
                href="/projects"
                className="text-sm text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
              >
                Projects
              </Link>
              {isAdmin && (
                <Link
                  href="/projects/new"
                  className="text-sm text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
                >
                  New Project
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-medium text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300">
              {profile.role}
            </span>
            <span className="text-sm text-stone-600 dark:text-stone-400">
              {profile.name}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="text-sm text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  )
}
