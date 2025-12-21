-- Inquiries table for intake form submissions
CREATE TABLE public.inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Submitter
  submitted_by UUID REFERENCES profiles(id),
  partner_name TEXT NOT NULL,

  -- Type & Status
  submission_type TEXT NOT NULL CHECK (submission_type IN ('closed', 'proposal')),
  deal_type TEXT NOT NULL CHECK (deal_type IN ('blueprint', 'custom', 'variation')),
  form_path TEXT NOT NULL CHECK (form_path IN ('A1', 'A2', 'A3', 'B2', 'B3')),
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'processing', 'converted', 'rejected')),

  -- Common fields (extracted for querying)
  prospect_company_name TEXT,
  prospect_website TEXT,
  industry TEXT,
  blueprint_id UUID REFERENCES blueprints(id),

  -- All form fields as JSONB
  form_data JSONB NOT NULL DEFAULT '{}',

  -- Forwarding
  forward_emails TEXT[],

  -- Conversion tracking
  converted_to_project_id UUID REFERENCES projects(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for common queries
CREATE INDEX idx_inquiries_submitted_by ON inquiries(submitted_by);
CREATE INDEX idx_inquiries_status ON inquiries(status);
CREATE INDEX idx_inquiries_created_at ON inquiries(created_at DESC);

-- Enable RLS
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

-- DFY partners can view their own submissions
CREATE POLICY "inquiries_dfy_select_own" ON inquiries
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND get_user_role() = 'dfy'
    AND submitted_by = auth.uid()
  );

-- DFY partners can insert
CREATE POLICY "inquiries_dfy_insert" ON inquiries
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND get_user_role() = 'dfy'
  );

-- Admin/Internal full access
CREATE POLICY "inquiries_admin_all" ON inquiries
  FOR ALL USING (
    auth.uid() IS NOT NULL
    AND get_user_role() IN ('admin', 'internal')
  );

-- Updated_at trigger
CREATE TRIGGER update_inquiries_updated_at
  BEFORE UPDATE ON inquiries
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();
