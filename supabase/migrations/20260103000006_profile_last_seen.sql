-- Add last_seen_at column to profiles table for presence tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW();

-- Index for efficient querying of recently active users
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON profiles (last_seen_at DESC);
