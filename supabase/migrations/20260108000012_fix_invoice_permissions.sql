-- Fix invoice permissions: grant table access and fix RLS policy
-- Problem 1: Missing GRANT statements for invoices table
-- Problem 2: RLS policy references auth.users which authenticated users can't access

-- ============================================================================
-- GRANT TABLE PERMISSIONS
-- ============================================================================

-- Invoices: full CRUD for authenticated users (RLS handles row-level access)
GRANT SELECT, INSERT, UPDATE, DELETE ON invoices TO authenticated;

-- Payout recipients: full CRUD for authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON payout_recipients TO authenticated;

-- Payouts: full CRUD for authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON payouts TO authenticated;

-- ============================================================================
-- FIX RLS POLICY
-- ============================================================================

-- Drop the problematic policy that references auth.users
DROP POLICY IF EXISTS "Clients view own invoices" ON invoices;

-- Recreate using auth.jwt() which is accessible to all authenticated users
CREATE POLICY "Clients view own invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (
    client_email = (auth.jwt() ->> 'email')
  );

-- ============================================================================
-- VERIFY generate_invoice_number FUNCTION
-- ============================================================================

-- The function needs SECURITY DEFINER to bypass RLS when reading invoices table
-- This was added in migration 20260108000011 but let's ensure it's correct
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

-- Grant execute to authenticated and anon
GRANT EXECUTE ON FUNCTION generate_invoice_number() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_invoice_number() TO anon;
