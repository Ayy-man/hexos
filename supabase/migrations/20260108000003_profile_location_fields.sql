-- ============================================================================
-- Migration: Add location fields to profiles
-- Description: Adds city, country, and timezone to user profiles for LocationTag
-- ============================================================================

-- Add location columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.city IS 'User city for LocationTag display';
COMMENT ON COLUMN public.profiles.country IS 'User country for LocationTag display';
COMMENT ON COLUMN public.profiles.timezone IS 'User timezone abbreviation (PST, EST, UTC, etc.)';

-- Create index for location lookups (useful for team views)
CREATE INDEX IF NOT EXISTS idx_profiles_location ON public.profiles(country, city);
