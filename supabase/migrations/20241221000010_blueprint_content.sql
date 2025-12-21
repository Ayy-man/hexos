-- Add rich content and metadata columns to blueprints
-- Supports Plate.js document content, pricing tiers, and free-form tags

-- Add new columns
ALTER TABLE blueprints
ADD COLUMN IF NOT EXISTS content JSONB,
ADD COLUMN IF NOT EXISTS pricing_tiers JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published')),
ADD COLUMN IF NOT EXISTS icon TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create update_updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_blueprints_updated_at ON blueprints;
CREATE TRIGGER update_blueprints_updated_at
  BEFORE UPDATE ON blueprints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Update RLS to allow DFY to view published blueprints
DROP POLICY IF EXISTS "blueprints_dfy_select" ON blueprints;
CREATE POLICY "blueprints_dfy_select" ON blueprints
  FOR SELECT
  TO authenticated
  USING (
    status = 'published'
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'internal')
    )
  );

-- Comment on pricing_tiers structure
COMMENT ON COLUMN blueprints.pricing_tiers IS 'JSON array of pricing tiers: [{name: string, setup_price: number, monthly_price: number, features: string[]}]';
COMMENT ON COLUMN blueprints.content IS 'Plate.js document content as JSON';
COMMENT ON COLUMN blueprints.tags IS 'Free-form tags for filtering/categorization';
