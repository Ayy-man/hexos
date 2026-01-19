-- Allow DFY partners to update their own inquiries (specifically dfy_version_content)
CREATE POLICY "inquiries_dfy_update_own" ON inquiries
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND get_user_role() = 'dfy'
    AND submitted_by = auth.uid()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND get_user_role() = 'dfy'
    AND submitted_by = auth.uid()
  );
