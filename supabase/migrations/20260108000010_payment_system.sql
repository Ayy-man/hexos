-- Payment System: Invoices, Payout Recipients, and Payouts
-- Stripe (inbound) + Mercury (outbound) integration

-- ============================================================================
-- INVOICES (Stripe - receiving payments from clients)
-- ============================================================================

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Links
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  milestone_id UUID REFERENCES payment_milestones(id) ON DELETE SET NULL,

  -- Invoice details
  invoice_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft',

  -- Amounts (stored in cents for precision)
  subtotal INTEGER NOT NULL,
  tax_rate NUMERIC(5,4) DEFAULT 0,
  tax_amount INTEGER DEFAULT 0,
  total INTEGER NOT NULL,

  -- Dates
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,

  -- Stripe
  stripe_invoice_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_hosted_url TEXT,
  stripe_pdf_url TEXT,

  -- Recipient
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_company TEXT,

  -- Line items
  line_items JSONB NOT NULL DEFAULT '[]',

  notes TEXT,

  CONSTRAINT valid_invoice_status CHECK (status IN ('draft', 'sent', 'paid', 'void', 'overdue'))
);

-- ============================================================================
-- PAYOUT RECIPIENTS (DFY partners, devs, contractors)
-- ============================================================================

CREATE TABLE payout_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Link to profile if internal user
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Recipient details
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  type TEXT NOT NULL,

  -- Bank details (store last 4 only, full details in Mercury)
  bank_account_last4 TEXT,
  bank_routing_last4 TEXT,
  bank_name TEXT,

  -- Mercury
  mercury_recipient_id TEXT,

  is_active BOOLEAN DEFAULT true,

  CONSTRAINT valid_recipient_type CHECK (type IN ('dfy_partner', 'developer', 'contractor'))
);

-- ============================================================================
-- PAYOUTS (Mercury - sending payments out)
-- ============================================================================

CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Links
  recipient_id UUID REFERENCES payout_recipients(id) ON DELETE RESTRICT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  -- Payout details
  type TEXT NOT NULL,
  amount INTEGER NOT NULL, -- in cents
  description TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending',

  -- Approval workflow
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Mercury
  mercury_payment_id TEXT,
  mercury_status TEXT,

  -- For commission calculations
  source_payment_id UUID REFERENCES payment_milestones(id),
  commission_rate NUMERIC(5,4),

  -- Contractor invoice (dev uploads this)
  contractor_invoice_url TEXT,
  contractor_invoice_at TIMESTAMPTZ,
  invoice_verified BOOLEAN DEFAULT false,
  invoice_verified_by UUID REFERENCES profiles(id),
  invoice_revision_note TEXT,

  notes TEXT,

  CONSTRAINT valid_payout_type CHECK (type IN ('commission', 'dev_payment', 'contractor', 'reimbursement')),
  CONSTRAINT valid_payout_status CHECK (status IN (
    'pending',           -- Created, awaiting invoice
    'invoice_required',  -- Needs contractor invoice
    'invoice_uploaded',  -- Invoice uploaded, awaiting verification
    'revision_needed',   -- Admin requested invoice revision
    'verified',          -- Invoice verified
    'approved',          -- Ready to send
    'processing',        -- Sent to Mercury, awaiting completion
    'completed',         -- Payment confirmed
    'failed'             -- Payment failed
  ))
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_invoices_project ON invoices(project_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_stripe_id ON invoices(stripe_invoice_id);

CREATE INDEX idx_payout_recipients_profile ON payout_recipients(profile_id);
CREATE INDEX idx_payout_recipients_type ON payout_recipients(type);

CREATE INDEX idx_payouts_recipient ON payouts(recipient_id);
CREATE INDEX idx_payouts_project ON payouts(project_id);
CREATE INDEX idx_payouts_status ON payouts(status);
CREATE INDEX idx_payouts_mercury_id ON payouts(mercury_payment_id);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

-- Invoices: Admin full access, clients can view their own
CREATE POLICY "Admin full access to invoices"
  ON invoices FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'internal')
    )
  );

CREATE POLICY "Clients view own invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (
    client_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Payout recipients: Admin full access, users can view their own
CREATE POLICY "Admin full access to payout_recipients"
  ON payout_recipients FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'internal')
    )
  );

CREATE POLICY "Users view own recipient record"
  ON payout_recipients FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

-- Payouts: Admin full access, recipients can view and upload invoice
CREATE POLICY "Admin full access to payouts"
  ON payouts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'internal')
    )
  );

CREATE POLICY "Recipients view own payouts"
  ON payouts FOR SELECT
  TO authenticated
  USING (
    recipient_id IN (
      SELECT id FROM payout_recipients WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Recipients can upload invoice"
  ON payouts FOR UPDATE
  TO authenticated
  USING (
    recipient_id IN (
      SELECT id FROM payout_recipients WHERE profile_id = auth.uid()
    )
  )
  WITH CHECK (
    recipient_id IN (
      SELECT id FROM payout_recipients WHERE profile_id = auth.uid()
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payout_recipients_updated_at
  BEFORE UPDATE ON payout_recipients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payouts_updated_at
  BEFORE UPDATE ON payouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Generate next invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  current_year TEXT;
  next_seq INTEGER;
BEGIN
  current_year := TO_CHAR(NOW(), 'YYYY');

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM 'INV-' || current_year || '-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO next_seq
  FROM invoices
  WHERE invoice_number LIKE 'INV-' || current_year || '-%';

  RETURN 'INV-' || current_year || '-' || LPAD(next_seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Calculate payout amounts for a project
CREATE OR REPLACE FUNCTION calculate_project_payouts(p_project_id UUID)
RETURNS TABLE (
  payout_type TEXT,
  recipient_type TEXT,
  amount INTEGER,
  description TEXT
) AS $$
DECLARE
  v_project RECORD;
  v_expenses INTEGER;
BEGIN
  -- Get project details
  SELECT * INTO v_project FROM projects WHERE id = p_project_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Get total expenses
  SELECT COALESCE(SUM(amount), 0)::INTEGER INTO v_expenses
  FROM expenses WHERE project_id = p_project_id;

  -- DFY Commission
  IF v_project.dfy_commission_pct > 0 AND v_project.price_dfy > 0 THEN
    RETURN QUERY SELECT
      'commission'::TEXT,
      'dfy_partner'::TEXT,
      (v_project.price_dfy * v_project.dfy_commission_pct / 100)::INTEGER * 100, -- convert to cents
      'Commission for ' || v_project.name;
  END IF;

  -- Dev Payment
  IF v_project.price_dev > 0 THEN
    RETURN QUERY SELECT
      'dev_payment'::TEXT,
      'developer'::TEXT,
      v_project.price_dev::INTEGER * 100, -- convert to cents
      'Development payment for ' || v_project.name;
  END IF;

  RETURN;
END;
$$ LANGUAGE plpgsql;
