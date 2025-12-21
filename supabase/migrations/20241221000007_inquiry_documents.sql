-- Add document_content column to inquiries for Plate.js editor state
-- Migration: 20241221000007_inquiry_documents.sql

-- ============================================================================
-- SCHEMA CHANGES
-- ============================================================================

-- Add document_content column for Plate.js editor state (Slate JSON format)
ALTER TABLE inquiries
ADD COLUMN document_content JSONB DEFAULT NULL;

-- Add index for queries that filter by document presence
CREATE INDEX idx_inquiries_has_document
ON inquiries((document_content IS NOT NULL));

-- ============================================================================
-- INQUIRY COMMENTS TABLE
-- ============================================================================

-- Comments/discussions on inquiries with support for inline annotations
CREATE TABLE public.inquiry_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,

  -- Comment content
  content TEXT NOT NULL,

  -- For inline comments, reference the text range in document (Plate.js comment mark ID)
  anchor_id TEXT,

  -- Thread structure (for replies)
  parent_id UUID REFERENCES inquiry_comments(id) ON DELETE CASCADE,

  -- Author
  author_id UUID NOT NULL REFERENCES profiles(id),

  -- Resolution status
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_inquiry_comments_inquiry ON inquiry_comments(inquiry_id);
CREATE INDEX idx_inquiry_comments_author ON inquiry_comments(author_id);
CREATE INDEX idx_inquiry_comments_anchor ON inquiry_comments(anchor_id) WHERE anchor_id IS NOT NULL;
CREATE INDEX idx_inquiry_comments_parent ON inquiry_comments(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_inquiry_comments_resolved ON inquiry_comments(resolved) WHERE resolved = FALSE;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE inquiry_comments ENABLE ROW LEVEL SECURITY;

-- Admin/Internal full access to all comments
CREATE POLICY "inquiry_comments_admin_all" ON inquiry_comments
  FOR ALL USING (
    auth.uid() IS NOT NULL
    AND get_user_role() IN ('admin', 'internal')
  );

-- DFY partners can view comments on their own inquiries (read-only)
CREATE POLICY "inquiry_comments_dfy_select_own" ON inquiry_comments
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND get_user_role() = 'dfy'
    AND EXISTS (
      SELECT 1 FROM inquiries
      WHERE id = inquiry_comments.inquiry_id
      AND submitted_by = auth.uid()
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at trigger for inquiry_comments
CREATE TRIGGER update_inquiry_comments_updated_at
  BEFORE UPDATE ON inquiry_comments
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();
