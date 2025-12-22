-- Phase 4.8: Deliverables Negotiation System
-- Migration 1: Create proposal_deliverables table

-- Enum for tracking change status during negotiation
CREATE TYPE deliverable_change_status AS ENUM (
  'original',      -- Parsed from proposal, unchanged
  'edited',        -- Modified by DFY
  'added',         -- New deliverable added by DFY
  'removed',       -- Marked for removal by DFY
  'approved',      -- INT approved the change
  'rejected',      -- INT rejected the change
  'countered'      -- INT provided counter-offer
);

-- Enum for tracking deliverable source
CREATE TYPE deliverable_source AS ENUM (
  'ai_parsed',      -- Extracted by AI from proposal
  'blueprint_tier', -- Added from blueprint tier
  'custom'          -- Manually added
);

-- Main deliverables table for negotiation
CREATE TABLE public.proposal_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,

  -- Content
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),

  -- Source tracking
  source deliverable_source DEFAULT 'custom',
  source_blueprint_id UUID REFERENCES blueprints(id),
  source_tier_name TEXT,

  -- AI parsing metadata
  ai_confidence DECIMAL(3,2),  -- 0.00-1.00 confidence score
  ai_source_text TEXT,          -- Original text from proposal

  -- Negotiation state
  change_status deliverable_change_status DEFAULT 'original',

  -- Original values (for diff display when edited)
  original_name TEXT,
  original_description TEXT,
  original_price DECIMAL(10,2),

  -- Counter-offer (when INT counters)
  counter_price DECIMAL(10,2),
  counter_note TEXT,

  -- Audit
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  sort_order INT DEFAULT 0
);

-- Indexes
CREATE INDEX idx_proposal_deliverables_inquiry ON proposal_deliverables(inquiry_id);
CREATE INDEX idx_proposal_deliverables_status ON proposal_deliverables(change_status);
CREATE INDEX idx_proposal_deliverables_source ON proposal_deliverables(source);

-- Comments
COMMENT ON TABLE proposal_deliverables IS 'Negotiated deliverables for inquiry proposals';
COMMENT ON COLUMN proposal_deliverables.ai_confidence IS 'AI parsing confidence score 0.00-1.00';
COMMENT ON COLUMN proposal_deliverables.change_status IS 'Current state in negotiation workflow';
COMMENT ON COLUMN proposal_deliverables.original_name IS 'Original name before DFY edit (for diff display)';
