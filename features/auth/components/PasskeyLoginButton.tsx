'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { browserSupportsWebAuthn, startAuthentication } from '@simplewebauthn/browser'
import { Fingerprint } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  generateAuthenticationOptions,
  verifyAuthentication,
} from '@/lib/auth/passkey-actions'

export function PasskeyLoginButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!browserSupportsWebAuthn()) {
    return null
  }

  async function handlePasskeyLogin() {
    setLoading(true)
    setError(null)

    try {
      const { options, error: genError } = await generateAuthenticationOptions()
      if (genError || !options) {
        setError(genError || 'Failed to start authentication')
        return
      }

      const authResponse = await startAuthentication({ optionsJSON: options })

      const { success, error: verifyError } = await verifyAuthentication(authResponse)
      if (verifyError || !success) {
        setError(verifyError || 'Authentication failed')
        return
      }

      router.push('/dashboard')
    } catch (err) {
      // User cancelled the biometric prompt
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setError(null)
        return
      }
      setError('Authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handlePasskeyLogin}
        disabled={loading}
      >
        <Fingerprint className="mr-2 h-4 w-4" />
        {loading ? 'Authenticating...' : 'Sign in with passkey'}
      </Button>
      {error && (
        <p className="text-xs text-signal-bad text-center">{error}</p>
      )}
    </div>
  )
}
