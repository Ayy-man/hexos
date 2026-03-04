'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import {
  generateRegistrationOptions as generateRegOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions as generateAuthOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server'
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/server'

const RP_NAME = process.env.NEXT_PUBLIC_WEBAUTHN_RP_NAME || 'hexOS'
const RP_ID = process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID || 'localhost'
const ORIGIN = process.env.NEXT_PUBLIC_WEBAUTHN_ORIGIN || 'http://localhost:3000'

// Challenge expires in 5 minutes
const CHALLENGE_TTL_MS = 5 * 60 * 1000

// --- Registration (requires authenticated user) ---

export async function generateRegistrationOptions(): Promise<
  { options: PublicKeyCredentialCreationOptionsJSON; error?: undefined } | { error: string; options?: undefined }
> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Not authenticated' }
  }

  const admin = createAdminClient()

  // Fetch existing credentials to exclude
  const { data: existing } = await admin
    .from('passkey_credentials')
    .select('credential_id')
    .eq('user_id', user.id)

  const excludeCredentials = (existing || []).map((c) => ({
    id: c.credential_id,
  }))

  const options = await generateRegOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userName: user.email || user.id,
    userDisplayName: user.email || 'User',
    excludeCredentials,
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'preferred',
    },
    attestationType: 'none',
  })

  // Clean up expired challenges
  await admin
    .from('passkey_challenges')
    .delete()
    .lt('expires_at', new Date().toISOString())

  // Store challenge
  await admin.from('passkey_challenges').insert({
    challenge: options.challenge,
    user_id: user.id,
    expires_at: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString(),
  })

  return { options }
}

export async function verifyRegistration(
  response: RegistrationResponseJSON,
  deviceName?: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Not authenticated' }
  }

  const admin = createAdminClient()

  // Find the challenge for this user
  const { data: challengeRow } = await admin
    .from('passkey_challenges')
    .select('*')
    .eq('user_id', user.id)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!challengeRow) {
    return { error: 'Challenge expired or not found' }
  }

  try {
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    })

    if (!verification.verified || !verification.registrationInfo) {
      return { error: 'Verification failed' }
    }

    const { credential, credentialDeviceType, credentialBackedUp } =
      verification.registrationInfo

    // Store credential via admin client (bypasses RLS)
    const { error: insertError } = await admin
      .from('passkey_credentials')
      .insert({
        user_id: user.id,
        credential_id: credential.id,
        public_key: Buffer.from(credential.publicKey).toString('base64url'),
        counter: credential.counter,
        transports: response.response.transports || [],
        device_name: deviceName || `Passkey (${credentialDeviceType}${credentialBackedUp ? ', synced' : ''})`,
      })

    if (insertError) {
      return { error: 'Failed to store credential' }
    }

    // Clean up used challenge
    await admin
      .from('passkey_challenges')
      .delete()
      .eq('id', challengeRow.id)

    return { success: true }
  } catch (err) {
    console.error('Passkey registration verification error:', err)
    return { error: 'Verification failed' }
  }
}

// --- Authentication (no auth required) ---

export async function generateAuthenticationOptions(): Promise<
  { options: PublicKeyCredentialRequestOptionsJSON; error?: undefined } | { error: string; options?: undefined }
> {
  const admin = createAdminClient()

  const options = await generateAuthOptions({
    rpID: RP_ID,
    userVerification: 'preferred',
    // Empty allowCredentials for discoverable/resident key flow (Face ID)
    allowCredentials: [],
  })

  // Clean up expired challenges
  await admin
    .from('passkey_challenges')
    .delete()
    .lt('expires_at', new Date().toISOString())

  // Store challenge (no user_id since user is not yet authenticated)
  await admin.from('passkey_challenges').insert({
    challenge: options.challenge,
    expires_at: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString(),
  })

  return { options }
}

export async function verifyAuthentication(
  response: AuthenticationResponseJSON
): Promise<{ success?: boolean; error?: string }> {
  const admin = createAdminClient()

  // Look up the credential by ID
  const { data: credentialRow } = await admin
    .from('passkey_credentials')
    .select('*, auth_user:user_id(email)')
    .eq('credential_id', response.id)
    .single()

  if (!credentialRow) {
    return { error: 'Passkey not recognized' }
  }

  // Find a valid challenge (not tied to a user for auth flow)
  const { data: challengeRow } = await admin
    .from('passkey_challenges')
    .select('*')
    .is('user_id', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!challengeRow) {
    return { error: 'Challenge expired or not found' }
  }

  try {
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: credentialRow.credential_id,
        publicKey: Buffer.from(credentialRow.public_key, 'base64url'),
        counter: credentialRow.counter,
        transports: credentialRow.transports || [],
      },
    })

    if (!verification.verified) {
      return { error: 'Authentication failed' }
    }

    // Update counter and last_used_at
    await admin
      .from('passkey_credentials')
      .update({
        counter: verification.authenticationInfo.newCounter,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', credentialRow.id)

    // Clean up used challenge
    await admin
      .from('passkey_challenges')
      .delete()
      .eq('id', challengeRow.id)

    // Get user email for magic link
    const userEmail = (credentialRow.auth_user as { email: string } | null)?.email
    if (!userEmail) {
      return { error: 'User email not found' }
    }

    // Generate magic link via admin API and immediately verify it
    const { data: linkData, error: linkError } =
      await admin.auth.admin.generateLink({
        type: 'magiclink',
        email: userEmail,
      })

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error('Magic link generation error:', linkError)
      return { error: 'Failed to create session' }
    }

    // Verify the OTP to establish a Supabase session with cookies
    const supabase = await createClient()
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: 'magiclink',
    })

    if (verifyError) {
      console.error('OTP verification error:', verifyError)
      return { error: 'Failed to create session' }
    }

    return { success: true }
  } catch (err) {
    console.error('Passkey authentication verification error:', err)
    return { error: 'Authentication failed' }
  }
}
