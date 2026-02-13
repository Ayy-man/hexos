import { signIn } from '@/lib/auth/actions'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const TEST_USERS = [
  { email: 'admin@test.hexos', password: 'test1234', role: 'Admin', color: 'bg-red-500' },
  { email: 'dev@test.hexos', password: 'test1234', role: 'Dev', color: 'bg-cyan-500' },
  { email: 'dfy@test.hexos', password: 'test1234', role: 'DFY', color: 'bg-yellow-500' },
  { email: 'client@test.hexos', password: 'test1234', role: 'Client', color: 'bg-green-500' },
]

async function quickLogin(formData: FormData): Promise<void> {
  'use server'
  await signIn(formData)
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  let authError: string | null = null

  // Check if already logged in (auth only, no DB query)
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    // "Auth session missing" is expected when not logged in - ignore it
    if (error && !error.message.includes('session missing')) {
      authError = 'Auth check: ' + error.message
    } else if (user) {
      redirect('/dashboard')
    }
  } catch (e) {
    authError = 'Exception: ' + (e instanceof Error ? e.message : String(e))
  }

  const { error } = await searchParams
  const displayError = error || authError

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-text-primary">
          hexOS
        </h1>
        <p className="mt-2 text-sm text-text-tertiary">
          Sign in to your account
        </p>
      </div>

      {displayError && (
        <div className="rounded-md bg-signal-bad-dim p-3 text-sm text-signal-bad border border-signal-bad/25">
          {displayError}
        </div>
      )}

      <form action={signIn} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-[10px] font-mono font-medium uppercase tracking-wider text-text-tertiary mb-1.5"
          >
            Email
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-[10px] font-mono font-medium uppercase tracking-wider text-text-tertiary mb-1.5"
          >
            Password
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            placeholder="Enter your password"
          />
        </div>

        <Button type="submit" className="w-full">
          Sign in
        </Button>
      </form>

      {/* Quick Login for Testing */}
      <div className="pt-4 border-t border-border-rule">
        <p className="text-[10px] text-center font-mono uppercase tracking-wider text-text-ghost mb-3">
          Quick login (testing only)
        </p>
        <div className="grid grid-cols-2 gap-2">
          {TEST_USERS.map((user) => (
            <form key={user.email} action={quickLogin}>
              <input type="hidden" name="email" value={user.email} />
              <input type="hidden" name="password" value={user.password} />
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="w-full text-xs"
              >
                {user.role}
              </Button>
            </form>
          ))}
        </div>
      </div>
    </div>
  )
}
