-- Payouts: Dev Payment Preferences
-- Adds wire transfer vs emailed invoice choice for devs

-- ============================================================================
-- PAYMENT PREFERENCE COLUMNS
-- ============================================================================

-- How the dev wants to receive payment
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS payment_preference TEXT DEFAULT 'wire_transfer';

-- Wire transfer details (only used when payment_preference = 'wire_transfer')
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS wire_recipient_name TEXT;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS wire_swift_code TEXT;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS wire_account_number TEXT; -- IBAN or account number
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS wire_bank_name TEXT;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS wire_bank_address TEXT;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS wire_recipient_address TEXT;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS wire_recipient_country TEXT;

-- Add constraint for valid payment preferences
ALTER TABLE payouts ADD CONSTRAINT valid_payment_preference CHECK (
  payment_preference IS NULL OR payment_preference IN ('wire_transfer', 'emailed_invoice')
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_payouts_payment_preference ON payouts(payment_preference);
