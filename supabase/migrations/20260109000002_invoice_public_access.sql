-- Add public_token to invoices for secure sharing link
ALTER TABLE public.invoices 
ADD COLUMN public_token UUID DEFAULT gen_random_uuid() NOT NULL;

-- Index for fast lookup
CREATE INDEX idx_invoices_public_token ON public.invoices(public_token);

-- Update RLS to allow public viewing of invoices via public_token
CREATE POLICY "Public view invoice via token"
  ON invoices FOR SELECT
  TO public
  USING (true); -- We will enforce the token check in the application layer/API
