'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(searchParams.get('error'))
  const [loading, setLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  // Listen for the PASSWORD_RECOVERY event from the hash fragment
  useEffect(() => {
    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true)
      }
    })

    // Also check if session is already set (e.g., page refresh after recovery link)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleUpdate(formData: FormData) {
    setError(null)
    setLoading(true)

    const password = formData.get('password') as string
    const confirm = formData.get('confirm') as string

    if (password !== confirm) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    router.push('/login?success=password-reset')
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-text-primary">Set new password</h1>
        <p className="mt-2 text-sm text-text-tertiary">
          Enter your new password below
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-signal-bad-dim p-3 text-sm text-signal-bad border border-signal-bad/25">
          {error}
        </div>
      )}

      {!sessionReady && !error && (
        <div className="rounded-md bg-cyan-50 dark:bg-cyan-900/20 p-3 text-sm text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800">
          Verifying your reset link...
        </div>
      )}

      <form action={handleUpdate} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-[10px] font-mono font-medium uppercase tracking-wider text-text-tertiary mb-1.5">
            New Password
          </label>
          <Input id="password" name="password" type="password" required minLength={8} placeholder="Min 8 characters" disabled={!sessionReady || loading} />
        </div>
        <div>
          <label htmlFor="confirm" className="block text-[10px] font-mono font-medium uppercase tracking-wider text-text-tertiary mb-1.5">
            Confirm Password
          </label>
          <Input id="confirm" name="confirm" type="password" required minLength={8} placeholder="Repeat password" disabled={!sessionReady || loading} />
        </div>
        <Button type="submit" className="w-full" disabled={!sessionReady || loading}>
          {loading ? 'Updating...' : 'Update password'}
        </Button>
      </form>
    </div>
  )
}
