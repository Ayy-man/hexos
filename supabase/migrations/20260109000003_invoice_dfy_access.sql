-- Allow DFY partners to view invoices for projects they are assigned to
CREATE POLICY "DFY view own project invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = invoices.project_id
      AND projects.dfy_partner_id = auth.uid()
    )
  );

-- No need to add NotificationType to DB if it's just a TS type, 
-- but we should check if there's a check constraint on the notifications table.
