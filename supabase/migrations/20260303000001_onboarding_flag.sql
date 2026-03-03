-- Add onboarding completion flag to profiles
-- Note: prior 000001-000003 migration files from earlier phases were deleted before
-- ever being applied to Supabase, so this is the first 20260303 migration in Supabase's history.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT false;

-- Backfill: existing users with a role have implicitly completed onboarding
UPDATE public.profiles SET has_completed_onboarding = true WHERE role IS NOT NULL;
