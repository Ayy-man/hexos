import { resetPassword } from '@/lib/auth/actions'
import { redirect } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const { error, success } = await searchParams

  async function handleReset(formData: FormData) {
    'use server'
    const email = formData.get('email') as string
    const result = await resetPassword(email)
    if (!result.success) {
      redirect(`/forgot-password?error=${encodeURIComponent(result.error || 'Failed to send reset email')}`)
    }
    redirect('/forgot-password?success=1')
  }

  if (success) {
    return (
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-2xl font-semibold text-text-primary">Check your email</h1>
        <p className="text-sm text-text-tertiary">
          If an account exists with that email, you&apos;ll receive a password reset link.
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
        <h1 className="text-2xl font-semibold text-text-primary">Reset password</h1>
        <p className="mt-2 text-sm text-text-tertiary">
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-signal-bad-dim p-3 text-sm text-signal-bad border border-signal-bad/25">
          {error}
        </div>
      )}

      <form action={handleReset} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-[10px] font-mono font-medium uppercase tracking-wider text-text-tertiary mb-1.5">
            Email
          </label>
          <Input id="email" name="email" type="email" required placeholder="you@example.com" />
        </div>
        <Button type="submit" className="w-full">Send reset link</Button>
      </form>

      <div className="text-center">
        <a href="/login" className="text-sm text-text-tertiary hover:text-text-secondary">
          Back to sign in
        </a>
      </div>
    </div>
  )
}
