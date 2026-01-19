-- ============================================
-- Hill Chart Progress Tracking System
-- ============================================
-- Adds hill chart position tracking to deliverables
-- with history for sparkline visualization
-- ============================================

-- ============================================
-- 1. Add hill chart columns to deliverables
-- ============================================
ALTER TABLE deliverables
ADD COLUMN IF NOT EXISTS hill_position INTEGER DEFAULT 0 CHECK (hill_position >= 0 AND hill_position <= 100),
ADD COLUMN IF NOT EXISTS hill_color TEXT;

COMMENT ON COLUMN deliverables.hill_position IS 'Position on hill chart (0-100%). 0-49 = Figuring Out, 50-89 = Making It, 90-100 = Done';
COMMENT ON COLUMN deliverables.hill_color IS 'Custom color for hill chart dot (hex code or null for auto-generated)';

-- ============================================
-- 2. Create position history table
-- ============================================
CREATE TABLE IF NOT EXISTS deliverable_position_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID NOT NULL REFERENCES deliverables(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position >= 0 AND position <= 100),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

COMMENT ON TABLE deliverable_position_history IS 'History of hill chart position updates for sparkline visualization';

-- ============================================
-- 3. Indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_del_position_history_del_id
ON deliverable_position_history(deliverable_id);

CREATE INDEX IF NOT EXISTS idx_del_position_history_created
ON deliverable_position_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_deliverables_hill_position
ON deliverables(hill_position)
WHERE hill_position > 0;

-- ============================================
-- 4. RLS Policies
-- ============================================
ALTER TABLE deliverable_position_history ENABLE ROW LEVEL SECURITY;

-- Select: Anyone who can access the project can view history
CREATE POLICY "history_select" ON deliverable_position_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM deliverables d
      JOIN projects p ON d.project_id = p.id
      WHERE d.id = deliverable_id
      AND can_access_project(p.id)
    )
  );

-- Insert: Admin, internal, and dev can log position updates
CREATE POLICY "history_insert" ON deliverable_position_history
  FOR INSERT WITH CHECK (
    get_user_role() IN ('admin', 'internal', 'dev')
    AND EXISTS (
      SELECT 1 FROM deliverables d
      JOIN projects p ON d.project_id = p.id
      WHERE d.id = deliverable_id
      AND can_access_project(p.id)
    )
  );

-- Update: Only the creator can update their own history entry (for notes)
CREATE POLICY "history_update" ON deliverable_position_history
  FOR UPDATE USING (
    created_by = auth.uid()
  );

-- Delete: Admin only
CREATE POLICY "history_delete" ON deliverable_position_history
  FOR DELETE USING (
    get_user_role() = 'admin'
  );

-- ============================================
-- 5. Helper function: Generate color from string
-- ============================================
CREATE OR REPLACE FUNCTION generate_hill_color(input_text TEXT)
RETURNS TEXT AS $$
DECLARE
  hash INTEGER;
  hue INTEGER;
BEGIN
  -- Generate a deterministic hash from the input text
  hash := abs(hashtext(input_text));
  -- Convert to hue (0-360) with good saturation colors
  hue := (hash % 360);
  -- Return HSL color as hex (approximation for high saturation/lightness)
  RETURN CASE
    WHEN hue < 30 THEN '#ef4444'   -- red
    WHEN hue < 60 THEN '#f59e0b'   -- amber
    WHEN hue < 90 THEN '#84cc16'   -- lime
    WHEN hue < 150 THEN '#22c55e'  -- green
    WHEN hue < 210 THEN '#06b6d4'  -- cyan
    WHEN hue < 270 THEN '#3b82f6'  -- blue
    WHEN hue < 330 THEN '#a855f7'  -- purple
    ELSE '#ec4899'                  -- pink
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION generate_hill_color IS 'Generates a consistent color for hill chart based on deliverable title';

-- ============================================
-- 6. Trigger to auto-set color if not provided
-- ============================================
CREATE OR REPLACE FUNCTION set_hill_color_if_null()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.hill_color IS NULL THEN
    NEW.hill_color := generate_hill_color(NEW.title);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_hill_color ON deliverables;
CREATE TRIGGER trg_set_hill_color
  BEFORE INSERT OR UPDATE ON deliverables
  FOR EACH ROW
  EXECUTE FUNCTION set_hill_color_if_null();

-- ============================================
-- 7. Grant permissions
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON deliverable_position_history TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
