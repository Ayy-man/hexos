'use client'

import dynamic from 'next/dynamic'
import { OnboardingWrapper } from '@/features/onboarding/components/OnboardingWrapper'
import { onboardingTours } from '@/features/onboarding/lib/tours'
import { TourCard } from '@/features/onboarding/components/TourCard'
import type { UserRole } from '@/lib/auth/types'

const OnbordaProvider = dynamic(
  () => import('onborda').then((m) => m.OnbordaProvider),
  { ssr: false }
)

const Onborda = dynamic(
  () => import('onborda').then((m) => m.Onborda),
  { ssr: false }
)

interface OnboardingShellProps {
  children: React.ReactNode
  userId: string
  role: UserRole
  onboardingStatus: any
}

export function OnboardingShell({
  children,
  userId,
  role,
  onboardingStatus,
}: OnboardingShellProps) {
  return (
    <OnbordaProvider>
      <Onborda
        steps={onboardingTours}
        showOnborda={true}
        shadowRgb="0, 0, 0"
        shadowOpacity="0.5"
        cardComponent={TourCard}
      >
        <OnboardingWrapper
          userId={userId}
          role={role}
          onboardingStatus={onboardingStatus}
        />
        {children}
      </Onborda>
    </OnbordaProvider>
  )
}
