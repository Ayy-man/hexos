-- Add generate_invoice_number function with proper permissions

DROP FUNCTION IF EXISTS generate_invoice_number();

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION generate_invoice_number() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_invoice_number() TO anon;
