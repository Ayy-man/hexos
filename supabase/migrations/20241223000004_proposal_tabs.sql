-- Migration: Add proposal tabs support
-- Adds columns for admin proposal, DFY's private version, and proposal comments

-- Proposal content (admin writes this)
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS proposal_content JSONB;

-- Track when proposal was submitted to DFY partner
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS proposal_submitted_at TIMESTAMPTZ;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS proposal_submitted_by UUID REFERENCES profiles(id);

-- DFY's private version (only they can see/edit)
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS dfy_version_content JSONB;

-- Inline discussions for proposal (like document has inline_discussions)
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS proposal_discussions JSONB DEFAULT '[]'::jsonb;

-- Add 'proposal' to comment_type enum for sidebar comments
-- Note: This must be committed before creating indexes that reference it
ALTER TYPE comment_type ADD VALUE IF NOT EXISTS 'proposal';

-- Add comments for documentation
COMMENT ON COLUMN inquiries.proposal_content IS 'Admin-written proposal content (Plate.js JSON)';
COMMENT ON COLUMN inquiries.proposal_submitted_at IS 'When proposal was submitted to DFY partner';
COMMENT ON COLUMN inquiries.proposal_submitted_by IS 'Who submitted the proposal to DFY';
COMMENT ON COLUMN inquiries.dfy_version_content IS 'DFY private version content (only visible to submitting DFY)';
COMMENT ON COLUMN inquiries.proposal_discussions IS 'Inline discussions on proposal content';
