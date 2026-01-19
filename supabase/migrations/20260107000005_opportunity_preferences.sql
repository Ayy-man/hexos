-- Dev Opportunity Preferences + Expiry Time
-- Allows devs to star/hide opportunities and adds expiry time for admins

-- ============================================================================
-- ADD EXPIRES_AT TO OPPORTUNITIES
-- ============================================================================

ALTER TABLE project_opportunities ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- ============================================================================
-- DEV OPPORTUNITY PREFERENCES TABLE
-- ============================================================================

CREATE TABLE public.dev_opportunity_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dev_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES project_opportunities(id) ON DELETE CASCADE,

  is_starred BOOLEAN DEFAULT FALSE,
  is_hidden BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(dev_id, opportunity_id)
);

-- Index for fast lookups
CREATE INDEX idx_dev_opp_prefs_dev ON dev_opportunity_preferences(dev_id);
CREATE INDEX idx_dev_opp_prefs_opportunity ON dev_opportunity_preferences(opportunity_id);
CREATE INDEX idx_dev_opp_prefs_starred ON dev_opportunity_preferences(dev_id, is_starred) WHERE is_starred = TRUE;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE dev_opportunity_preferences ENABLE ROW LEVEL SECURITY;

-- Devs can only manage their own preferences
CREATE POLICY "dev_opportunity_preferences_own" ON dev_opportunity_preferences
  FOR ALL USING (dev_id = auth.uid());

-- Admins can view all (for analytics)
CREATE POLICY "dev_opportunity_preferences_admin_select" ON dev_opportunity_preferences
  FOR SELECT USING (get_user_role() IN ('admin', 'internal'));

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON dev_opportunity_preferences TO authenticated;

-- ============================================================================
-- TRIGGER FOR UPDATED_AT
-- ============================================================================

CREATE TRIGGER dev_opportunity_preferences_updated_at
  BEFORE UPDATE ON dev_opportunity_preferences
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE dev_opportunity_preferences IS 'Dev preferences for opportunities (starred, hidden)';
COMMENT ON COLUMN dev_opportunity_preferences.is_starred IS 'Dev has starred this opportunity for quick access';
COMMENT ON COLUMN dev_opportunity_preferences.is_hidden IS 'Dev has hidden this opportunity from their view';
COMMENT ON COLUMN project_opportunities.expires_at IS 'When this opportunity expires and is no longer accepting applications';
