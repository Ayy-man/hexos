-- ============================================
-- Testing System for Deliverables
-- ============================================
-- Multi-stage testing workflow: Dev -> Admin/INT -> Client
-- Each stage must pass before the next unlocks
-- ============================================

-- ============================================
-- 1. Create ENUM types
-- ============================================

CREATE TYPE testing_stage AS ENUM ('dev', 'admin_int', 'client');

CREATE TYPE test_status AS ENUM ('pending', 'in_progress', 'passed', 'failed', 'escalated');

CREATE TYPE checklist_category AS ENUM (
  'functional',
  'edge_cases',
  'integration',
  'security',
  'ui_responsive',
  'custom'
);

-- ============================================
-- 2. Test sessions table - one per deliverable per stage
-- ============================================

CREATE TABLE IF NOT EXISTS deliverable_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID NOT NULL REFERENCES deliverables(id) ON DELETE CASCADE,
  stage testing_stage NOT NULL,
  status test_status DEFAULT 'pending',
  tested_by UUID REFERENCES profiles(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_items INTEGER DEFAULT 0,
  passed_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(deliverable_id, stage)
);

COMMENT ON TABLE deliverable_tests IS 'Testing sessions for each deliverable at each stage (dev, admin_int, client)';

-- ============================================
-- 3. Test checklist items - individual test checks
-- ============================================

CREATE TABLE IF NOT EXISTS test_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES deliverable_tests(id) ON DELETE CASCADE,
  category checklist_category NOT NULL,
  description TEXT NOT NULL,
  is_auto_generated BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  passed BOOLEAN,
  failure_reason TEXT,
  screenshot_url TEXT,
  tested_at TIMESTAMPTZ,
  blocker_id UUID REFERENCES blockers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE test_checklist_items IS 'Individual checklist items for testing sessions';

-- ============================================
-- 4. Add test_item_id reference to blockers
-- ============================================

ALTER TABLE blockers
ADD COLUMN IF NOT EXISTS test_item_id UUID REFERENCES test_checklist_items(id) ON DELETE SET NULL;

-- ============================================
-- 5. Indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_deliverable_tests_deliverable ON deliverable_tests(deliverable_id);
CREATE INDEX IF NOT EXISTS idx_deliverable_tests_status ON deliverable_tests(status) WHERE status IN ('in_progress', 'failed');
CREATE INDEX IF NOT EXISTS idx_deliverable_tests_stage_status ON deliverable_tests(stage, status);
CREATE INDEX IF NOT EXISTS idx_test_checklist_items_test ON test_checklist_items(test_id);
CREATE INDEX IF NOT EXISTS idx_test_checklist_items_blocker ON test_checklist_items(blocker_id) WHERE blocker_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_blockers_test_item ON blockers(test_item_id) WHERE test_item_id IS NOT NULL;

-- ============================================
-- 6. RLS Policies
-- ============================================

ALTER TABLE deliverable_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_checklist_items ENABLE ROW LEVEL SECURITY;

-- deliverable_tests policies
CREATE POLICY "tests_select" ON deliverable_tests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM deliverables d
      JOIN projects p ON d.project_id = p.id
      WHERE d.id = deliverable_id
      AND can_access_project(p.id)
    )
  );

CREATE POLICY "tests_insert" ON deliverable_tests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM deliverables d
      JOIN projects p ON d.project_id = p.id
      WHERE d.id = deliverable_id
      AND can_access_project(p.id)
    )
  );

CREATE POLICY "tests_update" ON deliverable_tests
  FOR UPDATE USING (
    tested_by = auth.uid() OR get_user_role() = 'admin'
  );

CREATE POLICY "tests_delete" ON deliverable_tests
  FOR DELETE USING (get_user_role() = 'admin');

-- test_checklist_items policies
CREATE POLICY "test_items_select" ON test_checklist_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM deliverable_tests dt
      JOIN deliverables d ON d.id = dt.deliverable_id
      JOIN projects p ON p.id = d.project_id
      WHERE dt.id = test_id
      AND can_access_project(p.id)
    )
  );

CREATE POLICY "test_items_insert" ON test_checklist_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM deliverable_tests dt
      JOIN deliverables d ON d.id = dt.deliverable_id
      JOIN projects p ON p.id = d.project_id
      WHERE dt.id = test_id
      AND can_access_project(p.id)
    )
  );

CREATE POLICY "test_items_update" ON test_checklist_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM deliverable_tests dt
      WHERE dt.id = test_id
      AND (dt.tested_by = auth.uid() OR get_user_role() = 'admin')
    )
  );

CREATE POLICY "test_items_delete" ON test_checklist_items
  FOR DELETE USING (get_user_role() = 'admin');

-- ============================================
-- 7. Helper functions
-- ============================================

CREATE OR REPLACE FUNCTION update_deliverable_tests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_deliverable_tests_updated_at ON deliverable_tests;
CREATE TRIGGER trg_deliverable_tests_updated_at
  BEFORE UPDATE ON deliverable_tests
  FOR EACH ROW
  EXECUTE FUNCTION update_deliverable_tests_updated_at();

-- Auto-update deliverable hill_position when test passes
CREATE OR REPLACE FUNCTION update_hill_position_from_testing()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'deliverable_tests' AND NEW.status = 'passed' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    UPDATE deliverables
    SET hill_position = CASE NEW.stage
      WHEN 'dev' THEN 90
      WHEN 'admin_int' THEN 95
      WHEN 'client' THEN 100
      ELSE 90
    END
    WHERE id = NEW.deliverable_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_hill_from_testing ON deliverable_tests;
CREATE TRIGGER trg_update_hill_from_testing
  AFTER UPDATE ON deliverable_tests
  FOR EACH ROW
  EXECUTE FUNCTION update_hill_position_from_testing();

-- ============================================
-- 8. Grant permissions
-- ============================================

GRANT SELECT, INSERT, UPDATE ON deliverable_tests TO authenticated;
GRANT SELECT, INSERT, UPDATE ON test_checklist_items TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
