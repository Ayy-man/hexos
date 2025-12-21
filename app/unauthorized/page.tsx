import Link from 'next/link'

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 dark:bg-stone-950">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
          Unauthorized
        </h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">
          You don&apos;t have permission to access this page.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block text-sm text-cyan-600 hover:text-cyan-700 dark:text-cyan-400"
        >
          Return to login
        </Link>
      </div>
    </div>
  )
}
