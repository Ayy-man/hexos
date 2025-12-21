import { signIn } from '@/lib/auth/actions'
import { getProfile } from '@/lib/auth/guards'
import { redirect } from 'next/navigation'
import { DASHBOARD_ROUTES } from '@/lib/auth/types'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  // Redirect if already logged in
  const profile = await getProfile()
  if (profile) {
    redirect(DASHBOARD_ROUTES[profile.role])
  }

  const { error } = await searchParams

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
          hexOS
        </h1>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
          Sign in to your account
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <form action={signIn} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-stone-700 dark:text-stone-300"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1 block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm placeholder-stone-400 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-stone-700 dark:text-stone-300"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="mt-1 block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm placeholder-stone-400 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
            placeholder="Enter your password"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
        >
          Sign in
        </button>
      </form>
    </div>
  )
}
