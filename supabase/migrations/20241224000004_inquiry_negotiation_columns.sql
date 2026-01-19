-- Phase 4.8: Deliverables Negotiation System
-- Migration 4: Add negotiation columns to inquiries table

-- Deliverables negotiation status enum
CREATE TYPE deliverables_negotiation_status AS ENUM (
  'none',           -- No deliverables table yet
  'parsing',        -- AI is extracting deliverables
  'dfy_editing',    -- DFY is editing
  'dfy_submitted',  -- DFY submitted for review
  'int_reviewing',  -- INT is reviewing
  'approved',       -- All approved, locked
  'needs_revision'  -- Sent back to DFY
);

-- Add deliverables negotiation tracking
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS
  deliverables_status deliverables_negotiation_status DEFAULT 'none';

-- Add closed deal tracking
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES profiles(id);
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS closed_notes TEXT;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS client_email TEXT;

-- Index for filtering by deliverables status
CREATE INDEX IF NOT EXISTS idx_inquiries_deliverables_status ON inquiries(deliverables_status);

-- Comments
COMMENT ON COLUMN inquiries.deliverables_status IS 'Negotiation workflow status for deliverables';
COMMENT ON COLUMN inquiries.closed_at IS 'When DFY marked the deal as closed';
COMMENT ON COLUMN inquiries.closed_notes IS 'Notes from DFY when closing the deal';
COMMENT ON COLUMN inquiries.client_email IS 'Client email for portal invitation';
