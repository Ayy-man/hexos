-- Junction table: inquiry selections (blueprints and/or case studies per inquiry)
CREATE TABLE IF NOT EXISTS inquiry_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('blueprint', 'case_study')),
  blueprint_id UUID REFERENCES blueprints(id) ON DELETE CASCADE,
  case_study_id UUID REFERENCES case_studies(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Exactly one FK must be non-null, matching item_type
  CONSTRAINT inquiry_selections_item_type_check CHECK (
    (item_type = 'blueprint' AND blueprint_id IS NOT NULL AND case_study_id IS NULL) OR
    (item_type = 'case_study' AND case_study_id IS NOT NULL AND blueprint_id IS NULL)
  )
);

CREATE INDEX idx_inquiry_selections_inquiry_id ON inquiry_selections(inquiry_id);
CREATE INDEX idx_inquiry_selections_blueprint_id ON inquiry_selections(blueprint_id);
CREATE INDEX idx_inquiry_selections_case_study_id ON inquiry_selections(case_study_id);

ALTER TABLE inquiry_selections ENABLE ROW LEVEL SECURITY;

-- DFY: select own inquiry's selections
CREATE POLICY "inquiry_selections_dfy_select_own" ON inquiry_selections
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND get_user_role() = 'dfy'
    AND EXISTS (
      SELECT 1 FROM inquiries
      WHERE inquiries.id = inquiry_selections.inquiry_id
      AND inquiries.submitted_by = auth.uid()
    )
  );

-- DFY: insert for own inquiries
CREATE POLICY "inquiry_selections_dfy_insert" ON inquiry_selections
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND get_user_role() = 'dfy'
    AND EXISTS (
      SELECT 1 FROM inquiries
      WHERE inquiries.id = inquiry_selections.inquiry_id
      AND inquiries.submitted_by = auth.uid()
    )
  );

-- Admin/Internal: full access
CREATE POLICY "inquiry_selections_admin_all" ON inquiry_selections
  FOR ALL USING (
    auth.uid() IS NOT NULL
    AND get_user_role() IN ('admin', 'internal')
  );
