'use client';

import { useEffect, useState } from 'react';
import { useOnborda } from 'onborda';
import { updateOnboardingStatus } from '../actions/onboardingActions';
import type { UserRole } from '@/lib/auth/types';

interface OnboardingWrapperProps {
    userId: string;
    role: UserRole;
    onboardingStatus: any;
}

const ROLE_TO_TOUR: Record<UserRole, string> = {
    admin: 'admin-welcome',
    client: 'client-welcome',
    dev: 'dev-welcome',
    dfy: 'dfy-welcome',
    internal: 'admin-welcome', // Internal users get the admin tour for now
};

export function OnboardingWrapper({ userId, role, onboardingStatus }: OnboardingWrapperProps) {
    const { startOnborda } = useOnborda();
    const [hasStarted, setHasStarted] = useState(false);

    useEffect(() => {
        if (hasStarted) return;

        const tourId = ROLE_TO_TOUR[role];
        if (!tourId) return;

        const completedTours = onboardingStatus?.completed_tours || [];

        if (!completedTours.includes(tourId)) {
            // Small delay to ensure layout is ready
            const timer = setTimeout(() => {
                startOnborda(tourId);
                setHasStarted(true);

                // Mark as completed in the background immediately or after certain steps?
                // For onboarding tours, usually marking "seen" is enough to not show again.
                updateOnboardingStatus(userId, tourId);
            }, 1000);

            return () => clearTimeout(timer);
        }
    }, [role, onboardingStatus, startOnborda, hasStarted, userId]);

    return null;
}
