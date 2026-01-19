-- RLS policies for requirement_dependencies table

-- Enable RLS
ALTER TABLE requirement_dependencies ENABLE ROW LEVEL SECURITY;

-- Simple policies (following existing pattern - server actions use service role)
CREATE POLICY "requirement_dependencies_select_policy" ON requirement_dependencies
  FOR SELECT USING (true);

CREATE POLICY "requirement_dependencies_insert_policy" ON requirement_dependencies
  FOR INSERT WITH CHECK (true);

CREATE POLICY "requirement_dependencies_update_policy" ON requirement_dependencies
  FOR UPDATE USING (true);

CREATE POLICY "requirement_dependencies_delete_policy" ON requirement_dependencies
  FOR DELETE USING (true);
