-- Add comment_type column to distinguish internal vs dfy comments
-- Migration: 20241221000009_comment_types.sql

-- ============================================================================
-- SCHEMA CHANGES
-- ============================================================================

-- Add comment_type enum
CREATE TYPE comment_type AS ENUM ('internal', 'dfy');

-- Add comment_type column with default 'internal' for existing comments
ALTER TABLE inquiry_comments
ADD COLUMN comment_type comment_type NOT NULL DEFAULT 'internal';

-- Add index for filtering by comment type
CREATE INDEX idx_inquiry_comments_type ON inquiry_comments(comment_type);

-- ============================================================================
-- UPDATE RLS POLICIES
-- ============================================================================

-- Drop existing DFY policy (too restrictive - was read-only)
DROP POLICY IF EXISTS "inquiry_comments_dfy_select_own" ON inquiry_comments;

-- DFY partners can view DFY comments on their own inquiries
CREATE POLICY "inquiry_comments_dfy_select" ON inquiry_comments
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND get_user_role() = 'dfy'
    AND comment_type = 'dfy'
    AND EXISTS (
      SELECT 1 FROM inquiries
      WHERE id = inquiry_comments.inquiry_id
      AND submitted_by = auth.uid()
    )
  );

-- DFY partners can create DFY comments on their own inquiries
CREATE POLICY "inquiry_comments_dfy_insert" ON inquiry_comments
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND get_user_role() = 'dfy'
    AND comment_type = 'dfy'
    AND author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM inquiries
      WHERE id = inquiry_comments.inquiry_id
      AND submitted_by = auth.uid()
    )
  );

-- DFY partners can delete their own DFY comments
CREATE POLICY "inquiry_comments_dfy_delete" ON inquiry_comments
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND get_user_role() = 'dfy'
    AND comment_type = 'dfy'
    AND author_id = auth.uid()
  );
