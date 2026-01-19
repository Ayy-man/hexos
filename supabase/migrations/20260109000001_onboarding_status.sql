-- Add onboarding_status to track completed tours for each user
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_status JSONB DEFAULT '{"completed_tours": []}';

-- Comment on the column for clarity
COMMENT ON COLUMN public.profiles.onboarding_status IS 'Tracks which onboarding walkthroughs the user has completed or skipped.';
