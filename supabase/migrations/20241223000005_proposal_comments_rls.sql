-- Migration: RLS policies for proposal comments
-- Must run AFTER 20241223000004 (enum value must be committed first)

-- Index for faster proposal comment queries
CREATE INDEX IF NOT EXISTS idx_inquiry_comments_proposal
  ON inquiry_comments(inquiry_id)
  WHERE comment_type = 'proposal';

-- Note: The existing admin policy already covers proposal comments because it uses:
-- "get_user_role() IN ('admin', 'internal')" without filtering by comment_type
-- So admin/internal can already CRUD all comment types including 'proposal'

-- DFY: can SELECT proposal comments on their own inquiries AFTER submission
CREATE POLICY "inquiry_comments_dfy_proposal_select" ON inquiry_comments
  FOR SELECT USING (
    comment_type = 'proposal'
    AND EXISTS (
      SELECT 1 FROM inquiries
      WHERE inquiries.id = inquiry_comments.inquiry_id
      AND inquiries.submitted_by = auth.uid()
      AND inquiries.proposal_submitted_at IS NOT NULL
    )
  );

-- DFY: can INSERT proposal comments on their own inquiries AFTER submission
CREATE POLICY "inquiry_comments_dfy_proposal_insert" ON inquiry_comments
  FOR INSERT WITH CHECK (
    comment_type = 'proposal'
    AND author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM inquiries
      WHERE inquiries.id = inquiry_comments.inquiry_id
      AND inquiries.submitted_by = auth.uid()
      AND inquiries.proposal_submitted_at IS NOT NULL
    )
  );

-- DFY: can UPDATE their own proposal comments
CREATE POLICY "inquiry_comments_dfy_proposal_update" ON inquiry_comments
  FOR UPDATE USING (
    comment_type = 'proposal'
    AND author_id = auth.uid()
  );

-- DFY: can DELETE their own proposal comments
CREATE POLICY "inquiry_comments_dfy_proposal_delete" ON inquiry_comments
  FOR DELETE USING (
    comment_type = 'proposal'
    AND author_id = auth.uid()
  );
