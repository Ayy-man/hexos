-- Case Studies table
CREATE TABLE case_studies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  client_name TEXT,
  industry TEXT,
  challenge TEXT,
  solution TEXT,
  results TEXT,
  content JSONB,
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  icon TEXT,
  blueprint_id UUID REFERENCES blueprints(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Updated_at trigger
CREATE TRIGGER update_case_studies_updated_at
  BEFORE UPDATE ON case_studies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE case_studies ENABLE ROW LEVEL SECURITY;

-- Admin/Internal: Full access for all operations
CREATE POLICY "Admin/Internal full access"
  ON case_studies FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'internal')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'internal')
    )
  );

-- DFY: View published only
CREATE POLICY "DFY view published"
  ON case_studies FOR SELECT
  TO authenticated
  USING (
    status = 'published' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'dfy'
    )
  );

-- Indexes
CREATE INDEX case_studies_status_idx ON case_studies(status);
CREATE INDEX case_studies_blueprint_id_idx ON case_studies(blueprint_id);
CREATE INDEX case_studies_created_at_idx ON case_studies(created_at DESC);
