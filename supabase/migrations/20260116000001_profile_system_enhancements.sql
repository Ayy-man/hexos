-- ============================================================================
-- Profile System Enhancements
-- Description: Adds avatar, bio, phone, notification preferences, and dev availability
-- ============================================================================

-- ============================================================================
-- ENHANCE PROFILES TABLE
-- ============================================================================

-- Avatar URL for profile pictures
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Bio/description (250 char max in UI)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- Phone number for future WhatsApp integration
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- Company name (for DFY partners and clients)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_name TEXT;

-- Notification preferences (JSONB for flexibility)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "in_app": {
    "project_updates": true,
    "deliverable_completed": true,
    "mentions": true,
    "direct_messages": true,
    "inquiry_updates": true,
    "payment_updates": true
  },
  "email": {
    "project_updates": false,
    "deliverable_completed": true,
    "mentions": true,
    "inquiry_updates": true,
    "payment_updates": true,
    "weekly_digest": false
  }
}'::jsonb;

-- UI preferences (theme, layout, etc.)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ui_preferences JSONB DEFAULT '{
  "compact_mode": false,
  "default_project_view": "list",
  "default_inquiry_view": "board"
}'::jsonb;

-- Availability status for developers
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS availability_status TEXT DEFAULT 'available'
  CHECK (availability_status IN ('available', 'busy', 'unavailable', 'away'));

-- Availability message (e.g., "On vacation until Jan 20")
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS availability_message TEXT;

-- Comments
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL to user avatar in Supabase storage';
COMMENT ON COLUMN public.profiles.bio IS 'Short bio/description (max 250 chars in UI)';
COMMENT ON COLUMN public.profiles.phone IS 'Phone number for WhatsApp notifications';
COMMENT ON COLUMN public.profiles.company_name IS 'Company name for DFY partners and clients';
COMMENT ON COLUMN public.profiles.notification_preferences IS 'JSONB notification settings by channel';
COMMENT ON COLUMN public.profiles.ui_preferences IS 'JSONB UI/display preferences';
COMMENT ON COLUMN public.profiles.availability_status IS 'Dev availability: available, busy, unavailable, away';
COMMENT ON COLUMN public.profiles.availability_message IS 'Custom status message for availability';

-- ============================================================================
-- DEV AVAILABILITY TABLE ENHANCEMENTS
-- The table already exists - add missing columns for capacity tracking
-- ============================================================================

-- Add missing columns to existing dev_availability table
ALTER TABLE public.dev_availability ADD COLUMN IF NOT EXISTS max_concurrent_projects INT DEFAULT 5;
ALTER TABLE public.dev_availability ADD COLUMN IF NOT EXISTS auto_assign BOOLEAN DEFAULT true;
ALTER TABLE public.dev_availability ADD COLUMN IF NOT EXISTS status_message TEXT;
ALTER TABLE public.dev_availability ADD COLUMN IF NOT EXISTS available_until DATE;

-- Ensure there's a created_at column (may be missing)
ALTER TABLE public.dev_availability ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Indexes (only create if not exists)
CREATE INDEX IF NOT EXISTS idx_dev_availability_is_available ON dev_availability(is_available);
CREATE INDEX IF NOT EXISTS idx_profiles_availability ON profiles(availability_status) WHERE role = 'dev';

-- Comments
COMMENT ON COLUMN public.dev_availability.max_concurrent_projects IS 'Maximum projects dev can work on simultaneously';
COMMENT ON COLUMN public.dev_availability.auto_assign IS 'Whether to include in auto-assignment pool';
COMMENT ON COLUMN public.dev_availability.status_message IS 'Custom status message';
