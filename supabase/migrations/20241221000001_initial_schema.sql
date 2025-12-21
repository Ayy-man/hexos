-- hexOS Initial Schema Migration
-- Creates all core tables, enums, functions, RLS policies, and triggers

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE user_role AS ENUM ('admin', 'internal', 'dev', 'dfy', 'client');

CREATE TYPE project_status AS ENUM (
  -- Inquiry
  'inquiry_new', 'ai_matching', 'qualified',
  -- Proposal
  'proposal_drafting', 'internal_review', 'proposal_sent', 'negotiating', 'committed',
  -- Agreement
  'agreement_sent', 'agreement_signed',
  -- Payment
  'payment_pending', 'payment_partial', 'payment_paid',
  -- Onboarding
  'collecting_access', 'access_complete', 'dev_assigned',
  -- Development
  'in_progress', 'blocked_client', 'blocked_internal', 'review_checkpoint', 'revisions', 'final_qa',
  -- Delivery
  'delivered', 'acceptance_pending', 'accepted',
  -- Closed
  'completed', 'cancelled', 'on_hold'
);

CREATE TYPE project_type AS ENUM ('blueprint', 'blueprint_custom', 'full_custom');
CREATE TYPE operational_mode AS ENUM ('internal', 'hexona_devs', 'hexona_devs_dfy');
CREATE TYPE payment_structure AS ENUM ('100_upfront', '50_50', '40_30_30', 'custom');
CREATE TYPE scope_change_trigger AS ENUM ('client_request', 'dev_flag', 'deliverable_modified', 'timeline_extended');

-- ============================================================================
-- TABLES
-- ============================================================================

-- Users (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'client',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blueprints (productized services catalog)
CREATE TABLE public.blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  default_deliverables JSONB,
  estimated_hours INT,
  base_price DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  dfy_partner_id UUID REFERENCES profiles(id),
  assigned_dev_id UUID REFERENCES profiles(id),
  client_id UUID REFERENCES profiles(id),

  -- Core info
  project_name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_business TEXT,

  -- Classification
  status project_status DEFAULT 'inquiry_new',
  project_type project_type,
  operational_mode operational_mode DEFAULT 'internal',
  blueprint_match_score INT,
  matched_blueprint_id UUID REFERENCES blueprints(id),

  -- Financials (Admin only via RLS)
  quoted_price DECIMAL(10,2),
  dev_cost DECIMAL(10,2),
  dfy_commission_pct DECIMAL(5,2),
  payment_structure payment_structure DEFAULT '50_50',

  -- Dates
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  proposal_sent_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  target_delivery_date DATE,
  delivered_at TIMESTAMPTZ,

  notes TEXT
);

-- Deliverables (source of truth for timeline/Gantt)
CREATE TABLE public.deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending', -- pending, in_progress, blocked, done

  estimated_hours DECIMAL(5,1),
  start_date DATE,
  due_date DATE,
  completed_at TIMESTAMPTZ,

  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Files
CREATE TABLE public.project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  deliverable_id UUID REFERENCES deliverables(id),

  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INT,
  file_type TEXT,

  uploaded_by UUID REFERENCES profiles(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment Milestones
CREATE TABLE public.payment_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  label TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  stripe_payment_id TEXT,

  sort_order INT DEFAULT 0
);

-- Scope Changes
CREATE TABLE public.scope_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  trigger_type scope_change_trigger NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'detected', -- detected, pending_review, approved, denied
  price_adjustment DECIMAL(10,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id)
);

-- Activity Log
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),

  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_dfy ON projects(dfy_partner_id);
CREATE INDEX idx_projects_dev ON projects(assigned_dev_id);
CREATE INDEX idx_projects_client ON projects(client_id);
CREATE INDEX idx_deliverables_project ON deliverables(project_id);
CREATE INDEX idx_activity_project ON activity_log(project_id);
CREATE INDEX idx_project_files_project ON project_files(project_id);
CREATE INDEX idx_payment_milestones_project ON payment_milestones(project_id);
CREATE INDEX idx_scope_changes_project ON scope_changes(project_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if user can access a project
CREATE OR REPLACE FUNCTION public.can_access_project(p_project_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role user_role;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  v_user_role := public.get_user_role();

  RETURN CASE v_user_role
    WHEN 'admin' THEN TRUE
    WHEN 'internal' THEN TRUE
    WHEN 'dev' THEN EXISTS (
      SELECT 1 FROM projects WHERE id = p_project_id AND assigned_dev_id = v_user_id
    )
    WHEN 'dfy' THEN EXISTS (
      SELECT 1 FROM projects WHERE id = p_project_id AND dfy_partner_id = v_user_id
    )
    WHEN 'client' THEN EXISTS (
      SELECT 1 FROM projects WHERE id = p_project_id AND client_id = v_user_id
    )
    ELSE FALSE
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE scope_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_select_admin" ON profiles
  FOR SELECT USING (get_user_role() = 'admin');

CREATE POLICY "profiles_insert_admin" ON profiles
  FOR INSERT WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (role = (SELECT role FROM profiles WHERE id = auth.uid()));

CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE USING (get_user_role() = 'admin');

CREATE POLICY "profiles_delete_admin" ON profiles
  FOR DELETE USING (get_user_role() = 'admin');

-- BLUEPRINTS POLICIES (admin only for now)
CREATE POLICY "blueprints_select_all" ON blueprints
  FOR SELECT USING (true);

CREATE POLICY "blueprints_admin_all" ON blueprints
  FOR ALL USING (get_user_role() = 'admin');

-- PROJECTS POLICIES
CREATE POLICY "projects_admin_all" ON projects
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "projects_internal_select" ON projects
  FOR SELECT USING (get_user_role() = 'internal');

CREATE POLICY "projects_dev_select" ON projects
  FOR SELECT USING (
    get_user_role() = 'dev' AND assigned_dev_id = auth.uid()
  );

CREATE POLICY "projects_dfy_select" ON projects
  FOR SELECT USING (
    get_user_role() = 'dfy' AND dfy_partner_id = auth.uid()
  );

CREATE POLICY "projects_client_select" ON projects
  FOR SELECT USING (
    get_user_role() = 'client' AND client_id = auth.uid()
  );

-- DELIVERABLES POLICIES
CREATE POLICY "deliverables_access_via_project" ON deliverables
  FOR SELECT USING (can_access_project(project_id));

CREATE POLICY "deliverables_admin_all" ON deliverables
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "deliverables_internal_insert_update" ON deliverables
  FOR INSERT WITH CHECK (get_user_role() = 'internal');

CREATE POLICY "deliverables_internal_update" ON deliverables
  FOR UPDATE USING (get_user_role() = 'internal');

CREATE POLICY "deliverables_dev_update_status" ON deliverables
  FOR UPDATE USING (
    get_user_role() = 'dev' AND can_access_project(project_id)
  );

-- PROJECT_FILES POLICIES
CREATE POLICY "project_files_access_via_project" ON project_files
  FOR SELECT USING (can_access_project(project_id));

CREATE POLICY "project_files_admin_all" ON project_files
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "project_files_insert_authenticated" ON project_files
  FOR INSERT WITH CHECK (can_access_project(project_id));

-- PAYMENT_MILESTONES POLICIES (admin + dfy can see their own)
CREATE POLICY "payment_milestones_admin_all" ON payment_milestones
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "payment_milestones_dfy_select" ON payment_milestones
  FOR SELECT USING (
    get_user_role() = 'dfy' AND can_access_project(project_id)
  );

-- SCOPE_CHANGES POLICIES
CREATE POLICY "scope_changes_access_via_project" ON scope_changes
  FOR SELECT USING (can_access_project(project_id));

CREATE POLICY "scope_changes_admin_all" ON scope_changes
  FOR ALL USING (get_user_role() = 'admin');

-- ACTIVITY_LOG POLICIES
CREATE POLICY "activity_log_access_via_project" ON activity_log
  FOR SELECT USING (can_access_project(project_id));

CREATE POLICY "activity_log_insert_authenticated" ON activity_log
  FOR INSERT WITH CHECK (can_access_project(project_id));

CREATE POLICY "activity_log_admin_all" ON activity_log
  FOR ALL USING (get_user_role() = 'admin');

-- ============================================================================
-- AUDIT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION log_project_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO activity_log (project_id, user_id, action, details)
    VALUES (
      OLD.id,
      auth.uid(),
      'DELETE',
      jsonb_build_object('old', to_jsonb(OLD))
    );
    RETURN OLD;
  ELSE
    INSERT INTO activity_log (project_id, user_id, action, details)
    VALUES (
      COALESCE(NEW.id, OLD.id),
      auth.uid(),
      TG_OP,
      jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW))
    );
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER projects_audit
  AFTER INSERT OR UPDATE OR DELETE ON projects
  FOR EACH ROW EXECUTE FUNCTION log_project_changes();
