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
            console.log(`[Onboarding] Tour '${tourId}' not completed. Starting in 2.5s...`);
            // Small delay to ensure layout is ready
            const timer = setTimeout(() => {
                console.log(`[Onboarding] Executing startOnborda('${tourId}')`);
                startOnborda(tourId);
                setHasStarted(true);

                // Mark as completed in the background immediately
                // We'll keep this enabled but maybe it was firing too fast?
                updateOnboardingStatus(userId, tourId).then(res => {
                    console.log('[Onboarding] Status updated:', res);
                });
            }, 2500);

            return () => clearTimeout(timer);
        } else {
            console.log(`[Onboarding] Tour '${tourId}' already completed.`);
        }
    }, [role, onboardingStatus, startOnborda, hasStarted, userId]);

    return null;
}
