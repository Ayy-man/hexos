import { signIn, signInWithGoogle, signInWithMagicLink } from '@/lib/auth/actions'
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
  searchParams: Promise<{ error?: string; mode?: string; success?: string }>
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

  const { error, mode, success } = await searchParams
  const displayError = error || authError

  async function handleGoogleSignIn() {
    'use server'
    await signInWithGoogle()
  }

  async function handleMagicLink(formData: FormData) {
    'use server'
    const email = formData.get('email') as string
    const result = await signInWithMagicLink(email)
    if (!result.success) {
      redirect(`/login?error=${encodeURIComponent(result.error || 'Failed to send magic link')}&mode=magic-link`)
    }
    redirect('/login?success=magic-link')
  }

  if (success === 'magic-link') {
    return (
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-2xl font-semibold text-text-primary">Check your email</h1>
        <p className="text-sm text-text-tertiary">
          We sent you a sign-in link. Click the link in your email to continue.
        </p>
        <a href="/login" className="text-sm text-cyan-600 hover:text-cyan-700 dark:text-cyan-400">
          Back to sign in
        </a>
      </div>
    )
  }

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

      {success === 'password-reset' && (
        <div className="rounded-md bg-cyan-50 dark:bg-cyan-900/20 p-3 text-sm text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800">
          Password updated successfully. Please sign in.
        </div>
      )}

      {/* Google OAuth */}
      <form action={handleGoogleSignIn}>
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 rounded-md border border-border-rule bg-bg-subtle px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-muted"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>
      </form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border-rule" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-bg-void px-2 text-text-ghost">or</span>
        </div>
      </div>

      {mode === 'magic-link' ? (
        <>
          <form action={handleMagicLink} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-[10px] font-mono font-medium uppercase tracking-wider text-text-tertiary mb-1.5">
                Email
              </label>
              <Input id="email" name="email" type="email" required placeholder="you@example.com" />
            </div>
            <Button type="submit" className="w-full">Send magic link</Button>
          </form>
          <div className="text-center">
            <a href="/login" className="text-xs text-text-tertiary hover:text-text-secondary">
              Use password instead
            </a>
          </div>
        </>
      ) : (
        <>
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

            <div className="text-right">
              <a href="/forgot-password" className="text-xs text-text-tertiary hover:text-text-secondary">
                Forgot password?
              </a>
            </div>

            <Button type="submit" className="w-full">
              Sign in
            </Button>
          </form>

          <div className="text-center">
            <a href="/login?mode=magic-link" className="text-xs text-text-tertiary hover:text-text-secondary">
              Use magic link instead
            </a>
          </div>
        </>
      )}

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
