-- Create retainers table for recurring invoices
CREATE TABLE IF NOT EXISTS retainers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  -- Retainer configuration
  amount INTEGER NOT NULL, -- Amount in cents
  currency TEXT DEFAULT 'usd',
  billing_day INTEGER NOT NULL DEFAULT 1 CHECK (billing_day >= 1 AND billing_day <= 28),
  billing_frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_frequency IN ('monthly', 'quarterly', 'yearly')),

  -- Description for invoices
  description TEXT NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),

  -- Invoice tracking
  next_invoice_date DATE NOT NULL,
  last_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  last_invoice_date DATE,

  -- Dates
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_retainers_status ON retainers(status);
CREATE INDEX IF NOT EXISTS idx_retainers_next_invoice ON retainers(next_invoice_date);
CREATE INDEX IF NOT EXISTS idx_retainers_client_email ON retainers(client_email);
CREATE INDEX IF NOT EXISTS idx_retainers_project_id ON retainers(project_id);

-- Enable RLS
ALTER TABLE retainers ENABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON retainers TO authenticated;

-- Create policies
CREATE POLICY "Admin full access to retainers"
  ON retainers FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'internal')
    )
  );

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_retainers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER retainers_updated_at
  BEFORE UPDATE ON retainers
  FOR EACH ROW
  EXECUTE FUNCTION update_retainers_updated_at();

-- Function to calculate next invoice date based on frequency
CREATE OR REPLACE FUNCTION calculate_next_retainer_date(
  current_date_param DATE,
  billing_day_param INTEGER,
  frequency_param TEXT
) RETURNS DATE AS $$
DECLARE
  next_date DATE;
  target_day INTEGER;
BEGIN
  target_day := billing_day_param;

  CASE frequency_param
    WHEN 'monthly' THEN
      -- Move to next month
      next_date := (current_date_param + INTERVAL '1 month')::DATE;
      -- Adjust day (handle months with fewer days)
      next_date := make_date(
        EXTRACT(YEAR FROM next_date)::INT,
        EXTRACT(MONTH FROM next_date)::INT,
        LEAST(target_day, EXTRACT(DAY FROM (date_trunc('month', next_date) + INTERVAL '1 month - 1 day'))::INT)
      );
    WHEN 'quarterly' THEN
      next_date := (current_date_param + INTERVAL '3 months')::DATE;
      next_date := make_date(
        EXTRACT(YEAR FROM next_date)::INT,
        EXTRACT(MONTH FROM next_date)::INT,
        LEAST(target_day, EXTRACT(DAY FROM (date_trunc('month', next_date) + INTERVAL '1 month - 1 day'))::INT)
      );
    WHEN 'yearly' THEN
      next_date := (current_date_param + INTERVAL '1 year')::DATE;
      next_date := make_date(
        EXTRACT(YEAR FROM next_date)::INT,
        EXTRACT(MONTH FROM next_date)::INT,
        LEAST(target_day, EXTRACT(DAY FROM (date_trunc('month', next_date) + INTERVAL '1 month - 1 day'))::INT)
      );
  END CASE;

  RETURN next_date;
END;
$$ LANGUAGE plpgsql;
