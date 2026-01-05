-- Migration: Add proposal reminder tracking columns
-- Purpose: Enable DFY partner follow-up system for stale proposals

-- Add reminder tracking columns to inquiries
ALTER TABLE inquiries
ADD COLUMN IF NOT EXISTS reminder_snoozed_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reminder_snooze_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reminder_escalated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS dfy_first_viewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS lost_reason TEXT,
ADD COLUMN IF NOT EXISTS admin_update_requested_at TIMESTAMPTZ;

-- Index for efficient stale proposal queries
-- Covers: proposal_stage = 'sent' with submission date and snooze tracking
CREATE INDEX IF NOT EXISTS idx_inquiries_stale_proposals
ON inquiries (proposal_stage, proposal_submitted_at, reminder_snoozed_until)
WHERE proposal_stage = 'sent';

-- Index for escalated proposals (admin view)
CREATE INDEX IF NOT EXISTS idx_inquiries_escalated
ON inquiries (reminder_escalated_at)
WHERE reminder_escalated_at IS NOT NULL;

-- Comment on columns for documentation
COMMENT ON COLUMN inquiries.reminder_snoozed_until IS 'When the reminder snooze expires (null = not snoozed)';
COMMENT ON COLUMN inquiries.reminder_snooze_count IS 'Number of times DFY has snoozed this reminder (max 3)';
COMMENT ON COLUMN inquiries.reminder_escalated_at IS 'When this proposal was escalated to admin attention';
COMMENT ON COLUMN inquiries.dfy_first_viewed_at IS 'First time DFY partner viewed the sent proposal';
COMMENT ON COLUMN inquiries.lost_reason IS 'Optional reason when proposal is marked as lost';
COMMENT ON COLUMN inquiries.admin_update_requested_at IS 'When admin manually requested a status update from DFY';
