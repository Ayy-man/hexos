-- Add archive and soft delete columns to inquiries
ALTER TABLE inquiries
ADD COLUMN archived_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN archived_by UUID REFERENCES profiles(id),
ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN deleted_by UUID REFERENCES profiles(id);

-- Index for filtering archived/deleted
CREATE INDEX idx_inquiries_archived ON inquiries(archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX idx_inquiries_deleted ON inquiries(deleted_at) WHERE deleted_at IS NOT NULL;

-- Add DFY policy to insert comments on their own inquiries
CREATE POLICY "inquiry_comments_dfy_insert_own" ON inquiry_comments
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND get_user_role() = 'dfy'
    AND EXISTS (
      SELECT 1 FROM inquiries
      WHERE id = inquiry_comments.inquiry_id
      AND submitted_by = auth.uid()
    )
  );
