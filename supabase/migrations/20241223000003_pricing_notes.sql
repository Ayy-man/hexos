-- Add pricing_notes column for DFY partners to add context to proposals
-- Migration: 20241223000003_pricing_notes.sql

ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS pricing_notes TEXT;

-- Comment to explain usage
COMMENT ON COLUMN inquiries.pricing_notes IS 'Optional notes from DFY partner explaining pricing breakdown';
