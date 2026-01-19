'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Updates the onboarding status for the current user
 */
export async function updateOnboardingStatus(userId: string, tourId: string) {
    const supabase = await createClient();

    // Get current status
    const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('onboarding_status')
        .eq('id', userId)
        .single();

    if (fetchError) {
        console.error('[Onboarding] Failed to fetch profile:', fetchError);
        return { success: false, error: fetchError.message };
    }

    const currentStatus = (profile.onboarding_status as any) || { completed_tours: [] };

    // Add new tour if not already there
    if (!currentStatus.completed_tours.includes(tourId)) {
        currentStatus.completed_tours.push(tourId);
    }

    const { error: updateError } = await supabase
        .from('profiles')
        .update({ onboarding_status: currentStatus })
        .eq('id', userId);

    if (updateError) {
        console.error('[Onboarding] Failed to update status:', updateError);
        return { success: false, error: updateError.message };
    }

    return { success: true };
}

/**
 * Resets the onboarding status for the current user
 */
export async function resetOnboardingStatus(userId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('profiles')
        .update({ onboarding_status: { completed_tours: [] } })
        .eq('id', userId);

    if (error) {
        console.error('[Onboarding] Failed to reset status:', error);
        return { success: false, error: error.message };
    }

    // Use revalidatePath to ensure the layout/component gets the fresh state
    revalidatePath('/dashboard');

    return { success: true };
}
