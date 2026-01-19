-- Payouts System: Dev Invoice Submission Workflow
-- Extends existing payouts table for dev self-service invoice submission

-- ============================================================================
-- ADD NEW COLUMNS TO PAYOUTS TABLE
-- ============================================================================

-- Dev's invoice details
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS invoice_date DATE;

-- Track who submitted (for dev self-service)
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES profiles(id);
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;

-- Rejection tracking
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES profiles(id);

-- Link to auto-created expense when paid
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS expense_id UUID REFERENCES expenses(id);

-- Payment details (for manual payments outside Mercury)
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS payment_reference TEXT;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS paid_by UUID REFERENCES profiles(id);

-- ============================================================================
-- UPDATE STATUS CONSTRAINT
-- ============================================================================

-- Drop existing constraint
ALTER TABLE payouts DROP CONSTRAINT IF EXISTS valid_payout_status;

-- Add new constraint with simplified + legacy statuses
ALTER TABLE payouts ADD CONSTRAINT valid_payout_status CHECK (status IN (
  -- Simplified dev workflow statuses
  'pending',           -- Submitted by dev, awaiting review
  'approved',          -- Approved, awaiting payment
  'paid',              -- Payment completed (manual)
  'rejected',          -- Rejected with reason
  -- Legacy Mercury workflow statuses (backwards compat)
  'invoice_required',
  'invoice_uploaded',
  'revision_needed',
  'verified',
  'processing',
  'completed',         -- Payment completed (Mercury)
  'failed'
));

-- ============================================================================
-- ADD NOTIFICATION TYPES
-- ============================================================================

-- Add new notification types for payout workflow
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'payout_submitted' AND enumtypid = 'notification_type'::regtype) THEN
    ALTER TYPE notification_type ADD VALUE 'payout_submitted';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'payout_approved' AND enumtypid = 'notification_type'::regtype) THEN
    ALTER TYPE notification_type ADD VALUE 'payout_approved';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'payout_paid' AND enumtypid = 'notification_type'::regtype) THEN
    ALTER TYPE notification_type ADD VALUE 'payout_paid';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'payout_rejected' AND enumtypid = 'notification_type'::regtype) THEN
    ALTER TYPE notification_type ADD VALUE 'payout_rejected';
  END IF;
END$$;

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_payouts_submitted_by ON payouts(submitted_by);
CREATE INDEX IF NOT EXISTS idx_payouts_status_pending ON payouts(status) WHERE status IN ('pending', 'approved');

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS if not already enabled
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

-- Admin full access
DROP POLICY IF EXISTS "admin_full_access_payouts" ON payouts;
CREATE POLICY "admin_full_access_payouts" ON payouts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'internal')
    )
  );

-- Devs can view their own payouts
DROP POLICY IF EXISTS "devs_view_own_payouts" ON payouts;
CREATE POLICY "devs_view_own_payouts" ON payouts
  FOR SELECT TO authenticated
  USING (
    submitted_by = auth.uid()
    OR recipient_id IN (
      SELECT id FROM payout_recipients WHERE profile_id = auth.uid()
    )
  );

-- Devs can insert their own payouts
DROP POLICY IF EXISTS "devs_submit_payouts" ON payouts;
CREATE POLICY "devs_submit_payouts" ON payouts
  FOR INSERT TO authenticated
  WITH CHECK (submitted_by = auth.uid());

-- ============================================================================
-- STORAGE BUCKET FOR PAYOUT INVOICES
-- ============================================================================

-- Create bucket (will fail silently if exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('payout-invoices', 'payout-invoices', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for payout invoices
DROP POLICY IF EXISTS "Devs upload own invoices" ON storage.objects;
CREATE POLICY "Devs upload own invoices" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'payout-invoices'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users view own payout invoices" ON storage.objects;
CREATE POLICY "Users view own payout invoices" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'payout-invoices'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'internal')
      )
    )
  );

DROP POLICY IF EXISTS "Admins manage payout invoices" ON storage.objects;
CREATE POLICY "Admins manage payout invoices" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'payout-invoices'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'internal')
    )
  );

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON payouts TO authenticated;
GRANT SELECT ON payout_recipients TO authenticated;
