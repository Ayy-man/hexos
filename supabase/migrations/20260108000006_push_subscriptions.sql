-- ============================================================================
-- Push Notifications Support for PWA
-- ============================================================================
-- This migration adds support for Web Push notifications to enable native
-- push capabilities for the Progressive Web App implementation.

-- ============================================================================
-- Table: push_subscriptions
-- ============================================================================
-- Stores push notification subscriptions for each user's devices/browsers
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Push subscription details (from PushSubscription API)
  endpoint TEXT NOT NULL,
  expiration_time TIMESTAMPTZ,

  -- Keys for message encryption (stored as JSONB)
  keys JSONB NOT NULL, -- { p256dh: string, auth: string }

  -- Device/browser metadata for management
  user_agent TEXT,
  device_name TEXT, -- Optional friendly name (e.g., "iPhone 14", "Chrome on Mac")

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure same endpoint isn't registered twice for same user
  UNIQUE(user_id, endpoint)
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_last_used ON push_subscriptions(last_used_at);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscriptions
CREATE POLICY "Users can view own push subscriptions"
  ON push_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own subscriptions
CREATE POLICY "Users can create own push subscriptions"
  ON push_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own subscriptions
CREATE POLICY "Users can update own push subscriptions"
  ON push_subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own subscriptions
CREATE POLICY "Users can delete own push subscriptions"
  ON push_subscriptions
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- Function: Cleanup expired subscriptions
-- ============================================================================
-- Automatically removes expired push subscriptions
CREATE OR REPLACE FUNCTION cleanup_expired_push_subscriptions()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM push_subscriptions
  WHERE expiration_time IS NOT NULL
    AND expiration_time < NOW();
END;
$$;

-- ============================================================================
-- Function: Update last_used_at on notification send
-- ============================================================================
-- Updates the last_used_at timestamp when a subscription is used
CREATE OR REPLACE FUNCTION update_push_subscription_last_used(subscription_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE push_subscriptions
  SET last_used_at = NOW()
  WHERE id = subscription_id;
END;
$$;

-- ============================================================================
-- Comments for documentation
-- ============================================================================
COMMENT ON TABLE push_subscriptions IS 'Stores Web Push API subscriptions for PWA push notifications';
COMMENT ON COLUMN push_subscriptions.endpoint IS 'Unique push service endpoint URL for this subscription';
COMMENT ON COLUMN push_subscriptions.keys IS 'Encryption keys (p256dh and auth) required for sending encrypted push messages';
COMMENT ON COLUMN push_subscriptions.expiration_time IS 'Optional expiration time for the subscription (null = no expiration)';
COMMENT ON COLUMN push_subscriptions.user_agent IS 'Browser/device user agent string for debugging';
COMMENT ON COLUMN push_subscriptions.device_name IS 'Optional friendly device name for user management';
COMMENT ON COLUMN push_subscriptions.last_used_at IS 'Timestamp of last successful push notification send';
