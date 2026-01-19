-- ============================================================================
-- ACTIVITY LOGS SYSTEM
-- Comprehensive audit trail for hexOS
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE activity_log_category AS ENUM (
  'crud',
  'auth',
  'ai',
  'payment',
  'conversation',
  'status',
  'file',
  'error'
);

-- ============================================================================
-- TABLES
-- ============================================================================

CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),

  -- Who
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_email TEXT,
  user_role TEXT,
  session_id TEXT,

  -- What
  action TEXT NOT NULL,
  category activity_log_category NOT NULL,

  -- Target entity
  entity_type TEXT,
  entity_id UUID,
  entity_name TEXT,

  -- Context
  metadata JSONB DEFAULT '{}',
  changes JSONB,

  -- AI specific
  ai_model TEXT,
  ai_prompt TEXT,
  ai_response TEXT,
  ai_tokens_used INTEGER,
  ai_latency_ms INTEGER,

  -- Request context
  ip_address INET,
  user_agent TEXT,
  request_path TEXT,
  request_method TEXT,

  -- Performance
  duration_ms INTEGER,
  search_text TEXT,

  -- Error tracking (client-side)
  error_stack TEXT,
  error_component TEXT,
  error_context JSONB,
  browser TEXT,
  os TEXT,
  screen_size TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Primary query patterns
CREATE INDEX idx_activity_logs_timestamp ON activity_logs(timestamp DESC);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id, timestamp DESC);
CREATE INDEX idx_activity_logs_action ON activity_logs(action, timestamp DESC);
CREATE INDEX idx_activity_logs_category ON activity_logs(category, timestamp DESC);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_session ON activity_logs(session_id);

-- Full-text search
CREATE INDEX idx_activity_logs_search ON activity_logs USING gin(to_tsvector('english', COALESCE(search_text, '')));

-- Error category for quick error filtering
CREATE INDEX idx_activity_logs_errors ON activity_logs(timestamp DESC)
  WHERE category = 'error';

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get activity log stats for admin dashboard
CREATE OR REPLACE FUNCTION get_activity_log_stats()
RETURNS TABLE (
  total_logs BIGINT,
  logs_today BIGINT,
  logs_by_category JSONB,
  logs_by_user JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM activity_logs)::BIGINT AS total_logs,
    (SELECT COUNT(*) FROM activity_logs WHERE DATE(timestamp) = CURRENT_DATE)::BIGINT AS logs_today,
    (
      SELECT COALESCE(jsonb_object_agg(cat, cnt), '{}'::JSONB)
      FROM (
        SELECT category::TEXT as cat, COUNT(*)::BIGINT as cnt
        FROM activity_logs
        GROUP BY category
      ) t
    )::JSONB AS logs_by_category,
    (
      SELECT COALESCE(jsonb_object_agg(email, cnt), '{}'::JSONB)
      FROM (
        SELECT user_email as email, COUNT(*)::BIGINT as cnt
        FROM activity_logs
        WHERE user_email IS NOT NULL
        GROUP BY user_email
        ORDER BY cnt DESC
        LIMIT 10
      ) t
    )::JSONB AS logs_by_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Archive old logs (callable function, not cron)
CREATE OR REPLACE FUNCTION archive_old_activity_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM activity_logs
    WHERE timestamp < NOW() - (days_to_keep || ' days')::INTERVAL
    RETURNING id
  )
  SELECT COUNT(*) INTO archived_count FROM deleted;

  RETURN archived_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Admin and internal users have full access
CREATE POLICY "Admin full access to activity_logs"
  ON activity_logs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'internal')
    )
  );

-- Users can see their own activity and activity for entities they can access
CREATE POLICY "Users view own and entity activity"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      entity_type = 'project'
      AND entity_id IS NOT NULL
      AND can_access_project(entity_id)
    )
  );

-- Service role can insert (for server-side logging)
CREATE POLICY "Service role insert activity_logs"
  ON activity_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant usage on the enum type
GRANT USAGE ON TYPE activity_log_category TO authenticated;
GRANT USAGE ON TYPE activity_log_category TO service_role;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_activity_log_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION archive_old_activity_logs(INTEGER) TO authenticated;
