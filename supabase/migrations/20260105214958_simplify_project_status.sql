-- Migration: Simplify project_status enum
-- Remove inquiry and proposal phases (handled at inquiry level, not project level)
-- Projects now start at deliverables_pending after conversion from inquiry

-- Step 1: Update any existing projects with old statuses to deliverables_pending
UPDATE projects
SET status = 'deliverables_pending'
WHERE status IN (
  'inquiry_new', 'ai_matching', 'qualified',
  'proposal_drafting', 'internal_review', 'proposal_sent',
  'negotiating', 'committed'
);

-- Step 2: Drop the default before changing the type
ALTER TABLE projects ALTER COLUMN status DROP DEFAULT;

-- Step 3: Create new enum with only post-conversion statuses (22 total)
CREATE TYPE project_status_new AS ENUM (
  -- Sign-off
  'deliverables_pending', 'awaiting_signoff', 'signed_off',
  -- Agreement
  'agreement_sent', 'agreement_signed',
  -- Payment
  'payment_pending', 'payment_partial', 'payment_paid',
  -- Onboarding
  'collecting_access', 'access_complete', 'dev_assigned',
  -- Development
  'in_progress', 'blocked_client', 'blocked_internal', 'review_checkpoint', 'revisions', 'final_qa',
  -- Delivery
  'delivered', 'acceptance_pending', 'accepted',
  -- Closed
  'completed', 'cancelled', 'on_hold'
);

-- Step 4: Alter the column to use the new enum
ALTER TABLE projects
  ALTER COLUMN status TYPE project_status_new USING status::text::project_status_new;

-- Step 5: Drop old enum and rename new one
DROP TYPE project_status;
ALTER TYPE project_status_new RENAME TO project_status;

-- Step 6: Re-add default as deliverables_pending
ALTER TABLE projects ALTER COLUMN status SET DEFAULT 'deliverables_pending';

-- Add comment documenting the change
COMMENT ON TYPE project_status IS 'Project status enum - 22 statuses starting from sign-off phase. Inquiry/proposal phases are handled at the inquiry level (proposal_stage).';
