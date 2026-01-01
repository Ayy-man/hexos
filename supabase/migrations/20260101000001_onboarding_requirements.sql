-- Onboarding Requirements System Migration
-- Replaces flat project_requirements with tree-structured onboarding_requirements

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE requirement_owner AS ENUM ('hexona', 'dfy', 'client');
CREATE TYPE requirement_blocker AS ENUM ('none', 'partial', 'absolute');
CREATE TYPE onboarding_requirement_status AS ENUM ('pending', 'in_progress', 'submitted', 'approved', 'blocked');

-- ============================================================================
-- TABLES
-- ============================================================================

-- Onboarding Requirements (tree structure via parent_id)
CREATE TABLE public.onboarding_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES onboarding_requirements(id) ON DELETE CASCADE,

  -- Content
  title TEXT NOT NULL,
  description TEXT,
  notes TEXT,

  -- Assignment & Status
  owner_type requirement_owner DEFAULT 'hexona',
  blocker_type requirement_blocker DEFAULT 'none',
  status onboarding_requirement_status DEFAULT 'pending',

  -- Resources
  loom_url TEXT,
  resource_url TEXT,

  -- Ordering
  position INT DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES profiles(id)
);

-- Requirement Attachments
CREATE TABLE public.requirement_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID REFERENCES onboarding_requirements(id) ON DELETE CASCADE NOT NULL,

  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INT,
  file_type TEXT,

  uploaded_by UUID REFERENCES profiles(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Requirement Templates (reusable presets)
CREATE TABLE public.requirement_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  loom_url TEXT,
  default_owner requirement_owner DEFAULT 'hexona',
  category TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_onboarding_requirements_project ON onboarding_requirements(project_id);
CREATE INDEX idx_onboarding_requirements_parent ON onboarding_requirements(parent_id);
CREATE INDEX idx_onboarding_requirements_status ON onboarding_requirements(status);
CREATE INDEX idx_onboarding_requirements_owner ON onboarding_requirements(owner_type);
CREATE INDEX idx_requirement_attachments_requirement ON requirement_attachments(requirement_id);
CREATE INDEX idx_requirement_templates_category ON requirement_templates(category);
CREATE INDEX idx_requirement_templates_active ON requirement_templates(is_active);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at
CREATE TRIGGER update_onboarding_requirements_updated_at
  BEFORE UPDATE ON onboarding_requirements
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE onboarding_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE requirement_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE requirement_templates ENABLE ROW LEVEL SECURITY;

-- ONBOARDING_REQUIREMENTS POLICIES

-- Admin/Internal have full access
CREATE POLICY "onboarding_requirements_admin_all" ON onboarding_requirements
  FOR ALL USING (auth.uid() IS NOT NULL AND get_user_role() IN ('admin', 'internal'));

-- Anyone who can access project can view requirements
CREATE POLICY "onboarding_requirements_select_via_project" ON onboarding_requirements
  FOR SELECT USING (auth.uid() IS NOT NULL AND can_access_project(project_id));

-- DFY can update their owned requirements (where owner_type = 'dfy')
CREATE POLICY "onboarding_requirements_dfy_update" ON onboarding_requirements
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND get_user_role() = 'dfy'
    AND can_access_project(project_id)
    AND owner_type = 'dfy'
  );

-- Client can update their owned requirements (where owner_type = 'client')
CREATE POLICY "onboarding_requirements_client_update" ON onboarding_requirements
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND get_user_role() = 'client'
    AND can_access_project(project_id)
    AND owner_type = 'client'
  );

-- REQUIREMENT_ATTACHMENTS POLICIES

-- Admin/Internal have full access
CREATE POLICY "requirement_attachments_admin_all" ON requirement_attachments
  FOR ALL USING (auth.uid() IS NOT NULL AND get_user_role() IN ('admin', 'internal'));

-- Anyone who can access the parent requirement can view attachments
CREATE POLICY "requirement_attachments_select_via_requirement" ON requirement_attachments
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM onboarding_requirements r
      WHERE r.id = requirement_attachments.requirement_id
      AND can_access_project(r.project_id)
    )
  );

-- DFY can insert attachments to their owned requirements
CREATE POLICY "requirement_attachments_dfy_insert" ON requirement_attachments
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND get_user_role() = 'dfy'
    AND EXISTS (
      SELECT 1 FROM onboarding_requirements r
      WHERE r.id = requirement_attachments.requirement_id
      AND can_access_project(r.project_id)
      AND r.owner_type = 'dfy'
    )
  );

-- Client can insert attachments to their owned requirements
CREATE POLICY "requirement_attachments_client_insert" ON requirement_attachments
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND get_user_role() = 'client'
    AND EXISTS (
      SELECT 1 FROM onboarding_requirements r
      WHERE r.id = requirement_attachments.requirement_id
      AND can_access_project(r.project_id)
      AND r.owner_type = 'client'
    )
  );

-- REQUIREMENT_TEMPLATES POLICIES

-- All authenticated users can view active templates
CREATE POLICY "requirement_templates_select_authenticated" ON requirement_templates
  FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = true);

-- Only admin can manage templates
CREATE POLICY "requirement_templates_admin_all" ON requirement_templates
  FOR ALL USING (auth.uid() IS NOT NULL AND get_user_role() = 'admin');

-- ============================================================================
-- DATA MIGRATION FROM project_requirements
-- ============================================================================

-- Migrate existing project_requirements to onboarding_requirements
-- Map assigned_role: 'admin' -> 'hexona', 'client' -> 'client'
INSERT INTO onboarding_requirements (
  id,
  project_id,
  parent_id,
  title,
  description,
  notes,
  owner_type,
  blocker_type,
  status,
  position,
  created_at,
  completed_at,
  completed_by
)
SELECT
  id,
  project_id,
  NULL as parent_id, -- existing requirements are flat
  title,
  description,
  response as notes,
  CASE
    WHEN assigned_role = 'admin' THEN 'hexona'::requirement_owner
    WHEN assigned_role = 'client' THEN 'client'::requirement_owner
    ELSE 'hexona'::requirement_owner
  END as owner_type,
  'none'::requirement_blocker as blocker_type,
  CASE
    WHEN status = 'completed' THEN 'approved'::onboarding_requirement_status
    WHEN status = 'blocked' THEN 'blocked'::onboarding_requirement_status
    WHEN status = 'in_progress' THEN 'in_progress'::onboarding_requirement_status
    ELSE 'pending'::onboarding_requirement_status
  END as status,
  sort_order as position,
  created_at,
  completed_at,
  completed_by
FROM project_requirements
WHERE EXISTS (SELECT 1 FROM project_requirements LIMIT 1);

-- ============================================================================
-- SEED DATA: Requirement Templates
-- ============================================================================

INSERT INTO requirement_templates (name, description, loom_url, default_owner, category) VALUES
-- Platform Access
('GoHighLevel Subaccount Setup', 'Set up client subaccount in GoHighLevel with proper permissions and branding', NULL, 'hexona', 'platform_access'),
('Meta Business Suite Access', 'Request access to client Meta Business Suite for ads and page management', NULL, 'client', 'platform_access'),
('CRM Access', 'Obtain login credentials or invite to client CRM system', NULL, 'client', 'platform_access'),
('Google Analytics Access', 'Get added as user to Google Analytics property', NULL, 'client', 'platform_access'),

-- Credentials
('Client Platform Credentials', 'Gather all necessary login credentials for client systems', NULL, 'client', 'credentials'),
('Phone System Access', 'Access to client phone system for call tracking integration', NULL, 'client', 'credentials'),
('Email Account Setup', 'Set up dedicated email account for automations', NULL, 'hexona', 'credentials'),

-- Assets
('Brand Guidelines', 'Collect brand colors, fonts, logo files, and style preferences', NULL, 'client', 'assets'),
('Call Scripts', 'Provide sales or support call scripts for automation training', NULL, 'client', 'assets'),
('Email Templates', 'Provide existing email templates or approve new ones', NULL, 'client', 'assets'),
('Product/Service Catalog', 'List of products/services with descriptions and pricing', NULL, 'client', 'assets'),

-- Setup
('WAGHL Setup', 'Configure WhatsApp + GoHighLevel integration', 'https://www.loom.com/share/placeholder-waghl', 'hexona', 'setup'),
('Workflow Configuration', 'Set up automation workflows based on requirements', NULL, 'hexona', 'setup'),
('Testing & QA', 'Comprehensive testing of all integrations and automations', NULL, 'hexona', 'setup'),

-- Payments
('Payment Link Setup', 'Create and configure payment collection links', NULL, 'hexona', 'payments'),
('Invoice Details', 'Provide business details for invoicing (address, tax ID, etc.)', NULL, 'client', 'payments'),
('Stripe Connect', 'Connect client Stripe account for payments', NULL, 'client', 'payments');

-- ============================================================================
-- NOTE: Old tables will be dropped in a future migration after verification
-- DO NOT drop project_requirements or requirement_dependencies yet
-- ============================================================================
