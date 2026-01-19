-- Add 'sent' to proposal_stage enum
-- This stage auto-triggers when admin submits proposal to DFY partner

ALTER TYPE proposal_stage ADD VALUE IF NOT EXISTS 'sent' AFTER 'ready';
