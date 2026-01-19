-- Phase 4.8: Deliverables Negotiation System
-- Migration 6: RLS policies for new tables

-- Enable RLS on new tables
ALTER TABLE proposal_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_deliverable_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_requirements ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Helper function: can user access inquiry deliverables?
-- ============================================
CREATE OR REPLACE FUNCTION public.can_access_inquiry_deliverables(p_inquiry_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role user_role;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  v_user_role := public.get_user_role();

  RETURN CASE v_user_role
    WHEN 'admin' THEN TRUE
    WHEN 'internal' THEN TRUE
    WHEN 'dfy' THEN EXISTS (
      SELECT 1 FROM inquiries WHERE id = p_inquiry_id AND submitted_by = v_user_id
    )
    ELSE FALSE
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- proposal_deliverables policies
-- ============================================

-- Everyone who can access the inquiry can view deliverables
CREATE POLICY "proposal_deliverables_select" ON proposal_deliverables
  FOR SELECT USING (can_access_inquiry_deliverables(inquiry_id));

-- Admin/internal have full access
CREATE POLICY "proposal_deliverables_admin_all" ON proposal_deliverables
  FOR ALL USING (get_user_role() IN ('admin', 'internal'));

-- DFY can insert when in edit mode
CREATE POLICY "proposal_deliverables_dfy_insert" ON proposal_deliverables
  FOR INSERT WITH CHECK (
    get_user_role() = 'dfy' AND
    can_access_inquiry_deliverables(inquiry_id) AND
    EXISTS (
      SELECT 1 FROM inquiries
      WHERE id = inquiry_id
      AND deliverables_status IN ('dfy_editing', 'needs_revision')
    )
  );

-- DFY can update when in edit mode
CREATE POLICY "proposal_deliverables_dfy_update" ON proposal_deliverables
  FOR UPDATE USING (
    get_user_role() = 'dfy' AND
    can_access_inquiry_deliverables(inquiry_id) AND
    EXISTS (
      SELECT 1 FROM inquiries
      WHERE id = inquiry_id
      AND deliverables_status IN ('dfy_editing', 'needs_revision')
    )
  );

-- DFY can delete (soft delete via status) when in edit mode
CREATE POLICY "proposal_deliverables_dfy_delete" ON proposal_deliverables
  FOR DELETE USING (
    get_user_role() = 'dfy' AND
    can_access_inquiry_deliverables(inquiry_id) AND
    EXISTS (
      SELECT 1 FROM inquiries
      WHERE id = inquiry_id
      AND deliverables_status IN ('dfy_editing', 'needs_revision')
    )
  );

-- ============================================
-- proposal_deliverable_comments policies
-- ============================================

-- View comments if can access the parent deliverable
CREATE POLICY "deliverable_comments_select" ON proposal_deliverable_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM proposal_deliverables pd
      WHERE pd.id = deliverable_id AND can_access_inquiry_deliverables(pd.inquiry_id)
    )
  );

-- Insert comments if can access the parent deliverable
CREATE POLICY "deliverable_comments_insert" ON proposal_deliverable_comments
  FOR INSERT WITH CHECK (
    author_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM proposal_deliverables pd
      WHERE pd.id = deliverable_id AND can_access_inquiry_deliverables(pd.inquiry_id)
    )
  );

-- Admin/internal can delete any comment
CREATE POLICY "deliverable_comments_admin_delete" ON proposal_deliverable_comments
  FOR DELETE USING (get_user_role() IN ('admin', 'internal'));

-- ============================================
-- project_requirements policies
-- ============================================

-- View requirements if can access the project
CREATE POLICY "project_requirements_select" ON project_requirements
  FOR SELECT USING (can_access_project(project_id));

-- Admin/internal have full access
CREATE POLICY "project_requirements_admin_all" ON project_requirements
  FOR ALL USING (get_user_role() IN ('admin', 'internal'));

-- DFY can update status (mark as completed, add response)
CREATE POLICY "project_requirements_dfy_update" ON project_requirements
  FOR UPDATE USING (
    get_user_role() = 'dfy' AND
    can_access_project(project_id)
  );
