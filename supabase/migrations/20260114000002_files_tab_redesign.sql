-- Migration: Files Tab Redesign
-- Adds visibility column to project_documents for Internal/Client filtering
-- Adds checkpoint_name to document_versions for named checkpoints

-- Add visibility column to project_documents
ALTER TABLE project_documents
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'internal';

-- Add check constraint for visibility values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'project_documents_visibility_check'
  ) THEN
    ALTER TABLE project_documents
    ADD CONSTRAINT project_documents_visibility_check
    CHECK (visibility IN ('internal', 'client'));
  END IF;
END $$;

-- Add checkpoint_name to document_versions for named checkpoints
ALTER TABLE document_versions
ADD COLUMN IF NOT EXISTS checkpoint_name TEXT;

-- Create index for project documents by project
CREATE INDEX IF NOT EXISTS idx_project_documents_project
ON project_documents(project_id);

-- Create index for filtering by project and visibility
CREATE INDEX IF NOT EXISTS idx_project_documents_visibility
ON project_documents(project_id, visibility);

-- Comment on new columns
COMMENT ON COLUMN project_documents.visibility IS 'Document visibility: internal (admin/dev team) or client (shared with client)';
COMMENT ON COLUMN document_versions.checkpoint_name IS 'Optional name for manual checkpoint versions';
