import { validateInvitation, acceptInvitation } from '@/lib/api/invitations'
import { createClient } from '@/lib/supabase/server'
import { signUp, signInAndReturn } from '@/lib/auth/actions'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { ThemeToggle } from '@/components/theme-toggle'

// Helper to get invitation type display text
function getInvitationTitle(type: string, organizationName?: string | null): string {
  switch (type) {
    case 'admin':
      return 'Join hexOS as an Admin'
    case 'internal':
      return 'Join hexOS as Internal Team'
    case 'dfy_first':
      return `Create ${organizationName || 'your agency'} on hexOS`
    case 'dfy_team':
      return `Join ${organizationName || 'the team'} on hexOS`
    case 'dev_solo':
      return 'Your developer application has been approved'
    case 'dev_team':
      return `Join ${organizationName || 'the dev team'} on hexOS`
    default:
      return 'You\'ve been invited to join hexOS'
  }
}

function getInvitationSubtitle(type: string): string {
  switch (type) {
    case 'admin':
    case 'internal':
      return 'Create your account to access the Hexona dashboard'
    case 'dfy_first':
      return 'Create your account to set up your DFY agency'
    case 'dfy_team':
      return 'Create your account to join your team'
    case 'dev_solo':
      return 'Create your account to start taking on projects'
    case 'dev_team':
      return 'Create your account to join the dev agency'
    default:
      return 'Create your account to get started'
  }
}

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ error?: string; mode?: 'login' | 'signup' }>
}) {
  const { token } = await params
  const { error, mode = 'signup' } = await searchParams

  // Check if user is already logged in
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Validate the invitation
  const validation = await validateInvitation(token)

  // Handle invalid or expired invitations
  if (!validation.valid || !validation.invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-stone-950 relative">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="rounded-full w-16 h-16 bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">
              {validation.expired ? 'Invitation Expired' :
               validation.already_accepted ? 'Already Accepted' :
               'Invalid Invitation'}
            </h1>
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
              {validation.error || 'This invitation link is no longer valid.'}
            </p>
          </div>
          {validation.already_accepted && (
            <a
              href="/login"
              className="inline-block rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-cyan-700"
            >
              Sign in to your account
            </a>
          )}
        </div>
      </div>
    )
  }

  const invitation = validation.invitation

  // Server action for signup and accept
  async function handleSignup(formData: FormData) {
    'use server'
    const fullName = formData.get('name') as string
    const password = formData.get('password') as string

    // Sign up the user
    const signUpResult = await signUp(invitation.email, password, fullName)
    if (!signUpResult.success || !signUpResult.userId) {
      redirect(`/invite/${token}?error=${encodeURIComponent(signUpResult.error || 'Signup failed')}`)
    }

    // Accept the invitation
    const acceptResult = await acceptInvitation(token, signUpResult.userId)
    if (!acceptResult.success) {
      redirect(`/invite/${token}?error=${encodeURIComponent(acceptResult.error || 'Failed to accept invitation')}`)
    }

    // Sign in the user
    const signInResult = await signInAndReturn(invitation.email, password)
    if (!signInResult.success) {
      redirect(`/login?error=${encodeURIComponent('Account created. Please sign in.')}`)
    }

    revalidatePath('/dashboard')
    redirect(acceptResult.redirect_to)
  }

  // Server action for existing user login and accept
  async function handleLogin(formData: FormData) {
    'use server'
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    // Verify email matches invitation
    if (email.toLowerCase() !== invitation.email.toLowerCase()) {
      redirect(`/invite/${token}?error=${encodeURIComponent('Email does not match invitation')}&mode=login`)
    }

    // Sign in
    const signInResult = await signInAndReturn(email, password)
    if (!signInResult.success) {
      redirect(`/invite/${token}?error=${encodeURIComponent(signInResult.error || 'Login failed')}&mode=login`)
    }

    // Get the user ID
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      redirect(`/invite/${token}?error=${encodeURIComponent('Authentication failed')}&mode=login`)
    }

    // Accept the invitation
    const acceptResult = await acceptInvitation(token, user.id)
    if (!acceptResult.success) {
      redirect(`/invite/${token}?error=${encodeURIComponent(acceptResult.error || 'Failed to accept invitation')}&mode=login`)
    }

    revalidatePath('/dashboard')
    redirect(acceptResult.redirect_to)
  }

  // Server action to sign out and redirect to login mode for this invitation
  async function signOutAndRedirect() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect(`/invite/${token}?mode=login`)
  }

  // Server action for already logged-in user to accept
  async function handleAccept() {
    'use server'
    if (!user) {
      redirect(`/invite/${token}?error=${encodeURIComponent('Not authenticated')}`)
    }

    // Verify email matches invitation
    if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      redirect(`/invite/${token}?error=${encodeURIComponent('Your account email does not match this invitation')}`)
    }

    // Accept the invitation
    const acceptResult = await acceptInvitation(token, user.id)
    if (!acceptResult.success) {
      redirect(`/invite/${token}?error=${encodeURIComponent(acceptResult.error || 'Failed to accept invitation')}`)
    }

    revalidatePath('/dashboard')
    redirect(acceptResult.redirect_to)
  }

  const title = getInvitationTitle(invitation.type, invitation.organization?.name || invitation.new_organization_name)
  const subtitle = getInvitationSubtitle(invitation.type)

  // If user is already logged in, show accept button
  if (user) {
    const emailMatches = user.email?.toLowerCase() === invitation.email.toLowerCase()

    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-stone-950 relative">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">
              {title}
            </h1>
            {invitation.inviter && (
              <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
                Invited by {invitation.inviter.name || invitation.inviter.email}
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {emailMatches ? (
            <form action={handleAccept}>
              <div className="rounded-md bg-stone-100 dark:bg-stone-800 p-4 mb-4">
                <p className="text-sm text-stone-600 dark:text-stone-400">
                  Signed in as <strong className="text-stone-900 dark:text-stone-100">{user.email}</strong>
                </p>
              </div>
              <button
                type="submit"
                className="w-full rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
              >
                Accept Invitation
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-4">
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  This invitation was sent to <strong>{invitation.email}</strong>, but you&apos;re signed in as <strong>{user.email}</strong>.
                </p>
              </div>
              <form action={signOutAndRedirect}>
                <button
                  type="submit"
                  className="block w-full text-center rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-2 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800"
                >
                  Sign in as {invitation.email}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Show signup or login form
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-stone-950 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">
            {title}
          </h1>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
            {subtitle}
          </p>
          {invitation.inviter && (
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-500">
              Invited by {invitation.inviter.name || invitation.inviter.email}
            </p>
          )}
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Invitation email info */}
        <div className="rounded-md bg-stone-100 dark:bg-stone-800 p-3">
          <p className="text-sm text-stone-600 dark:text-stone-400">
            Invitation for: <strong className="text-stone-900 dark:text-stone-100">{invitation.email}</strong>
          </p>
        </div>

        {mode === 'signup' ? (
          // Signup form
          <form action={handleSignup} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-stone-700 dark:text-stone-300"
              >
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="mt-1 block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm placeholder-stone-400 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                placeholder="John Smith"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-stone-700 dark:text-stone-300"
              >
                Create Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                className="mt-1 block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm placeholder-stone-400 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                placeholder="Min 8 characters"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
            >
              Create Account & Accept
            </button>
          </form>
        ) : (
          // Login form
          <form action={handleLogin} className="space-y-4">
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
                defaultValue={invitation.email}
                className="mt-1 block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm placeholder-stone-400 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
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
              Sign in & Accept
            </button>
          </form>
        )}

        {/* Toggle between signup/login */}
        <div className="text-center text-sm">
          {mode === 'signup' ? (
            <p className="text-stone-600 dark:text-stone-400">
              Already have an account?{' '}
              <a href={`/invite/${token}?mode=login`} className="text-cyan-600 hover:text-cyan-700 dark:text-cyan-400">
                Sign in instead
              </a>
            </p>
          ) : (
            <p className="text-stone-600 dark:text-stone-400">
              Don&apos;t have an account?{' '}
              <a href={`/invite/${token}?mode=signup`} className="text-cyan-600 hover:text-cyan-700 dark:text-cyan-400">
                Create one
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
