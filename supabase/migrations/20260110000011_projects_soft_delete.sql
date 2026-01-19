-- Add soft delete columns to projects table
-- Enables archive and soft delete instead of hard delete

-- Add columns for archive and soft delete
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS archived_by UUID DEFAULT NULL REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by UUID DEFAULT NULL REFERENCES profiles(id);

-- Create indexes for performance on soft delete queries
CREATE INDEX IF NOT EXISTS idx_projects_archived_at ON projects(archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON projects(deleted_at) WHERE deleted_at IS NOT NULL;

-- Add comments
COMMENT ON COLUMN projects.archived_at IS 'When the project was archived. Archived projects are hidden from default views but not deleted.';
COMMENT ON COLUMN projects.archived_by IS 'User who archived the project.';
COMMENT ON COLUMN projects.deleted_at IS 'When the project was soft-deleted. Soft-deleted projects can be restored.';
COMMENT ON COLUMN projects.deleted_by IS 'User who soft-deleted the project.';
