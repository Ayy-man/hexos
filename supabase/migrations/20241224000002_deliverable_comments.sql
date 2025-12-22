-- Phase 4.8: Deliverables Negotiation System
-- Migration 2: Create proposal_deliverable_comments table

CREATE TABLE public.proposal_deliverable_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID NOT NULL REFERENCES proposal_deliverables(id) ON DELETE CASCADE,

  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES profiles(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_deliverable_comments_deliverable ON proposal_deliverable_comments(deliverable_id);
CREATE INDEX idx_deliverable_comments_author ON proposal_deliverable_comments(author_id);

-- Comments
COMMENT ON TABLE proposal_deliverable_comments IS 'Per-deliverable discussion threads during negotiation';
