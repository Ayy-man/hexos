-- ============================================================================
-- PAYMENT SOURCES RLS FIX
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Check current policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'payment_sources';

-- Step 2: Check if data exists
SELECT COUNT(*) as total_records, COUNT(*) FILTER (WHERE is_active = true) as active_records
FROM payment_sources;

-- Step 3: List all payment sources
SELECT * FROM payment_sources;

-- ============================================================================
-- FIX: Drop all existing policies and recreate
-- ============================================================================

-- Drop all existing policies on payment_sources
DROP POLICY IF EXISTS "Payment sources readable by authenticated" ON payment_sources;
DROP POLICY IF EXISTS "Payment sources readable by all logged in" ON payment_sources;
DROP POLICY IF EXISTS "Admins manage payment sources" ON payment_sources;

-- Create simple SELECT policy - anyone logged in can read
CREATE POLICY "payment_sources_select_authenticated"
  ON payment_sources
  FOR SELECT
  TO authenticated
  USING (true);

-- Create ALL policy for admins
CREATE POLICY "payment_sources_all_admin"
  ON payment_sources
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- VERIFY: Check policies were created
-- ============================================================================

SELECT
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'payment_sources';
