-- Phase 4.8: Deliverables Negotiation System
-- Migration 5: Add source_inquiry_id to projects table

-- Link project back to the inquiry it was converted from
ALTER TABLE projects ADD COLUMN IF NOT EXISTS
  source_inquiry_id UUID REFERENCES inquiries(id);

-- Index for finding projects by source inquiry
CREATE INDEX IF NOT EXISTS idx_projects_source_inquiry ON projects(source_inquiry_id);

-- Comment
COMMENT ON COLUMN projects.source_inquiry_id IS 'The inquiry this project was converted from (audit trail)';
