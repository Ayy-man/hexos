-- Add 'closed' and 'lost' to proposal_stage enum
-- 'closed' = deal won, converted to project
-- 'lost' = deal lost, no conversion

ALTER TYPE proposal_stage ADD VALUE IF NOT EXISTS 'closed' AFTER 'sent';
ALTER TYPE proposal_stage ADD VALUE IF NOT EXISTS 'lost' AFTER 'closed';
