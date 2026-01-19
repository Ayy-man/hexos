-- Fix missing GRANT for payment_sources
GRANT SELECT ON payment_sources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON payment_sources TO authenticated;

-- Add recurring expense fields to expenses table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS recurring_frequency TEXT CHECK (recurring_frequency IN ('weekly', 'monthly', 'quarterly', 'yearly'));
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS recurring_day INTEGER CHECK (recurring_day >= 1 AND recurring_day <= 28);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS recurring_end_date DATE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS parent_expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL;

-- Index for finding recurring expenses
CREATE INDEX IF NOT EXISTS idx_expenses_recurring ON expenses(is_recurring) WHERE is_recurring = true;
CREATE INDEX IF NOT EXISTS idx_expenses_parent ON expenses(parent_expense_id);

-- Insert default payment sources if they don't exist
-- Valid types: credit_card, debit, bank_account
INSERT INTO payment_sources (name, label, type, is_active)
VALUES
  ('business_checking', 'Business Checking', 'bank_account', true),
  ('business_credit', 'Business Credit Card', 'credit_card', true),
  ('business_debit', 'Business Debit Card', 'debit', true)
ON CONFLICT DO NOTHING;
