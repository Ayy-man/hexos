'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { browserSupportsWebAuthn, startRegistration } from '@simplewebauthn/browser'
import { Fingerprint, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { PasskeyCredential } from '@/lib/api/passkeys'
import {
  generateRegistrationOptions,
  verifyRegistration,
} from '@/lib/auth/passkey-actions'
import { deletePasskeyAction } from '@/features/settings/actions/passkeyActions'

interface PasskeySettingsProps {
  passkeys: PasskeyCredential[]
}

export function PasskeySettings({ passkeys }: PasskeySettingsProps) {
  const router = useRouter()
  const [registering, setRegistering] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deviceName, setDeviceName] = useState('')
  const [showNameInput, setShowNameInput] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supported = browserSupportsWebAuthn()

  async function handleRegister() {
    if (!deviceName.trim() && showNameInput) {
      setError('Please enter a device name')
      return
    }

    setRegistering(true)
    setError(null)

    try {
      const { options, error: genError } = await generateRegistrationOptions()
      if (genError || !options) {
        setError(genError || 'Failed to start registration')
        return
      }

      const regResponse = await startRegistration({ optionsJSON: options })

      const { success, error: verifyError } = await verifyRegistration(
        regResponse,
        deviceName.trim() || undefined
      )

      if (verifyError || !success) {
        setError(verifyError || 'Registration failed')
        return
      }

      setDeviceName('')
      setShowNameInput(false)
      router.refresh()
    } catch (err) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setError(null)
        return
      }
      setError('Registration failed. Please try again.')
    } finally {
      setRegistering(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this passkey? You won\'t be able to use it to sign in anymore.')) {
      return
    }

    setDeletingId(id)
    const { error } = await deletePasskeyAction(id)
    if (error) {
      setError(error)
    }
    setDeletingId(null)
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fingerprint className="h-5 w-5" />
          Passkeys
        </CardTitle>
        <CardDescription>
          Sign in with Face ID, Touch ID, or a security key
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!supported ? (
          <p className="text-sm text-muted-foreground">
            Passkeys are not supported in this browser.
          </p>
        ) : (
          <>
            {passkeys.length > 0 && (
              <div className="space-y-2">
                {passkeys.map((pk) => (
                  <div
                    key={pk.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <Fingerprint className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          {pk.device_name || 'Passkey'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Added{' '}
                          {new Date(pk.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                          {pk.last_used_at && (
                            <>
                              {' · '}Last used{' '}
                              {new Date(pk.last_used_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(pk.id)}
                      disabled={deletingId === pk.id}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <p className="text-sm text-signal-bad">{error}</p>
            )}

            {showNameInput ? (
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. MacBook Pro, iPhone"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRegister()
                  }}
                />
                <Button onClick={handleRegister} disabled={registering}>
                  {registering ? 'Registering...' : 'Continue'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowNameInput(false)
                    setDeviceName('')
                    setError(null)
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => setShowNameInput(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Register new passkey
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
