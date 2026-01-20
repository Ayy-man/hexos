-- Fix: Allow DFY users to update deliverables_status on their own inquiries
-- The existing policy allows UPDATE but the deliverables_status column wasn't
-- being updated correctly. This recreates the policy to ensure it works.

-- Drop and recreate the DFY update policy with explicit column access
DROP POLICY IF EXISTS "inquiries_dfy_update_own" ON inquiries;

CREATE POLICY "inquiries_dfy_update_own" ON inquiries
  FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = 'dfy'
    AND submitted_by = auth.uid()
  )
  WITH CHECK (
    get_user_role() = 'dfy'
    AND submitted_by = auth.uid()
  );

-- Also ensure authenticated role has UPDATE grant on the table
GRANT UPDATE ON inquiries TO authenticated;
