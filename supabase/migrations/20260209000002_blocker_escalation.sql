-- Migration: Add DFY escalation to blockers
-- Reason: Admin needs to escalate blockers to DFY partners

ALTER TABLE blockers ADD COLUMN escalated_to_dfy boolean NOT NULL DEFAULT false;
ALTER TABLE blockers ADD COLUMN escalated_at timestamptz;
ALTER TABLE blockers ADD COLUMN escalated_by uuid REFERENCES profiles(id);
