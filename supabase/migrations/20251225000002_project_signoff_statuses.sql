-- Add new project statuses for deliverables sign-off flow
-- Flow: deliverables_pending → awaiting_signoff → signed_off → collecting_access → ...

-- Add new enum values (PostgreSQL requires adding after existing values)
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'deliverables_pending' AFTER 'committed';
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'awaiting_signoff' AFTER 'deliverables_pending';
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'signed_off' AFTER 'awaiting_signoff';

-- Add sign-off tracking columns to projects
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS deliverables_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deliverables_confirmed_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS signoff_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signoff_sent_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS signed_off_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signed_off_by UUID REFERENCES profiles(id);

COMMENT ON COLUMN projects.deliverables_confirmed_at IS 'When admin confirmed final deliverables';
COMMENT ON COLUMN projects.signoff_sent_at IS 'When admin sent deliverables for DFY sign-off';
COMMENT ON COLUMN projects.signed_off_at IS 'When DFY signed off on behalf of client';
