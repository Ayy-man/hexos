-- Phase 3A: Deliverables Hierarchy Support
-- Adds parent_id for sub-deliverables in both proposal and project deliverables

-- ============================================
-- 1. Add parent_id to proposal_deliverables
-- ============================================
ALTER TABLE proposal_deliverables
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES proposal_deliverables(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_proposal_deliverables_parent
ON proposal_deliverables(parent_id)
WHERE parent_id IS NOT NULL;

COMMENT ON COLUMN proposal_deliverables.parent_id IS 'Parent deliverable ID for sub-deliverable hierarchy';

-- ============================================
-- 2. Add parent_id to deliverables (project phase)
-- ============================================
ALTER TABLE deliverables
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES deliverables(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_deliverables_parent
ON deliverables(parent_id)
WHERE parent_id IS NOT NULL;

COMMENT ON COLUMN deliverables.parent_id IS 'Parent deliverable ID for sub-deliverable hierarchy';
