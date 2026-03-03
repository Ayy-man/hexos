import { redirect } from 'next/navigation'
import { getAuthUser, getAuthProfile } from '@/lib/auth/cached'
import { DASHBOARD_ROUTES, type Profile } from '@/lib/auth/types'
import { OnboardingWizard } from '@/features/onboarding/components/OnboardingWizard'
import { getUserMembership } from '@/lib/api/organizations'

export default async function OnboardingPage() {
  const { user, error: authError } = await getAuthUser()

  if (authError || !user) {
    redirect('/login')
  }

  const profile = await getAuthProfile()

  if (!profile) {
    redirect('/login')
  }

  // Already completed onboarding — go to dashboard
  if ((profile as Profile).has_completed_onboarding) {
    redirect(DASHBOARD_ROUTES[(profile as Profile).role] || '/dashboard')
  }

  // Get org info for DFY role step 2 content
  const membership = await getUserMembership(user.id).catch(() => null)

  return (
    <OnboardingWizard
      userId={user.id}
      profile={profile as Profile}
      organizationName={membership?.organization?.name || null}
      isOrgOwner={membership?.role === 'owner'}
    />
  )
}
