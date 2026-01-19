-- Phase 4.8.2: Deliverables Negotiation V2
-- Adds counter fields for name/description, version history, and multi-round negotiation

-- ============================================
-- 1. Add counter fields for name and description
-- ============================================
ALTER TABLE proposal_deliverables
ADD COLUMN IF NOT EXISTS counter_name TEXT,
ADD COLUMN IF NOT EXISTS counter_description TEXT;

COMMENT ON COLUMN proposal_deliverables.counter_name IS 'Admin counter-offer for name';
COMMENT ON COLUMN proposal_deliverables.counter_description IS 'Admin counter-offer for description';

-- ============================================
-- 2. Add new enum values for multi-round negotiation
-- ============================================
-- Postgres enums can't easily be altered, so we add new values
ALTER TYPE deliverable_change_status ADD VALUE IF NOT EXISTS 'counter_accepted';
ALTER TYPE deliverable_change_status ADD VALUE IF NOT EXISTS 'counter_rejected';

-- ============================================
-- 3. Create version history table
-- ============================================
CREATE TABLE IF NOT EXISTS proposal_deliverable_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID NOT NULL REFERENCES proposal_deliverables(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,

  -- State snapshot at this version
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  change_status TEXT,

  -- Counter values (if this was a counter action)
  counter_name TEXT,
  counter_description TEXT,
  counter_price DECIMAL(10,2),
  counter_note TEXT,

  -- Audit info
  action TEXT NOT NULL,
  -- Actions: 'created' | 'dfy_edited' | 'dfy_removed' | 'dfy_added' |
  --          'int_approved' | 'int_rejected' | 'int_countered' |
  --          'dfy_accepted_counter' | 'dfy_rejected_counter' | 'reverted'
  actor_id UUID REFERENCES profiles(id),
  actor_role TEXT NOT NULL CHECK (actor_role IN ('dfy', 'admin', 'system')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_deliverable_version UNIQUE(deliverable_id, version)
);

-- Indexes for history table
CREATE INDEX IF NOT EXISTS idx_deliverable_history_deliverable
ON proposal_deliverable_history(deliverable_id);

CREATE INDEX IF NOT EXISTS idx_deliverable_history_created
ON proposal_deliverable_history(created_at DESC);

-- Comments
COMMENT ON TABLE proposal_deliverable_history IS 'Version history for deliverable changes during negotiation';
COMMENT ON COLUMN proposal_deliverable_history.version IS 'Sequential version number starting at 1';
COMMENT ON COLUMN proposal_deliverable_history.action IS 'Type of action that created this version';
COMMENT ON COLUMN proposal_deliverable_history.actor_role IS 'Role of user who made the change: dfy, admin, or system';

-- ============================================
-- 4. RLS Policies for history table
-- ============================================
ALTER TABLE proposal_deliverable_history ENABLE ROW LEVEL SECURITY;

-- Everyone can read history (same visibility as deliverables)
CREATE POLICY "history_select_all" ON proposal_deliverable_history
FOR SELECT USING (true);

-- Authenticated users can insert history (controlled at app layer)
CREATE POLICY "history_insert_authenticated" ON proposal_deliverable_history
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- No updates or deletes - history is append-only
-- (Postgres will deny by default without policies)
