-- hexOS Opportunities Overhaul
-- Adds bidding system, brief extractions cache, and extends opportunities/preferences

-- ============================================================================
-- EXTEND PROJECT_OPPORTUNITIES TABLE
-- ============================================================================

-- Add weeks-based estimates (supplementing existing estimated_hours)
ALTER TABLE project_opportunities ADD COLUMN IF NOT EXISTS estimated_weeks DECIMAL(3,1);
ALTER TABLE project_opportunities ADD COLUMN IF NOT EXISTS estimated_hours_min INT;
ALTER TABLE project_opportunities ADD COLUMN IF NOT EXISTS estimated_hours_max INT;

COMMENT ON COLUMN project_opportunities.estimated_weeks IS 'Estimated duration in weeks (replaces hours for longer projects)';
COMMENT ON COLUMN project_opportunities.estimated_hours_min IS 'Minimum hours estimate (for range-based estimates)';
COMMENT ON COLUMN project_opportunities.estimated_hours_max IS 'Maximum hours estimate (for range-based estimates)';

-- ============================================================================
-- DEV_OPPORTUNITY_BIDS TABLE
-- Developer bids on opportunities
-- ============================================================================

CREATE TABLE public.dev_opportunity_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES project_opportunities(id) ON DELETE CASCADE,
  dev_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Bid details
  proposed_weeks DECIMAL(3,1) NOT NULL,
  proposed_price DECIMAL(10,2),
  cover_message TEXT,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'shortlisted', 'accepted', 'rejected', 'withdrawn')),

  -- Admin review
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(opportunity_id, dev_id)
);

COMMENT ON TABLE dev_opportunity_bids IS 'Developer bids on project opportunities';
COMMENT ON COLUMN dev_opportunity_bids.proposed_weeks IS 'Developer estimate in weeks';
COMMENT ON COLUMN dev_opportunity_bids.proposed_price IS 'Optional proposed price for the work';
COMMENT ON COLUMN dev_opportunity_bids.status IS 'Bid status: pending, shortlisted, accepted, rejected, withdrawn';

-- ============================================================================
-- BRIEF_EXTRACTIONS TABLE
-- Cached AI-generated briefs for opportunities
-- ============================================================================

CREATE TABLE public.brief_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source reference
  source_type TEXT NOT NULL CHECK (source_type IN ('project', 'inquiry', 'blueprint', 'case_study', 'opportunity')),
  source_id UUID NOT NULL,

  -- Extraction content
  brief_content JSONB NOT NULL, -- Structured brief data
  redacted_brief TEXT NOT NULL, -- Human-readable redacted version

  -- Generation metadata
  model_used TEXT DEFAULT 'anthropic/claude-3.5-haiku',
  input_hash TEXT, -- SHA256 hash of input for cache invalidation
  tokens_used INT,
  generation_time_ms INT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),

  UNIQUE(source_type, source_id, input_hash)
);

COMMENT ON TABLE brief_extractions IS 'Cached AI-generated briefs for various sources';
COMMENT ON COLUMN brief_extractions.source_type IS 'Type of source: project, inquiry, blueprint, case_study, opportunity';
COMMENT ON COLUMN brief_extractions.brief_content IS 'Structured JSON brief data';
COMMENT ON COLUMN brief_extractions.redacted_brief IS 'Human-readable redacted version for devs';
COMMENT ON COLUMN brief_extractions.input_hash IS 'SHA256 hash for cache invalidation when source changes';
COMMENT ON COLUMN brief_extractions.expires_at IS 'Cache expiration time';

-- ============================================================================
-- EXTEND DEV_OPPORTUNITY_PREFERENCES TABLE
-- Add commitment tracking fields
-- ============================================================================

ALTER TABLE dev_opportunity_preferences ADD COLUMN IF NOT EXISTS commitment_status TEXT CHECK (commitment_status IN ('interested', 'committed', 'declined'));
ALTER TABLE dev_opportunity_preferences ADD COLUMN IF NOT EXISTS committed_at TIMESTAMPTZ;
ALTER TABLE dev_opportunity_preferences ADD COLUMN IF NOT EXISTS commitment_note TEXT;

COMMENT ON COLUMN dev_opportunity_preferences.commitment_status IS 'Dev commitment level: interested, committed, declined';
COMMENT ON COLUMN dev_opportunity_preferences.committed_at IS 'When dev committed to this opportunity';
COMMENT ON COLUMN dev_opportunity_preferences.commitment_note IS 'Optional note about commitment';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Bids indexes
CREATE INDEX idx_bids_opportunity ON dev_opportunity_bids(opportunity_id);
CREATE INDEX idx_bids_dev ON dev_opportunity_bids(dev_id);
CREATE INDEX idx_bids_status ON dev_opportunity_bids(status);
CREATE INDEX idx_bids_pending ON dev_opportunity_bids(opportunity_id, status) WHERE status = 'pending';

-- Brief extractions indexes
CREATE INDEX idx_brief_extractions_source ON brief_extractions(source_type, source_id);
CREATE INDEX idx_brief_extractions_expires ON brief_extractions(expires_at);
-- REMOVED: idx_brief_extractions_valid - can't use NOW() in index predicate (not IMMUTABLE)

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE dev_opportunity_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE brief_extractions ENABLE ROW LEVEL SECURITY;

-- BIDS POLICIES

-- Admins have full access to all bids
CREATE POLICY "bids_admin_all" ON dev_opportunity_bids
  FOR ALL USING (get_user_role() IN ('admin', 'internal'));

-- Devs can view and manage their own bids
CREATE POLICY "bids_dev_own" ON dev_opportunity_bids
  FOR ALL USING (get_user_role() = 'dev' AND dev_id = auth.uid());

-- BRIEF EXTRACTIONS POLICIES

-- Admins have full access
CREATE POLICY "brief_extractions_admin_all" ON brief_extractions
  FOR ALL USING (get_user_role() IN ('admin', 'internal'));

-- Devs can read cached briefs (for viewing opportunity details)
CREATE POLICY "brief_extractions_dev_select" ON brief_extractions
  FOR SELECT USING (get_user_role() = 'dev');

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON dev_opportunity_bids TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON brief_extractions TO authenticated;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at trigger for bids
CREATE TRIGGER dev_opportunity_bids_updated_at
  BEFORE UPDATE ON dev_opportunity_bids
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- No updated_at for brief_extractions (cache entries are immutable, replaced on change)

-- ============================================================================
-- NOTIFICATION ON BID SUBMISSION (optional, for admin awareness)
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_new_bid()
RETURNS TRIGGER AS $$
DECLARE
  v_opportunity_title TEXT;
  v_dev_name TEXT;
BEGIN
  -- Get opportunity title
  SELECT title INTO v_opportunity_title
  FROM project_opportunities WHERE id = NEW.opportunity_id;

  -- Get dev name
  SELECT name INTO v_dev_name
  FROM profiles WHERE id = NEW.dev_id;

  -- Notify admins (using existing notifications table pattern)
  INSERT INTO notifications (user_id, type, title, message, actor_id)
  SELECT
    p.id,
    'opportunity_bid',
    'New Bid Received',
    v_dev_name || ' submitted a bid for: ' || v_opportunity_title,
    NEW.dev_id
  FROM profiles p
  WHERE p.role IN ('admin', 'internal');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER bid_notify
  AFTER INSERT ON dev_opportunity_bids
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_bid();
