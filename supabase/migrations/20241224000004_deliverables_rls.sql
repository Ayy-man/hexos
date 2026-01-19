-- Phase 4.8: RLS policies for deliverables tables

-- Enable RLS
ALTER TABLE proposal_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_deliverable_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_requirements ENABLE ROW LEVEL SECURITY;

-- proposal_deliverables policies
CREATE POLICY "proposal_deliverables_select_policy" ON proposal_deliverables
  FOR SELECT USING (true);  -- All authenticated users can read

CREATE POLICY "proposal_deliverables_insert_policy" ON proposal_deliverables
  FOR INSERT WITH CHECK (true);  -- Allow inserts (server actions use service role)

CREATE POLICY "proposal_deliverables_update_policy" ON proposal_deliverables
  FOR UPDATE USING (true);

CREATE POLICY "proposal_deliverables_delete_policy" ON proposal_deliverables
  FOR DELETE USING (true);

-- proposal_deliverable_comments policies
CREATE POLICY "deliverable_comments_select_policy" ON proposal_deliverable_comments
  FOR SELECT USING (true);

CREATE POLICY "deliverable_comments_insert_policy" ON proposal_deliverable_comments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "deliverable_comments_delete_policy" ON proposal_deliverable_comments
  FOR DELETE USING (author_id = auth.uid());  -- Only author can delete

-- project_requirements policies
CREATE POLICY "project_requirements_select_policy" ON project_requirements
  FOR SELECT USING (true);

CREATE POLICY "project_requirements_insert_policy" ON project_requirements
  FOR INSERT WITH CHECK (true);

CREATE POLICY "project_requirements_update_policy" ON project_requirements
  FOR UPDATE USING (true);

CREATE POLICY "project_requirements_delete_policy" ON project_requirements
  FOR DELETE USING (true);
