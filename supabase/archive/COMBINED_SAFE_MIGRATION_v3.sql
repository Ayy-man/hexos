-- ============================================================================
-- hexOS COMBINED SAFE MIGRATION v3
-- Generated: 2026-01-05
-- 
-- FIXES:
-- - Added DROP POLICY IF EXISTS before each CREATE POLICY
-- - Fixed p.name -> p.project_name in backfill queries
-- - Excludes dangerous 20260103000006_fix_project_files_rls.sql
-- ============================================================================


-- ============================================================================
-- Migration: 20241221000001_initial_schema.sql
-- ============================================================================

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
  -- Closed2
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
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
CREATE POLICY "profiles_select_admin" ON profiles
  FOR SELECT USING (get_user_role() = 'admin');

DROP POLICY IF EXISTS "profiles_insert_admin" ON profiles;
CREATE POLICY "profiles_insert_admin" ON profiles
  FOR INSERT WITH CHECK (get_user_role() = 'admin');

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (role = (SELECT role FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE USING (get_user_role() = 'admin');

DROP POLICY IF EXISTS "profiles_delete_admin" ON profiles;
CREATE POLICY "profiles_delete_admin" ON profiles
  FOR DELETE USING (get_user_role() = 'admin');

-- BLUEPRINTS POLICIES (admin only for now)
DROP POLICY IF EXISTS "blueprints_select_all" ON blueprints;
CREATE POLICY "blueprints_select_all" ON blueprints
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "blueprints_admin_all" ON blueprints;
CREATE POLICY "blueprints_admin_all" ON blueprints
  FOR ALL USING (get_user_role() = 'admin');

-- PROJECTS POLICIES
DROP POLICY IF EXISTS "projects_admin_all" ON projects;
CREATE POLICY "projects_admin_all" ON projects
  FOR ALL USING (get_user_role() = 'admin');

DROP POLICY IF EXISTS "projects_internal_select" ON projects;
CREATE POLICY "projects_internal_select" ON projects
  FOR SELECT USING (get_user_role() = 'internal');

DROP POLICY IF EXISTS "projects_dev_select" ON projects;
CREATE POLICY "projects_dev_select" ON projects
  FOR SELECT USING (
    get_user_role() = 'dev' AND assigned_dev_id = auth.uid()
  );

DROP POLICY IF EXISTS "projects_dfy_select" ON projects;
CREATE POLICY "projects_dfy_select" ON projects
  FOR SELECT USING (
    get_user_role() = 'dfy' AND dfy_partner_id = auth.uid()
  );

DROP POLICY IF EXISTS "projects_client_select" ON projects;
CREATE POLICY "projects_client_select" ON projects
  FOR SELECT USING (
    get_user_role() = 'client' AND client_id = auth.uid()
  );

-- DELIVERABLES POLICIES
DROP POLICY IF EXISTS "deliverables_access_via_project" ON deliverables;
CREATE POLICY "deliverables_access_via_project" ON deliverables
  FOR SELECT USING (can_access_project(project_id));

DROP POLICY IF EXISTS "deliverables_admin_all" ON deliverables;
CREATE POLICY "deliverables_admin_all" ON deliverables
  FOR ALL USING (get_user_role() = 'admin');

DROP POLICY IF EXISTS "deliverables_internal_insert_update" ON deliverables;
CREATE POLICY "deliverables_internal_insert_update" ON deliverables
  FOR INSERT WITH CHECK (get_user_role() = 'internal');

DROP POLICY IF EXISTS "deliverables_internal_update" ON deliverables;
CREATE POLICY "deliverables_internal_update" ON deliverables
  FOR UPDATE USING (get_user_role() = 'internal');

DROP POLICY IF EXISTS "deliverables_dev_update_status" ON deliverables;
CREATE POLICY "deliverables_dev_update_status" ON deliverables
  FOR UPDATE USING (
    get_user_role() = 'dev' AND can_access_project(project_id)
  );

-- PROJECT_FILES POLICIES
DROP POLICY IF EXISTS "project_files_access_via_project" ON project_files;
CREATE POLICY "project_files_access_via_project" ON project_files
  FOR SELECT USING (can_access_project(project_id));

DROP POLICY IF EXISTS "project_files_admin_all" ON project_files;
CREATE POLICY "project_files_admin_all" ON project_files
  FOR ALL USING (get_user_role() = 'admin');

DROP POLICY IF EXISTS "project_files_insert_authenticated" ON project_files;
CREATE POLICY "project_files_insert_authenticated" ON project_files
  FOR INSERT WITH CHECK (can_access_project(project_id));

-- PAYMENT_MILESTONES POLICIES (admin + dfy can see their own)
DROP POLICY IF EXISTS "payment_milestones_admin_all" ON payment_milestones;
CREATE POLICY "payment_milestones_admin_all" ON payment_milestones
  FOR ALL USING (get_user_role() = 'admin');

DROP POLICY IF EXISTS "payment_milestones_dfy_select" ON payment_milestones;
CREATE POLICY "payment_milestones_dfy_select" ON payment_milestones
  FOR SELECT USING (
    get_user_role() = 'dfy' AND can_access_project(project_id)
  );

-- SCOPE_CHANGES POLICIES
DROP POLICY IF EXISTS "scope_changes_access_via_project" ON scope_changes;
CREATE POLICY "scope_changes_access_via_project" ON scope_changes
  FOR SELECT USING (can_access_project(project_id));

DROP POLICY IF EXISTS "scope_changes_admin_all" ON scope_changes;
CREATE POLICY "scope_changes_admin_all" ON scope_changes
  FOR ALL USING (get_user_role() = 'admin');

-- ACTIVITY_LOG POLICIES
DROP POLICY IF EXISTS "activity_log_access_via_project" ON activity_log;
CREATE POLICY "activity_log_access_via_project" ON activity_log
  FOR SELECT USING (can_access_project(project_id));

DROP POLICY IF EXISTS "activity_log_insert_authenticated" ON activity_log;
CREATE POLICY "activity_log_insert_authenticated" ON activity_log
  FOR INSERT WITH CHECK (can_access_project(project_id));

DROP POLICY IF EXISTS "activity_log_admin_all" ON activity_log;
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


-- ============================================================================
-- Migration: 20241221000002_profile_trigger.sql
-- ============================================================================

-- Profile Creation Trigger
-- Auto-creates a profile when a new user signs up via Supabase Auth

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'client')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================================
-- Migration: 20241221000003_fix_rls_policies.sql
-- ============================================================================

-- Fix RLS policies to check auth.uid() IS NOT NULL before calling get_user_role()
-- This prevents errors when querying without authentication

-- Drop and recreate profiles policies
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_admin" ON profiles;

DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
CREATE POLICY "profiles_select_admin" ON profiles
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND get_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "profiles_insert_admin" ON profiles;
CREATE POLICY "profiles_insert_admin" ON profiles
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND get_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND get_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "profiles_delete_admin" ON profiles;
CREATE POLICY "profiles_delete_admin" ON profiles
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND get_user_role() = 'admin'
  );

-- Drop and recreate projects policies
DROP POLICY IF EXISTS "projects_admin_all" ON projects;
DROP POLICY IF EXISTS "projects_internal_select" ON projects;
DROP POLICY IF EXISTS "projects_dev_select" ON projects;
DROP POLICY IF EXISTS "projects_dfy_select" ON projects;
DROP POLICY IF EXISTS "projects_client_select" ON projects;

DROP POLICY IF EXISTS "projects_admin_all" ON projects;
CREATE POLICY "projects_admin_all" ON projects
  FOR ALL USING (auth.uid() IS NOT NULL AND get_user_role() = 'admin');

DROP POLICY IF EXISTS "projects_internal_select" ON projects;
CREATE POLICY "projects_internal_select" ON projects
  FOR SELECT USING (auth.uid() IS NOT NULL AND get_user_role() = 'internal');

DROP POLICY IF EXISTS "projects_dev_select" ON projects;
CREATE POLICY "projects_dev_select" ON projects
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND get_user_role() = 'dev' AND assigned_dev_id = auth.uid()
  );

DROP POLICY IF EXISTS "projects_dfy_select" ON projects;
CREATE POLICY "projects_dfy_select" ON projects
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND get_user_role() = 'dfy' AND dfy_partner_id = auth.uid()
  );

DROP POLICY IF EXISTS "projects_client_select" ON projects;
CREATE POLICY "projects_client_select" ON projects
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND get_user_role() = 'client' AND client_id = auth.uid()
  );

-- Fix deliverables policies
DROP POLICY IF EXISTS "deliverables_access_via_project" ON deliverables;
DROP POLICY IF EXISTS "deliverables_admin_all" ON deliverables;
DROP POLICY IF EXISTS "deliverables_internal_insert_update" ON deliverables;
DROP POLICY IF EXISTS "deliverables_internal_update" ON deliverables;
DROP POLICY IF EXISTS "deliverables_dev_update_status" ON deliverables;

DROP POLICY IF EXISTS "deliverables_access_via_project" ON deliverables;
CREATE POLICY "deliverables_access_via_project" ON deliverables
  FOR SELECT USING (auth.uid() IS NOT NULL AND can_access_project(project_id));

DROP POLICY IF EXISTS "deliverables_admin_all" ON deliverables;
CREATE POLICY "deliverables_admin_all" ON deliverables
  FOR ALL USING (auth.uid() IS NOT NULL AND get_user_role() = 'admin');

DROP POLICY IF EXISTS "deliverables_internal_insert" ON deliverables;
CREATE POLICY "deliverables_internal_insert" ON deliverables
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND get_user_role() = 'internal');

DROP POLICY IF EXISTS "deliverables_internal_update" ON deliverables;
CREATE POLICY "deliverables_internal_update" ON deliverables
  FOR UPDATE USING (auth.uid() IS NOT NULL AND get_user_role() = 'internal');

DROP POLICY IF EXISTS "deliverables_dev_update_status" ON deliverables;
CREATE POLICY "deliverables_dev_update_status" ON deliverables
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND get_user_role() = 'dev' AND can_access_project(project_id)
  );

-- Fix other table policies
DROP POLICY IF EXISTS "project_files_access_via_project" ON project_files;
DROP POLICY IF EXISTS "project_files_admin_all" ON project_files;
DROP POLICY IF EXISTS "project_files_insert_authenticated" ON project_files;

DROP POLICY IF EXISTS "project_files_access_via_project" ON project_files;
CREATE POLICY "project_files_access_via_project" ON project_files
  FOR SELECT USING (auth.uid() IS NOT NULL AND can_access_project(project_id));

DROP POLICY IF EXISTS "project_files_admin_all" ON project_files;
CREATE POLICY "project_files_admin_all" ON project_files
  FOR ALL USING (auth.uid() IS NOT NULL AND get_user_role() = 'admin');

DROP POLICY IF EXISTS "project_files_insert_authenticated" ON project_files;
CREATE POLICY "project_files_insert_authenticated" ON project_files
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND can_access_project(project_id));

-- Fix payment_milestones policies
DROP POLICY IF EXISTS "payment_milestones_admin_all" ON payment_milestones;
DROP POLICY IF EXISTS "payment_milestones_dfy_select" ON payment_milestones;

DROP POLICY IF EXISTS "payment_milestones_admin_all" ON payment_milestones;
CREATE POLICY "payment_milestones_admin_all" ON payment_milestones
  FOR ALL USING (auth.uid() IS NOT NULL AND get_user_role() = 'admin');

DROP POLICY IF EXISTS "payment_milestones_dfy_select" ON payment_milestones;
CREATE POLICY "payment_milestones_dfy_select" ON payment_milestones
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND get_user_role() = 'dfy' AND can_access_project(project_id)
  );

-- Fix scope_changes policies
DROP POLICY IF EXISTS "scope_changes_access_via_project" ON scope_changes;
DROP POLICY IF EXISTS "scope_changes_admin_all" ON scope_changes;

DROP POLICY IF EXISTS "scope_changes_access_via_project" ON scope_changes;
CREATE POLICY "scope_changes_access_via_project" ON scope_changes
  FOR SELECT USING (auth.uid() IS NOT NULL AND can_access_project(project_id));

DROP POLICY IF EXISTS "scope_changes_admin_all" ON scope_changes;
CREATE POLICY "scope_changes_admin_all" ON scope_changes
  FOR ALL USING (auth.uid() IS NOT NULL AND get_user_role() = 'admin');

-- Fix activity_log policies
DROP POLICY IF EXISTS "activity_log_access_via_project" ON activity_log;
DROP POLICY IF EXISTS "activity_log_insert_authenticated" ON activity_log;
DROP POLICY IF EXISTS "activity_log_admin_all" ON activity_log;

DROP POLICY IF EXISTS "activity_log_access_via_project" ON activity_log;
CREATE POLICY "activity_log_access_via_project" ON activity_log
  FOR SELECT USING (auth.uid() IS NOT NULL AND can_access_project(project_id));

DROP POLICY IF EXISTS "activity_log_insert_authenticated" ON activity_log;
CREATE POLICY "activity_log_insert_authenticated" ON activity_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND can_access_project(project_id));

DROP POLICY IF EXISTS "activity_log_admin_all" ON activity_log;
CREATE POLICY "activity_log_admin_all" ON activity_log
  FOR ALL USING (auth.uid() IS NOT NULL AND get_user_role() = 'admin');

-- Fix blueprints policies
DROP POLICY IF EXISTS "blueprints_select_all" ON blueprints;
DROP POLICY IF EXISTS "blueprints_admin_all" ON blueprints;

DROP POLICY IF EXISTS "blueprints_select_all" ON blueprints;
CREATE POLICY "blueprints_select_all" ON blueprints
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "blueprints_admin_all" ON blueprints;
CREATE POLICY "blueprints_admin_all" ON blueprints
  FOR ALL USING (auth.uid() IS NOT NULL AND get_user_role() = 'admin');


-- ============================================================================
-- Migration: 20241221000004_profile_self_read.sql
-- ============================================================================

-- Allow users to read their own profile
-- This is needed for the signIn action and dashboard access

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Also allow users to update their own profile (name, etc.)
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);


-- ============================================================================
-- Migration: 20241221000005_inquiries_table.sql
-- ============================================================================

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
DROP POLICY IF EXISTS "inquiries_dfy_select_own" ON inquiries;
CREATE POLICY "inquiries_dfy_select_own" ON inquiries
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND get_user_role() = 'dfy'
    AND submitted_by = auth.uid()
  );

-- DFY partners can insert
DROP POLICY IF EXISTS "inquiries_dfy_insert" ON inquiries;
CREATE POLICY "inquiries_dfy_insert" ON inquiries
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND get_user_role() = 'dfy'
  );

-- Admin/Internal full access
DROP POLICY IF EXISTS "inquiries_admin_all" ON inquiries;
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


-- ============================================================================
-- Migration: 20241221000006_seed_blueprints.sql
-- ============================================================================

-- Seed blueprints data
-- Popular / Highest ROI blueprints
INSERT INTO blueprints (name, description, estimated_hours, base_price) VALUES
  ('Instagram DM AI Agent', 'Automated Instagram DM responses and lead qualification using AI', 40, 2500),
  ('MCTB + Voice AI', 'Missed Call Text Back system combined with Voice AI for 24/7 lead capture', 30, 2000),
  ('Speed-to-Lead AI Agent', 'Instant lead response system to maximize conversion rates', 25, 1800),
  ('AEO (AI SEO)', 'AI-powered SEO optimization and content generation', 35, 2200),
  ('Database Reactivation', 'Re-engage dormant leads and customers with automated campaigns', 20, 1500),
  ('Digital Loyalty System', 'Automated customer loyalty and rewards program', 30, 2000),
  ('AI Website Chat Widget', 'Intelligent chatbot for website visitor engagement and lead capture', 25, 1800);

-- Secondary Solutions
INSERT INTO blueprints (name, description, estimated_hours, base_price) VALUES
  ('Reputation & Review Domination', 'Automated review collection and reputation management system', 20, 1500),
  ('Lead Nurture Sequence', 'Multi-channel automated lead nurturing workflows', 15, 1200),
  ('Email Auto-Responder', 'Intelligent email response automation', 10, 800),
  ('AI Appointment Reminders & No-Show Recovery', 'Automated appointment confirmations and no-show follow-up', 15, 1200),
  ('B2B Email System', 'Cold outreach and B2B email automation', 20, 1500);


-- ============================================================================
-- Migration: 20241221000007_inquiry_documents.sql
-- ============================================================================

-- Add document_content column to inquiries for Plate.js editor state
-- Migration: 20241221000007_inquiry_documents.sql

-- ============================================================================
-- SCHEMA CHANGES
-- ============================================================================

-- Add document_content column for Plate.js editor state (Slate JSON format)
ALTER TABLE inquiries
ADD COLUMN document_content JSONB DEFAULT NULL;

-- Add index for queries that filter by document presence
CREATE INDEX idx_inquiries_has_document
ON inquiries((document_content IS NOT NULL));

-- ============================================================================
-- INQUIRY COMMENTS TABLE
-- ============================================================================

-- Comments/discussions on inquiries with support for inline annotations
CREATE TABLE public.inquiry_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,

  -- Comment content
  content TEXT NOT NULL,

  -- For inline comments, reference the text range in document (Plate.js comment mark ID)
  anchor_id TEXT,

  -- Thread structure (for replies)
  parent_id UUID REFERENCES inquiry_comments(id) ON DELETE CASCADE,

  -- Author
  author_id UUID NOT NULL REFERENCES profiles(id),

  -- Resolution status
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_inquiry_comments_inquiry ON inquiry_comments(inquiry_id);
CREATE INDEX idx_inquiry_comments_author ON inquiry_comments(author_id);
CREATE INDEX idx_inquiry_comments_anchor ON inquiry_comments(anchor_id) WHERE anchor_id IS NOT NULL;
CREATE INDEX idx_inquiry_comments_parent ON inquiry_comments(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_inquiry_comments_resolved ON inquiry_comments(resolved) WHERE resolved = FALSE;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE inquiry_comments ENABLE ROW LEVEL SECURITY;

-- Admin/Internal full access to all comments
DROP POLICY IF EXISTS "inquiry_comments_admin_all" ON inquiry_comments;
CREATE POLICY "inquiry_comments_admin_all" ON inquiry_comments
  FOR ALL USING (
    auth.uid() IS NOT NULL
    AND get_user_role() IN ('admin', 'internal')
  );

-- DFY partners can view comments on their own inquiries (read-only)
DROP POLICY IF EXISTS "inquiry_comments_dfy_select_own" ON inquiry_comments;
CREATE POLICY "inquiry_comments_dfy_select_own" ON inquiry_comments
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND get_user_role() = 'dfy'
    AND EXISTS (
      SELECT 1 FROM inquiries
      WHERE id = inquiry_comments.inquiry_id
      AND submitted_by = auth.uid()
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at trigger for inquiry_comments
CREATE TRIGGER update_inquiry_comments_updated_at
  BEFORE UPDATE ON inquiry_comments
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();


-- ============================================================================
-- Migration: 20241221000008_inquiry_archive_delete.sql
-- ============================================================================

-- Add archive and soft delete columns to inquiries
ALTER TABLE inquiries
ADD COLUMN archived_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN archived_by UUID REFERENCES profiles(id),
ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN deleted_by UUID REFERENCES profiles(id);

-- Index for filtering archived/deleted
CREATE INDEX idx_inquiries_archived ON inquiries(archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX idx_inquiries_deleted ON inquiries(deleted_at) WHERE deleted_at IS NOT NULL;

-- Add DFY policy to insert comments on their own inquiries
DROP POLICY IF EXISTS "inquiry_comments_dfy_insert_own" ON inquiry_comments;
CREATE POLICY "inquiry_comments_dfy_insert_own" ON inquiry_comments
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND get_user_role() = 'dfy'
    AND EXISTS (
      SELECT 1 FROM inquiries
      WHERE id = inquiry_comments.inquiry_id
      AND submitted_by = auth.uid()
    )
  );


-- ============================================================================
-- Migration: 20241221000009_comment_types.sql
-- ============================================================================

-- Add comment_type column to distinguish internal vs dfy comments
-- Migration: 20241221000009_comment_types.sql

-- ============================================================================
-- SCHEMA CHANGES
-- ============================================================================

-- Add comment_type enum
CREATE TYPE comment_type AS ENUM ('internal', 'dfy');

-- Add comment_type column with default 'internal' for existing comments
ALTER TABLE inquiry_comments
ADD COLUMN comment_type comment_type NOT NULL DEFAULT 'internal';

-- Add index for filtering by comment type
CREATE INDEX idx_inquiry_comments_type ON inquiry_comments(comment_type);

-- ============================================================================
-- UPDATE RLS POLICIES
-- ============================================================================

-- Drop existing DFY policy (too restrictive - was read-only)
DROP POLICY IF EXISTS "inquiry_comments_dfy_select_own" ON inquiry_comments;

-- DFY partners can view DFY comments on their own inquiries
DROP POLICY IF EXISTS "inquiry_comments_dfy_select" ON inquiry_comments;
CREATE POLICY "inquiry_comments_dfy_select" ON inquiry_comments
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND get_user_role() = 'dfy'
    AND comment_type = 'dfy'
    AND EXISTS (
      SELECT 1 FROM inquiries
      WHERE id = inquiry_comments.inquiry_id
      AND submitted_by = auth.uid()
    )
  );

-- DFY partners can create DFY comments on their own inquiries
DROP POLICY IF EXISTS "inquiry_comments_dfy_insert" ON inquiry_comments;
CREATE POLICY "inquiry_comments_dfy_insert" ON inquiry_comments
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND get_user_role() = 'dfy'
    AND comment_type = 'dfy'
    AND author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM inquiries
      WHERE id = inquiry_comments.inquiry_id
      AND submitted_by = auth.uid()
    )
  );

-- DFY partners can delete their own DFY comments
DROP POLICY IF EXISTS "inquiry_comments_dfy_delete" ON inquiry_comments;
CREATE POLICY "inquiry_comments_dfy_delete" ON inquiry_comments
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND get_user_role() = 'dfy'
    AND comment_type = 'dfy'
    AND author_id = auth.uid()
  );


-- ============================================================================
-- Migration: 20241221000010_blueprint_content.sql
-- ============================================================================

-- Add rich content and metadata columns to blueprints
-- Supports Plate.js document content, pricing tiers, and free-form tags

-- Add new columns
ALTER TABLE blueprints
ADD COLUMN IF NOT EXISTS content JSONB,
ADD COLUMN IF NOT EXISTS pricing_tiers JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published')),
ADD COLUMN IF NOT EXISTS icon TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create update_updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_blueprints_updated_at ON blueprints;
CREATE TRIGGER update_blueprints_updated_at
  BEFORE UPDATE ON blueprints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Update RLS to allow DFY to view published blueprints
DROP POLICY IF EXISTS "blueprints_dfy_select" ON blueprints;
DROP POLICY IF EXISTS "blueprints_dfy_select" ON blueprints;
CREATE POLICY "blueprints_dfy_select" ON blueprints
  FOR SELECT
  TO authenticated
  USING (
    status = 'published'
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'internal')
    )
  );

-- Comment on pricing_tiers structure
COMMENT ON COLUMN blueprints.pricing_tiers IS 'JSON array of pricing tiers: [{name: string, setup_price: number, monthly_price: number, features: string[]}]';
COMMENT ON COLUMN blueprints.content IS 'Plate.js document content as JSON';
COMMENT ON COLUMN blueprints.tags IS 'Free-form tags for filtering/categorization';


-- ============================================================================
-- Migration: 20241221000011_inline_discussions.sql
-- ============================================================================

-- Add inline_discussions column for Plate.js inline comment persistence
-- Migration: 20241221000010_inline_discussions.sql

-- Store inline discussions (the actual comment content for highlighted text)
-- This is separate from document_content which only stores the text marks
ALTER TABLE inquiries
ADD COLUMN inline_discussions JSONB DEFAULT '[]'::jsonb;


-- ============================================================================
-- Migration: 20241222000001_proposal_stages.sql
-- ============================================================================

-- Enhanced Proposal Flow: New stages, priority, due dates, and assignment
-- Migration: 20241222000001_proposal_stages.sql

-- New proposal stages matching ClickUp workflow
CREATE TYPE proposal_stage AS ENUM (
  'pending',         -- Newly submitted, not yet reviewed
  'proposal_sent',   -- Proposal drafted and sent to prospect
  'proposal_verify', -- Awaiting client verification/response
  'on_hold',         -- Paused (client request, timing, etc.)
  'agreed'           -- Deal agreed, ready to convert to project
);

-- Add proposal management columns to inquiries
ALTER TABLE inquiries
ADD COLUMN proposal_stage proposal_stage DEFAULT 'pending',
ADD COLUMN stage_entered_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN stage_history JSONB DEFAULT '[]'::jsonb,
ADD COLUMN priority TEXT DEFAULT 'normal',
ADD COLUMN due_date DATE,
ADD COLUMN assigned_to UUID REFERENCES profiles(id),
ADD COLUMN estimated_value DECIMAL(10,2);

-- Add constraint for priority values
ALTER TABLE inquiries
ADD CONSTRAINT inquiries_priority_check
CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

-- Index for stage queries and filtering
CREATE INDEX idx_inquiries_proposal_stage ON inquiries(proposal_stage);
CREATE INDEX idx_inquiries_priority ON inquiries(priority);
CREATE INDEX idx_inquiries_due_date ON inquiries(due_date);
CREATE INDEX idx_inquiries_assigned_to ON inquiries(assigned_to);

-- Public proposal link columns (for P1: client view)
ALTER TABLE inquiries
ADD COLUMN public_token UUID DEFAULT gen_random_uuid(),
ADD COLUMN client_viewed_at TIMESTAMPTZ,
ADD COLUMN client_view_count INT DEFAULT 0;

CREATE UNIQUE INDEX idx_inquiries_public_token ON inquiries(public_token);

-- Comment to explain stage_history structure:
-- Each entry: { "from": "pending", "to": "proposal_sent", "changed_by": "uuid", "changed_at": "timestamp", "notes": "optional" }


-- ============================================================================
-- Migration: 20241222000002_suggestions.sql
-- ============================================================================

-- Suggestions table for user feedback
CREATE TABLE suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'implemented', 'declined')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add updated_at trigger
CREATE TRIGGER update_suggestions_updated_at
  BEFORE UPDATE ON suggestions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS Policies
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;

-- Everyone can create suggestions
CREATE POLICY "Users can create suggestions"
  ON suggestions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can see their own suggestions
CREATE POLICY "Users can view own suggestions"
  ON suggestions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admin/internal can see all suggestions
CREATE POLICY "Admin can view all suggestions"
  ON suggestions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'internal')
    )
  );

-- Admin/internal can update suggestions (status, notes)
CREATE POLICY "Admin can update suggestions"
  ON suggestions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'internal')
    )
  );

-- Admin can delete suggestions
CREATE POLICY "Admin can delete suggestions"
  ON suggestions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create index for faster queries
CREATE INDEX suggestions_user_id_idx ON suggestions(user_id);
CREATE INDEX suggestions_status_idx ON suggestions(status);
CREATE INDEX suggestions_created_at_idx ON suggestions(created_at DESC);


-- ============================================================================
-- Migration: 20241222000003_case_studies.sql
-- ============================================================================

-- Case Studies table
CREATE TABLE case_studies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  client_name TEXT,
  industry TEXT,
  challenge TEXT,
  solution TEXT,
  results TEXT,
  content JSONB,
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  icon TEXT,
  blueprint_id UUID REFERENCES blueprints(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Updated_at trigger
CREATE TRIGGER update_case_studies_updated_at
  BEFORE UPDATE ON case_studies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE case_studies ENABLE ROW LEVEL SECURITY;

-- Admin/Internal: Full access for all operations
CREATE POLICY "Admin/Internal full access"
  ON case_studies FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'internal')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'internal')
    )
  );

-- DFY: View published only
CREATE POLICY "DFY view published"
  ON case_studies FOR SELECT
  TO authenticated
  USING (
    status = 'published' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'dfy'
    )
  );

-- Indexes
CREATE INDEX case_studies_status_idx ON case_studies(status);
CREATE INDEX case_studies_blueprint_id_idx ON case_studies(blueprint_id);
CREATE INDEX case_studies_created_at_idx ON case_studies(created_at DESC);


-- ============================================================================
-- Migration: 20241222000004_case_studies_image.sql
-- ============================================================================

-- Add image_url to case_studies
ALTER TABLE case_studies ADD COLUMN IF NOT EXISTS image_url TEXT;


-- ============================================================================
-- Migration: 20241223000001_new_proposal_stages.sql
-- ============================================================================

-- New Proposal Stages Migration - Part 1
-- Migration: 20241223000001_new_proposal_stages.sql
-- Adds new enum values to proposal_stage type
-- Note: Data migration happens in a separate file because PostgreSQL requires
-- enum values to be committed before they can be used in UPDATE statements

-- Add new enum values (PostgreSQL allows adding but not removing enum values)
ALTER TYPE proposal_stage ADD VALUE IF NOT EXISTS 'unopened';
ALTER TYPE proposal_stage ADD VALUE IF NOT EXISTS 'admin_reviewed';
ALTER TYPE proposal_stage ADD VALUE IF NOT EXISTS 'in_queue';
ALTER TYPE proposal_stage ADD VALUE IF NOT EXISTS 'working';
ALTER TYPE proposal_stage ADD VALUE IF NOT EXISTS 'final_review';
ALTER TYPE proposal_stage ADD VALUE IF NOT EXISTS 'ready';


-- ============================================================================
-- Migration: 20241223000002_migrate_proposal_stages.sql
-- ============================================================================

-- New Proposal Stages Migration - Part 2: Data Migration
-- Migration: 20241223000002_migrate_proposal_stages.sql
-- Migrates existing data from old stages to new stages
-- Old: pending, proposal_sent, proposal_verify, on_hold, agreed
-- New: unopened, admin_reviewed, in_queue, working, on_hold, final_review, ready

-- Migrate existing data to new stages
UPDATE inquiries SET proposal_stage = 'unopened' WHERE proposal_stage = 'pending';
UPDATE inquiries SET proposal_stage = 'ready' WHERE proposal_stage = 'agreed';
UPDATE inquiries SET proposal_stage = 'in_queue' WHERE proposal_stage = 'proposal_sent';
UPDATE inquiries SET proposal_stage = 'working' WHERE proposal_stage = 'proposal_verify';
-- on_hold stays the same

-- Update default for new inquiries
ALTER TABLE inquiries ALTER COLUMN proposal_stage SET DEFAULT 'unopened';

-- Update stage_history to reflect new stage names
-- This uses a DO block to iterate and update the JSONB array
DO $$
DECLARE
  r RECORD;
  new_history JSONB;
  entry JSONB;
  new_from TEXT;
  new_to TEXT;
BEGIN
  FOR r IN SELECT id, stage_history FROM inquiries WHERE jsonb_array_length(COALESCE(stage_history, '[]'::jsonb)) > 0 LOOP
    new_history := '[]'::jsonb;

    FOR entry IN SELECT * FROM jsonb_array_elements(r.stage_history) LOOP
      -- Map old stage names to new ones
      new_from := CASE entry->>'from'
        WHEN 'pending' THEN 'unopened'
        WHEN 'agreed' THEN 'ready'
        WHEN 'proposal_sent' THEN 'in_queue'
        WHEN 'proposal_verify' THEN 'working'
        ELSE entry->>'from'
      END;

      new_to := CASE entry->>'to'
        WHEN 'pending' THEN 'unopened'
        WHEN 'agreed' THEN 'ready'
        WHEN 'proposal_sent' THEN 'in_queue'
        WHEN 'proposal_verify' THEN 'working'
        ELSE entry->>'to'
      END;

      -- Build the new entry with updated stage names
      entry := jsonb_set(entry, '{from}', to_jsonb(new_from));
      entry := jsonb_set(entry, '{to}', to_jsonb(new_to));

      new_history := new_history || entry;
    END LOOP;

    UPDATE inquiries SET stage_history = new_history WHERE id = r.id;
  END LOOP;
END $$;


-- ============================================================================
-- Migration: 20241223000003_pricing_notes.sql
-- ============================================================================

-- Add pricing_notes column for DFY partners to add context to proposals
-- Migration: 20241223000003_pricing_notes.sql

ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS pricing_notes TEXT;

-- Comment to explain usage
COMMENT ON COLUMN inquiries.pricing_notes IS 'Optional notes from DFY partner explaining pricing breakdown';


-- ============================================================================
-- Migration: 20241223000004_proposal_tabs.sql
-- ============================================================================

-- Migration: Add proposal tabs support
-- Adds columns for admin proposal, DFY's private version, and proposal comments

-- Proposal content (admin writes this)
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS proposal_content JSONB;

-- Track when proposal was submitted to DFY partner
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS proposal_submitted_at TIMESTAMPTZ;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS proposal_submitted_by UUID REFERENCES profiles(id);

-- DFY's private version (only they can see/edit)
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS dfy_version_content JSONB;

-- Inline discussions for proposal (like document has inline_discussions)
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS proposal_discussions JSONB DEFAULT '[]'::jsonb;

-- Add 'proposal' to comment_type enum for sidebar comments
-- Note: This must be committed before creating indexes that reference it
ALTER TYPE comment_type ADD VALUE IF NOT EXISTS 'proposal';

-- Add comments for documentation
COMMENT ON COLUMN inquiries.proposal_content IS 'Admin-written proposal content (Plate.js JSON)';
COMMENT ON COLUMN inquiries.proposal_submitted_at IS 'When proposal was submitted to DFY partner';
COMMENT ON COLUMN inquiries.proposal_submitted_by IS 'Who submitted the proposal to DFY';
COMMENT ON COLUMN inquiries.dfy_version_content IS 'DFY private version content (only visible to submitting DFY)';
COMMENT ON COLUMN inquiries.proposal_discussions IS 'Inline discussions on proposal content';


-- ============================================================================
-- Migration: 20241223000005_proposal_comments_rls.sql
-- ============================================================================

-- Migration: RLS policies for proposal comments
-- Must run AFTER 20241223000004 (enum value must be committed first)

-- Index for faster proposal comment queries
CREATE INDEX IF NOT EXISTS idx_inquiry_comments_proposal
  ON inquiry_comments(inquiry_id)
  WHERE comment_type = 'proposal';

-- Note: The existing admin policy already covers proposal comments because it uses:
-- "get_user_role() IN ('admin', 'internal')" without filtering by comment_type
-- So admin/internal can already CRUD all comment types including 'proposal'

-- DFY: can SELECT proposal comments on their own inquiries AFTER submission
DROP POLICY IF EXISTS "inquiry_comments_dfy_proposal_select" ON inquiry_comments;
CREATE POLICY "inquiry_comments_dfy_proposal_select" ON inquiry_comments
  FOR SELECT USING (
    comment_type = 'proposal'
    AND EXISTS (
      SELECT 1 FROM inquiries
      WHERE inquiries.id = inquiry_comments.inquiry_id
      AND inquiries.submitted_by = auth.uid()
      AND inquiries.proposal_submitted_at IS NOT NULL
    )
  );

-- DFY: can INSERT proposal comments on their own inquiries AFTER submission
DROP POLICY IF EXISTS "inquiry_comments_dfy_proposal_insert" ON inquiry_comments;
CREATE POLICY "inquiry_comments_dfy_proposal_insert" ON inquiry_comments
  FOR INSERT WITH CHECK (
    comment_type = 'proposal'
    AND author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM inquiries
      WHERE inquiries.id = inquiry_comments.inquiry_id
      AND inquiries.submitted_by = auth.uid()
      AND inquiries.proposal_submitted_at IS NOT NULL
    )
  );

-- DFY: can UPDATE their own proposal comments
DROP POLICY IF EXISTS "inquiry_comments_dfy_proposal_update" ON inquiry_comments;
CREATE POLICY "inquiry_comments_dfy_proposal_update" ON inquiry_comments
  FOR UPDATE USING (
    comment_type = 'proposal'
    AND author_id = auth.uid()
  );

-- DFY: can DELETE their own proposal comments
DROP POLICY IF EXISTS "inquiry_comments_dfy_proposal_delete" ON inquiry_comments;
CREATE POLICY "inquiry_comments_dfy_proposal_delete" ON inquiry_comments
  FOR DELETE USING (
    comment_type = 'proposal'
    AND author_id = auth.uid()
  );


-- ============================================================================
-- Migration: 20241224000001_proposal_deliverables.sql
-- ============================================================================

-- Phase 4.8: Deliverables Negotiation System
-- Migration 1: Create proposal_deliverables table

-- Enum for tracking change status during negotiation
CREATE TYPE deliverable_change_status AS ENUM (
  'original',      -- Parsed from proposal, unchanged
  'edited',        -- Modified by DFY
  'added',         -- New deliverable added by DFY
  'removed',       -- Marked for removal by DFY
  'approved',      -- INT approved the change
  'rejected',      -- INT rejected the change
  'countered'      -- INT provided counter-offer
);

-- Enum for tracking deliverable source
CREATE TYPE deliverable_source AS ENUM (
  'ai_parsed',      -- Extracted by AI from proposal
  'blueprint_tier', -- Added from blueprint tier
  'custom'          -- Manually added
);

-- Main deliverables table for negotiation
CREATE TABLE public.proposal_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,

  -- Content
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),

  -- Source tracking
  source deliverable_source DEFAULT 'custom',
  source_blueprint_id UUID REFERENCES blueprints(id),
  source_tier_name TEXT,

  -- AI parsing metadata
  ai_confidence DECIMAL(3,2),  -- 0.00-1.00 confidence score
  ai_source_text TEXT,          -- Original text from proposal

  -- Negotiation state
  change_status deliverable_change_status DEFAULT 'original',

  -- Original values (for diff display when edited)
  original_name TEXT,
  original_description TEXT,
  original_price DECIMAL(10,2),

  -- Counter-offer (when INT counters)
  counter_price DECIMAL(10,2),
  counter_note TEXT,

  -- Audit
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  sort_order INT DEFAULT 0
);

-- Indexes
CREATE INDEX idx_proposal_deliverables_inquiry ON proposal_deliverables(inquiry_id);
CREATE INDEX idx_proposal_deliverables_status ON proposal_deliverables(change_status);
CREATE INDEX idx_proposal_deliverables_source ON proposal_deliverables(source);

-- Comments
COMMENT ON TABLE proposal_deliverables IS 'Negotiated deliverables for inquiry proposals';
COMMENT ON COLUMN proposal_deliverables.ai_confidence IS 'AI parsing confidence score 0.00-1.00';
COMMENT ON COLUMN proposal_deliverables.change_status IS 'Current state in negotiation workflow';
COMMENT ON COLUMN proposal_deliverables.original_name IS 'Original name before DFY edit (for diff display)';


-- ============================================================================
-- Migration: 20241224000002_deliverable_comments.sql
-- ============================================================================

-- Phase 4.8: Deliverables Negotiation System
-- Migration 2: Create proposal_deliverable_comments table

CREATE TABLE public.proposal_deliverable_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID NOT NULL REFERENCES proposal_deliverables(id) ON DELETE CASCADE,

  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES profiles(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_deliverable_comments_deliverable ON proposal_deliverable_comments(deliverable_id);
CREATE INDEX idx_deliverable_comments_author ON proposal_deliverable_comments(author_id);

-- Comments
COMMENT ON TABLE proposal_deliverable_comments IS 'Per-deliverable discussion threads during negotiation';


-- ============================================================================
-- Migration: 20241224000003_project_requirements.sql
-- ============================================================================

-- Phase 4.8: Deliverables Negotiation System
-- Migration 3: Create project_requirements table for onboarding checklists

CREATE TYPE requirement_status AS ENUM (
  'pending',       -- Not yet provided
  'in_progress',   -- Being worked on
  'completed',     -- Provided/completed
  'blocked'        -- Waiting on something
);

CREATE TABLE public.project_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  description TEXT,
  status requirement_status DEFAULT 'pending',

  -- Optional: link to file upload when requirement is a document
  file_id UUID REFERENCES project_files(id),

  -- Response/completion tracking
  response TEXT,  -- For questions: the answer provided
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES profiles(id),

  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_project_requirements_project ON project_requirements(project_id);
CREATE INDEX idx_project_requirements_status ON project_requirements(status);

-- Comments
COMMENT ON TABLE project_requirements IS 'Onboarding checklist items for project setup';
COMMENT ON COLUMN project_requirements.response IS 'Answer or response for question-type requirements';


-- ============================================================================
-- Migration: 20241224000004_deliverables_rls.sql
-- ============================================================================

-- Phase 4.8: RLS policies for deliverables tables

-- Enable RLS
ALTER TABLE proposal_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_deliverable_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_requirements ENABLE ROW LEVEL SECURITY;

-- proposal_deliverables policies
DROP POLICY IF EXISTS "proposal_deliverables_select_policy" ON proposal_deliverables;
CREATE POLICY "proposal_deliverables_select_policy" ON proposal_deliverables
  FOR SELECT USING (true);  -- All authenticated users can read

DROP POLICY IF EXISTS "proposal_deliverables_insert_policy" ON proposal_deliverables;
CREATE POLICY "proposal_deliverables_insert_policy" ON proposal_deliverables
  FOR INSERT WITH CHECK (true);  -- Allow inserts (server actions use service role)

DROP POLICY IF EXISTS "proposal_deliverables_update_policy" ON proposal_deliverables;
CREATE POLICY "proposal_deliverables_update_policy" ON proposal_deliverables
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "proposal_deliverables_delete_policy" ON proposal_deliverables;
CREATE POLICY "proposal_deliverables_delete_policy" ON proposal_deliverables
  FOR DELETE USING (true);

-- proposal_deliverable_comments policies
DROP POLICY IF EXISTS "deliverable_comments_select_policy" ON proposal_deliverable_comments;
CREATE POLICY "deliverable_comments_select_policy" ON proposal_deliverable_comments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "deliverable_comments_insert_policy" ON proposal_deliverable_comments;
CREATE POLICY "deliverable_comments_insert_policy" ON proposal_deliverable_comments
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "deliverable_comments_delete_policy" ON proposal_deliverable_comments;
CREATE POLICY "deliverable_comments_delete_policy" ON proposal_deliverable_comments
  FOR DELETE USING (author_id = auth.uid());  -- Only author can delete

-- project_requirements policies
DROP POLICY IF EXISTS "project_requirements_select_policy" ON project_requirements;
CREATE POLICY "project_requirements_select_policy" ON project_requirements
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "project_requirements_insert_policy" ON project_requirements;
CREATE POLICY "project_requirements_insert_policy" ON project_requirements
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "project_requirements_update_policy" ON project_requirements;
CREATE POLICY "project_requirements_update_policy" ON project_requirements
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "project_requirements_delete_policy" ON project_requirements;
CREATE POLICY "project_requirements_delete_policy" ON project_requirements
  FOR DELETE USING (true);


-- ============================================================================
-- Migration: 20241224000004_inquiry_negotiation_columns.sql
-- ============================================================================

-- Phase 4.8: Deliverables Negotiation System
-- Migration 4: Add negotiation columns to inquiries table

-- Deliverables negotiation status enum
CREATE TYPE deliverables_negotiation_status AS ENUM (
  'none',           -- No deliverables table yet
  'parsing',        -- AI is extracting deliverables
  'dfy_editing',    -- DFY is editing
  'dfy_submitted',  -- DFY submitted for review
  'int_reviewing',  -- INT is reviewing
  'approved',       -- All approved, locked
  'needs_revision'  -- Sent back to DFY
);

-- Add deliverables negotiation tracking
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS
  deliverables_status deliverables_negotiation_status DEFAULT 'none';

-- Add closed deal tracking
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES profiles(id);
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS closed_notes TEXT;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS client_email TEXT;

-- Index for filtering by deliverables status
CREATE INDEX IF NOT EXISTS idx_inquiries_deliverables_status ON inquiries(deliverables_status);

-- Comments
COMMENT ON COLUMN inquiries.deliverables_status IS 'Negotiation workflow status for deliverables';
COMMENT ON COLUMN inquiries.closed_at IS 'When DFY marked the deal as closed';
COMMENT ON COLUMN inquiries.closed_notes IS 'Notes from DFY when closing the deal';
COMMENT ON COLUMN inquiries.client_email IS 'Client email for portal invitation';


-- ============================================================================
-- Migration: 20241224000005_project_source_inquiry.sql
-- ============================================================================

-- Phase 4.8: Deliverables Negotiation System
-- Migration 5: Add source_inquiry_id to projects table

-- Link project back to the inquiry it was converted from
ALTER TABLE projects ADD COLUMN IF NOT EXISTS
  source_inquiry_id UUID REFERENCES inquiries(id);

-- Index for finding projects by source inquiry
CREATE INDEX IF NOT EXISTS idx_projects_source_inquiry ON projects(source_inquiry_id);

-- Comment
COMMENT ON COLUMN projects.source_inquiry_id IS 'The inquiry this project was converted from (audit trail)';


-- ============================================================================
-- Migration: 20241224000006_negotiation_rls.sql
-- ============================================================================

-- Phase 4.8: Deliverables Negotiation System
-- Migration 6: RLS policies for new tables

-- Enable RLS on new tables
ALTER TABLE proposal_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_deliverable_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_requirements ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Helper function: can user access inquiry deliverables?
-- ============================================
CREATE OR REPLACE FUNCTION public.can_access_inquiry_deliverables(p_inquiry_id UUID)
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
    WHEN 'dfy' THEN EXISTS (
      SELECT 1 FROM inquiries WHERE id = p_inquiry_id AND submitted_by = v_user_id
    )
    ELSE FALSE
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- proposal_deliverables policies
-- ============================================

-- Everyone who can access the inquiry can view deliverables
DROP POLICY IF EXISTS "proposal_deliverables_select" ON proposal_deliverables;
CREATE POLICY "proposal_deliverables_select" ON proposal_deliverables
  FOR SELECT USING (can_access_inquiry_deliverables(inquiry_id));

-- Admin/internal have full access
DROP POLICY IF EXISTS "proposal_deliverables_admin_all" ON proposal_deliverables;
CREATE POLICY "proposal_deliverables_admin_all" ON proposal_deliverables
  FOR ALL USING (get_user_role() IN ('admin', 'internal'));

-- DFY can insert when in edit mode
DROP POLICY IF EXISTS "proposal_deliverables_dfy_insert" ON proposal_deliverables;
CREATE POLICY "proposal_deliverables_dfy_insert" ON proposal_deliverables
  FOR INSERT WITH CHECK (
    get_user_role() = 'dfy' AND
    can_access_inquiry_deliverables(inquiry_id) AND
    EXISTS (
      SELECT 1 FROM inquiries
      WHERE id = inquiry_id
      AND deliverables_status IN ('dfy_editing', 'needs_revision')
    )
  );

-- DFY can update when in edit mode
DROP POLICY IF EXISTS "proposal_deliverables_dfy_update" ON proposal_deliverables;
CREATE POLICY "proposal_deliverables_dfy_update" ON proposal_deliverables
  FOR UPDATE USING (
    get_user_role() = 'dfy' AND
    can_access_inquiry_deliverables(inquiry_id) AND
    EXISTS (
      SELECT 1 FROM inquiries
      WHERE id = inquiry_id
      AND deliverables_status IN ('dfy_editing', 'needs_revision')
    )
  );

-- DFY can delete (soft delete via status) when in edit mode
DROP POLICY IF EXISTS "proposal_deliverables_dfy_delete" ON proposal_deliverables;
CREATE POLICY "proposal_deliverables_dfy_delete" ON proposal_deliverables
  FOR DELETE USING (
    get_user_role() = 'dfy' AND
    can_access_inquiry_deliverables(inquiry_id) AND
    EXISTS (
      SELECT 1 FROM inquiries
      WHERE id = inquiry_id
      AND deliverables_status IN ('dfy_editing', 'needs_revision')
    )
  );

-- ============================================
-- proposal_deliverable_comments policies
-- ============================================

-- View comments if can access the parent deliverable
DROP POLICY IF EXISTS "deliverable_comments_select" ON proposal_deliverable_comments;
CREATE POLICY "deliverable_comments_select" ON proposal_deliverable_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM proposal_deliverables pd
      WHERE pd.id = deliverable_id AND can_access_inquiry_deliverables(pd.inquiry_id)
    )
  );

-- Insert comments if can access the parent deliverable
DROP POLICY IF EXISTS "deliverable_comments_insert" ON proposal_deliverable_comments;
CREATE POLICY "deliverable_comments_insert" ON proposal_deliverable_comments
  FOR INSERT WITH CHECK (
    author_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM proposal_deliverables pd
      WHERE pd.id = deliverable_id AND can_access_inquiry_deliverables(pd.inquiry_id)
    )
  );

-- Admin/internal can delete any comment
DROP POLICY IF EXISTS "deliverable_comments_admin_delete" ON proposal_deliverable_comments;
CREATE POLICY "deliverable_comments_admin_delete" ON proposal_deliverable_comments
  FOR DELETE USING (get_user_role() IN ('admin', 'internal'));

-- ============================================
-- project_requirements policies
-- ============================================

-- View requirements if can access the project
DROP POLICY IF EXISTS "project_requirements_select" ON project_requirements;
CREATE POLICY "project_requirements_select" ON project_requirements
  FOR SELECT USING (can_access_project(project_id));

-- Admin/internal have full access
DROP POLICY IF EXISTS "project_requirements_admin_all" ON project_requirements;
CREATE POLICY "project_requirements_admin_all" ON project_requirements
  FOR ALL USING (get_user_role() IN ('admin', 'internal'));

-- DFY can update status (mark as completed, add response)
DROP POLICY IF EXISTS "project_requirements_dfy_update" ON project_requirements;
CREATE POLICY "project_requirements_dfy_update" ON project_requirements
  FOR UPDATE USING (
    get_user_role() = 'dfy' AND
    can_access_project(project_id)
  );


-- ============================================================================
-- Migration: 20241225000001_dfy_update_policy.sql
-- ============================================================================

-- Allow DFY partners to update their own inquiries (specifically dfy_version_content)
DROP POLICY IF EXISTS "inquiries_dfy_update_own" ON inquiries;
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


-- ============================================================================
-- Migration: 20241225000002_add_sent_stage.sql
-- ============================================================================

-- Add 'sent' to proposal_stage enum
-- This stage auto-triggers when admin submits proposal to DFY partner

ALTER TYPE proposal_stage ADD VALUE IF NOT EXISTS 'sent' AFTER 'ready';


-- ============================================================================
-- Migration: 20241226000001_add_closed_lost_stages.sql
-- ============================================================================

-- Add 'closed' and 'lost' to proposal_stage enum
-- 'closed' = deal won, converted to project
-- 'lost' = deal lost, no conversion

ALTER TYPE proposal_stage ADD VALUE IF NOT EXISTS 'closed' AFTER 'sent';
ALTER TYPE proposal_stage ADD VALUE IF NOT EXISTS 'lost' AFTER 'closed';


-- ============================================================================
-- Migration: 20251224000001_deliverable_negotiation_v2.sql
-- ============================================================================

-- Phase 4.8.2: Deliverables Negotiation V2
-- Adds counter fields for name/description, version history, and multi-round negotiation

-- ============================================
-- 1. Add counter fields for name and description
-- ============================================
ALTER TABLE proposal_deliverables
ADD COLUMN IF NOT EXISTS counter_name TEXT,
ADD COLUMN IF NOT EXISTS counter_description TEXT;

COMMENT ON COLUMN proposal_deliverables.counter_name IS 'Admin counter-offer for name';
COMMENT ON COLUMN proposal_deliverables.counter_description IS 'Admin counter-offer for description';

-- ============================================
-- 2. Add new enum values for multi-round negotiation
-- ============================================
-- Postgres enums can't easily be altered, so we add new values
ALTER TYPE deliverable_change_status ADD VALUE IF NOT EXISTS 'counter_accepted';
ALTER TYPE deliverable_change_status ADD VALUE IF NOT EXISTS 'counter_rejected';

-- ============================================
-- 3. Create version history table
-- ============================================
CREATE TABLE IF NOT EXISTS proposal_deliverable_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID NOT NULL REFERENCES proposal_deliverables(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,

  -- State snapshot at this version
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  change_status TEXT,

  -- Counter values (if this was a counter action)
  counter_name TEXT,
  counter_description TEXT,
  counter_price DECIMAL(10,2),
  counter_note TEXT,

  -- Audit info
  action TEXT NOT NULL,
  -- Actions: 'created' | 'dfy_edited' | 'dfy_removed' | 'dfy_added' |
  --          'int_approved' | 'int_rejected' | 'int_countered' |
  --          'dfy_accepted_counter' | 'dfy_rejected_counter' | 'reverted'
  actor_id UUID REFERENCES profiles(id),
  actor_role TEXT NOT NULL CHECK (actor_role IN ('dfy', 'admin', 'system')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_deliverable_version UNIQUE(deliverable_id, version)
);

-- Indexes for history table
CREATE INDEX IF NOT EXISTS idx_deliverable_history_deliverable
ON proposal_deliverable_history(deliverable_id);

CREATE INDEX IF NOT EXISTS idx_deliverable_history_created
ON proposal_deliverable_history(created_at DESC);

-- Comments
COMMENT ON TABLE proposal_deliverable_history IS 'Version history for deliverable changes during negotiation';
COMMENT ON COLUMN proposal_deliverable_history.version IS 'Sequential version number starting at 1';
COMMENT ON COLUMN proposal_deliverable_history.action IS 'Type of action that created this version';
COMMENT ON COLUMN proposal_deliverable_history.actor_role IS 'Role of user who made the change: dfy, admin, or system';

-- ============================================
-- 4. RLS Policies for history table
-- ============================================
ALTER TABLE proposal_deliverable_history ENABLE ROW LEVEL SECURITY;

-- Everyone can read history (same visibility as deliverables)
DROP POLICY IF EXISTS "history_select_all" ON proposal_deliverable_history;
CREATE POLICY "history_select_all" ON proposal_deliverable_history
FOR SELECT USING (true);

-- Authenticated users can insert history (controlled at app layer)
DROP POLICY IF EXISTS "history_insert_authenticated" ON proposal_deliverable_history;
CREATE POLICY "history_insert_authenticated" ON proposal_deliverable_history
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- No updates or deletes - history is append-only
-- (Postgres will deny by default without policies)


-- ============================================================================
-- Migration: 20251225000001_profile_logo.sql
-- ============================================================================

-- Add logo_url column to profiles for DFY partner branding
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS logo_url TEXT;

COMMENT ON COLUMN profiles.logo_url IS 'URL to DFY partner logo for branded proposals';


-- ============================================================================
-- Migration: 20251225000002_project_signoff_statuses.sql
-- ============================================================================

-- Add new project statuses for deliverables sign-off flow
-- Flow: deliverables_pending → awaiting_signoff → signed_off → collecting_access → ...

-- Add new enum values (PostgreSQL requires adding after existing values)
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'deliverables_pending' AFTER 'committed';
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'awaiting_signoff' AFTER 'deliverables_pending';
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'signed_off' AFTER 'awaiting_signoff';

-- Add sign-off tracking columns to projects
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS deliverables_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deliverables_confirmed_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS signoff_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signoff_sent_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS signed_off_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signed_off_by UUID REFERENCES profiles(id);

COMMENT ON COLUMN projects.deliverables_confirmed_at IS 'When admin confirmed final deliverables';
COMMENT ON COLUMN projects.signoff_sent_at IS 'When admin sent deliverables for DFY sign-off';
COMMENT ON COLUMN projects.signed_off_at IS 'When DFY signed off on behalf of client';


-- ============================================================================
-- Migration: 20251225000003_advanced_requirements.sql
-- ============================================================================

-- Advanced Requirements System
-- Add assignment and dependency features to requirements

-- Add assignment columns to project_requirements
ALTER TABLE project_requirements
  ADD COLUMN assigned_role TEXT DEFAULT 'admin' CHECK (assigned_role IN ('admin', 'client')),
  ADD COLUMN assigned_to UUID REFERENCES profiles(id);

-- Dependencies junction table (blocker/prerequisite relationships)
CREATE TABLE public.requirement_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID NOT NULL REFERENCES project_requirements(id) ON DELETE CASCADE,
  depends_on_id UUID NOT NULL REFERENCES project_requirements(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent self-references and duplicates
  CONSTRAINT no_self_dependency CHECK (requirement_id != depends_on_id),
  CONSTRAINT unique_dependency UNIQUE (requirement_id, depends_on_id)
);

-- Indexes for efficient querying
CREATE INDEX idx_req_deps_requirement ON requirement_dependencies(requirement_id);
CREATE INDEX idx_req_deps_depends_on ON requirement_dependencies(depends_on_id);
CREATE INDEX idx_project_requirements_role ON project_requirements(assigned_role);
CREATE INDEX idx_project_requirements_assigned_to ON project_requirements(assigned_to);

-- Enable realtime for requirements and dependencies
ALTER PUBLICATION supabase_realtime ADD TABLE project_requirements;
ALTER PUBLICATION supabase_realtime ADD TABLE requirement_dependencies;

-- Comments
COMMENT ON COLUMN project_requirements.assigned_role IS 'Who should complete this: admin (internal team) or client';
COMMENT ON COLUMN project_requirements.assigned_to IS 'Specific user assigned (optional, for notifications)';
COMMENT ON TABLE requirement_dependencies IS 'Tracks blocker/prerequisite relationships between requirements';


-- ============================================================================
-- Migration: 20251225000004_requirements_deps_rls.sql
-- ============================================================================

-- RLS policies for requirement_dependencies table

-- Enable RLS
ALTER TABLE requirement_dependencies ENABLE ROW LEVEL SECURITY;

-- Simple policies (following existing pattern - server actions use service role)
DROP POLICY IF EXISTS "requirement_dependencies_select_policy" ON requirement_dependencies;
CREATE POLICY "requirement_dependencies_select_policy" ON requirement_dependencies
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "requirement_dependencies_insert_policy" ON requirement_dependencies;
CREATE POLICY "requirement_dependencies_insert_policy" ON requirement_dependencies
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "requirement_dependencies_update_policy" ON requirement_dependencies;
CREATE POLICY "requirement_dependencies_update_policy" ON requirement_dependencies
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "requirement_dependencies_delete_policy" ON requirement_dependencies;
CREATE POLICY "requirement_dependencies_delete_policy" ON requirement_dependencies
  FOR DELETE USING (true);


-- ============================================================================
-- Migration: 20251231000001_project_financial_fields.sql
-- ============================================================================

-- Project Financial Fields Migration
-- Adds comprehensive pricing structure, lifecycle dates, and retainer fields
-- to both projects and inquiries tables

-- ============================================================================
-- NEW ENUMS
-- ============================================================================

CREATE TYPE retainer_plan AS ENUM ('one_time', 'monthly', 'quarterly', 'annual');
CREATE TYPE software_payer AS ENUM ('hexona', 'client');

-- ============================================================================
-- PROJECTS TABLE CHANGES
-- ============================================================================

-- Rename existing columns for consistency
ALTER TABLE projects RENAME COLUMN quoted_price TO price_dfy;
ALTER TABLE projects RENAME COLUMN dev_cost TO price_dev;

-- Add new pricing column (what Hexona charges DFY partner)
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS price_hexona DECIMAL(10,2);

-- Add retainer fields
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS retainer_plan retainer_plan DEFAULT 'one_time',
  ADD COLUMN IF NOT EXISTS retainer_date DATE;

-- Add software payer field
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS software_payer software_payer DEFAULT 'client';

-- Add lifecycle date fields for tracking project timeline
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS date_inquiry TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS date_proposal_sent TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS date_closed TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS date_onboarding TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS date_delivered TIMESTAMPTZ;

-- Add column comments for documentation
COMMENT ON COLUMN projects.price_dfy IS 'What the client pays (DFY quoted price)';
COMMENT ON COLUMN projects.price_hexona IS 'What Hexona charges the DFY partner (fulfillment cost)';
COMMENT ON COLUMN projects.price_dev IS 'What Hexona pays the developer';
COMMENT ON COLUMN projects.retainer_plan IS 'Retainer billing cycle type';
COMMENT ON COLUMN projects.retainer_date IS 'Next retainer renewal date';
COMMENT ON COLUMN projects.software_payer IS 'Who pays for software/tool costs';
COMMENT ON COLUMN projects.date_inquiry IS 'When the initial inquiry was received';
COMMENT ON COLUMN projects.date_proposal_sent IS 'When proposal was sent to client';
COMMENT ON COLUMN projects.date_closed IS 'When the deal was closed/won';
COMMENT ON COLUMN projects.date_onboarding IS 'When client onboarding started';
COMMENT ON COLUMN projects.date_delivered IS 'When the project was delivered';

-- ============================================================================
-- INQUIRIES TABLE CHANGES
-- ============================================================================

-- Rename estimated_value to price_dfy for consistency
ALTER TABLE inquiries RENAME COLUMN estimated_value TO price_dfy;

-- Add other pricing fields
ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS price_hexona DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS price_dev DECIMAL(10,2);

-- Add early-stage date fields (inquiry and proposal stages only)
ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS date_inquiry TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS date_proposal_sent TIMESTAMPTZ;

-- Add column comments
COMMENT ON COLUMN inquiries.price_dfy IS 'What the client pays (estimated deal value)';
COMMENT ON COLUMN inquiries.price_hexona IS 'What Hexona charges the DFY partner';
COMMENT ON COLUMN inquiries.price_dev IS 'Estimated developer cost';
COMMENT ON COLUMN inquiries.date_inquiry IS 'When the inquiry was submitted';
COMMENT ON COLUMN inquiries.date_proposal_sent IS 'When proposal was sent';


-- ============================================================================
-- Migration: 20260101000001_onboarding_requirements.sql
-- ============================================================================

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
DROP POLICY IF EXISTS "onboarding_requirements_admin_all" ON onboarding_requirements;
CREATE POLICY "onboarding_requirements_admin_all" ON onboarding_requirements
  FOR ALL USING (auth.uid() IS NOT NULL AND get_user_role() IN ('admin', 'internal'));

-- Anyone who can access project can view requirements
DROP POLICY IF EXISTS "onboarding_requirements_select_via_project" ON onboarding_requirements;
CREATE POLICY "onboarding_requirements_select_via_project" ON onboarding_requirements
  FOR SELECT USING (auth.uid() IS NOT NULL AND can_access_project(project_id));

-- DFY can update their owned requirements (where owner_type = 'dfy')
DROP POLICY IF EXISTS "onboarding_requirements_dfy_update" ON onboarding_requirements;
CREATE POLICY "onboarding_requirements_dfy_update" ON onboarding_requirements
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND get_user_role() = 'dfy'
    AND can_access_project(project_id)
    AND owner_type = 'dfy'
  );

-- Client can update their owned requirements (where owner_type = 'client')
DROP POLICY IF EXISTS "onboarding_requirements_client_update" ON onboarding_requirements;
CREATE POLICY "onboarding_requirements_client_update" ON onboarding_requirements
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND get_user_role() = 'client'
    AND can_access_project(project_id)
    AND owner_type = 'client'
  );

-- REQUIREMENT_ATTACHMENTS POLICIES

-- Admin/Internal have full access
DROP POLICY IF EXISTS "requirement_attachments_admin_all" ON requirement_attachments;
CREATE POLICY "requirement_attachments_admin_all" ON requirement_attachments
  FOR ALL USING (auth.uid() IS NOT NULL AND get_user_role() IN ('admin', 'internal'));

-- Anyone who can access the parent requirement can view attachments
DROP POLICY IF EXISTS "requirement_attachments_select_via_requirement" ON requirement_attachments;
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
DROP POLICY IF EXISTS "requirement_attachments_dfy_insert" ON requirement_attachments;
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
DROP POLICY IF EXISTS "requirement_attachments_client_insert" ON requirement_attachments;
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
DROP POLICY IF EXISTS "requirement_templates_select_authenticated" ON requirement_templates;
CREATE POLICY "requirement_templates_select_authenticated" ON requirement_templates
  FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = true);

-- Only admin can manage templates
DROP POLICY IF EXISTS "requirement_templates_admin_all" ON requirement_templates;
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


-- ============================================================================
-- Migration: 20260102000001_hierarchical_templates.sql
-- ============================================================================

-- Hierarchical Templates Migration
-- Adds parent_id and position to support nested template trees

-- ============================================================================
-- SCHEMA CHANGES
-- ============================================================================

-- Add new columns to requirement_templates
ALTER TABLE requirement_templates
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES requirement_templates(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS position INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS default_blocker requirement_blocker DEFAULT 'none';

-- Index for parent lookups
CREATE INDEX IF NOT EXISTS idx_requirement_templates_parent ON requirement_templates(parent_id);

-- ============================================================================
-- GHL SETUP HIERARCHY (WAGHL Flow)
-- ============================================================================

-- Remove old templates
DELETE FROM requirement_templates WHERE name IN ('WAGHL Setup', 'GHL Setup');

-- Create GHL Setup hierarchy
-- Flow: GHL Setup (Hexona) -> Add Billing (DFY) -> Add WAGHL (Hexona) -> Add WAGHL Billing (Client)
DO $$
DECLARE
  ghl_id UUID;
BEGIN
  -- Root: GHL Setup (Hexona)
  INSERT INTO requirement_templates (name, description, default_owner, default_blocker, category, position)
  VALUES (
    'GHL Setup',
    'Complete GoHighLevel + WhatsApp integration setup',
    'hexona',
    'absolute',
    'setup',
    0
  )
  RETURNING id INTO ghl_id;

  -- Child 1: Add Billing to Hexona (DFY)
  INSERT INTO requirement_templates (name, description, default_owner, default_blocker, category, parent_id, position)
  VALUES (
    'Add Billing to Hexona',
    'DFY partner adds billing/payment method to Hexona account',
    'dfy',
    'absolute',
    'setup',
    ghl_id,
    0
  );

  -- Child 2: Add WAGHL (Hexona)
  INSERT INTO requirement_templates (name, description, default_owner, default_blocker, category, parent_id, position)
  VALUES (
    'Add WAGHL',
    'Hexona configures WhatsApp + GoHighLevel integration',
    'hexona',
    'absolute',
    'setup',
    ghl_id,
    1
  );

  -- Child 3: Add WAGHL Billing (Client)
  INSERT INTO requirement_templates (name, description, default_owner, default_blocker, category, parent_id, position)
  VALUES (
    'Add WAGHL Billing',
    'Client sets up billing for WAGHL service',
    'client',
    'absolute',
    'setup',
    ghl_id,
    2
  );
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this to verify the hierarchy:
-- SELECT t1.name as parent, t2.name as child, t3.name as grandchild
-- FROM requirement_templates t1
-- LEFT JOIN requirement_templates t2 ON t2.parent_id = t1.id
-- LEFT JOIN requirement_templates t3 ON t3.parent_id = t2.id
-- WHERE t1.name = 'WAGHL Setup';


-- ============================================================================
-- Migration: 20260102000002_unique_source_inquiry.sql
-- ============================================================================

-- Migration: Prevent duplicate project creation from same inquiry
-- This migration:
-- 1. Cleans up any existing duplicate projects (keeps the one linked to inquiry)
-- 2. Adds UNIQUE constraint on source_inquiry_id to prevent future duplicates

-- Step 1: Delete orphan projects (projects that are NOT linked back from their source inquiry)
-- The ON DELETE CASCADE on related tables will clean up deliverables, requirements, etc.
DELETE FROM projects
WHERE source_inquiry_id IS NOT NULL
  AND id NOT IN (
    SELECT converted_to_project_id
    FROM inquiries
    WHERE converted_to_project_id IS NOT NULL
  );

-- Step 2: Add unique constraint to prevent future duplicates
-- This ensures only one project can be created per inquiry
ALTER TABLE projects
  ADD CONSTRAINT unique_source_inquiry_id UNIQUE (source_inquiry_id);

-- Add comment for documentation
COMMENT ON CONSTRAINT unique_source_inquiry_id ON projects IS
  'Ensures only one project can be created from each inquiry';


-- ============================================================================
-- Migration: 20260103000001_conversations_system.sql
-- ============================================================================

-- hexOS Conversations System Migration
-- Creates tables for project chat rooms with real-time messaging, attachments, reactions, and mentions

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE conversation_type AS ENUM ('project', 'workspace', 'partner');

-- ============================================================================
-- TABLES
-- ============================================================================

-- Conversations - One record per chat room per project
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type conversation_type NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, type)
);

-- Messages - Individual chat messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message Attachments - Files attached to messages
CREATE TABLE public.message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message Reactions - Emoji reactions on messages
CREATE TABLE public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- Message Mentions - @mentions for notifications
CREATE TABLE public.message_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, mentioned_user_id)
);

-- Conversation Read Status - Track unread messages per user
CREATE TABLE public.conversation_read_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  UNIQUE(conversation_id, user_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_conversations_project_id ON conversations(project_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_not_deleted ON messages(conversation_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_message_attachments_message_id ON message_attachments(message_id);
CREATE INDEX idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX idx_message_mentions_message_id ON message_mentions(message_id);
CREATE INDEX idx_message_mentions_user_id ON message_mentions(mentioned_user_id);
CREATE INDEX idx_conversation_read_status_user_id ON conversation_read_status(user_id);
CREATE INDEX idx_conversation_read_status_conversation_id ON conversation_read_status(conversation_id);

-- ============================================================================
-- HELPER FUNCTION: can_access_conversation
-- ============================================================================

CREATE OR REPLACE FUNCTION public.can_access_conversation(p_conversation_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role user_role;
  v_user_id UUID;
  v_project_id UUID;
  v_conv_type conversation_type;
BEGIN
  v_user_id := auth.uid();
  v_user_role := public.get_user_role();

  -- Get conversation details
  SELECT project_id, type INTO v_project_id, v_conv_type
  FROM conversations WHERE id = p_conversation_id;

  IF v_project_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check project access first
  IF NOT public.can_access_project(v_project_id) THEN
    RETURN FALSE;
  END IF;

  -- Check conversation type access based on role
  RETURN CASE v_conv_type
    -- Project chat: everyone with project access
    WHEN 'project' THEN TRUE
    -- Workspace chat: admin, internal, dev only
    WHEN 'workspace' THEN v_user_role IN ('admin', 'internal', 'dev')
    -- Partner chat: admin, internal, dfy only
    WHEN 'partner' THEN v_user_role IN ('admin', 'internal', 'dfy')
    ELSE FALSE
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.can_access_conversation IS
  'Check if current user can access a conversation based on project access and conversation type';

-- ============================================================================
-- TRIGGER: Auto-create conversations when project is created
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_project_conversations()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO conversations (project_id, type)
  VALUES
    (NEW.id, 'project'),
    (NEW.id, 'workspace'),
    (NEW.id, 'partner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER projects_create_conversations
  AFTER INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION create_project_conversations();

COMMENT ON TRIGGER projects_create_conversations ON projects IS
  'Automatically create three conversation rooms (project, workspace, partner) when a project is created';

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_read_status ENABLE ROW LEVEL SECURITY;

-- CONVERSATIONS POLICIES
DROP POLICY IF EXISTS "conversations_select" ON conversations;
CREATE POLICY "conversations_select" ON conversations
  FOR SELECT USING (can_access_conversation(id));

-- MESSAGES POLICIES
DROP POLICY IF EXISTS "messages_select" ON messages;
CREATE POLICY "messages_select" ON messages
  FOR SELECT USING (can_access_conversation(conversation_id));

DROP POLICY IF EXISTS "messages_insert" ON messages;
CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK (
    can_access_conversation(conversation_id) AND
    sender_id = auth.uid()
  );

-- Update own messages only (for edit)
DROP POLICY IF EXISTS "messages_update_own" ON messages;
CREATE POLICY "messages_update_own" ON messages
  FOR UPDATE USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- MESSAGE ATTACHMENTS POLICIES
DROP POLICY IF EXISTS "message_attachments_select" ON message_attachments;
CREATE POLICY "message_attachments_select" ON message_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_id AND can_access_conversation(m.conversation_id)
    )
  );

DROP POLICY IF EXISTS "message_attachments_insert" ON message_attachments;
CREATE POLICY "message_attachments_insert" ON message_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_id
        AND m.sender_id = auth.uid()
        AND can_access_conversation(m.conversation_id)
    )
  );

DROP POLICY IF EXISTS "message_attachments_delete_own" ON message_attachments;
CREATE POLICY "message_attachments_delete_own" ON message_attachments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_id AND m.sender_id = auth.uid()
    )
  );

-- MESSAGE REACTIONS POLICIES
DROP POLICY IF EXISTS "message_reactions_select" ON message_reactions;
CREATE POLICY "message_reactions_select" ON message_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_id AND can_access_conversation(m.conversation_id)
    )
  );

DROP POLICY IF EXISTS "message_reactions_insert" ON message_reactions;
CREATE POLICY "message_reactions_insert" ON message_reactions
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_id AND can_access_conversation(m.conversation_id)
    )
  );

DROP POLICY IF EXISTS "message_reactions_delete_own" ON message_reactions;
CREATE POLICY "message_reactions_delete_own" ON message_reactions
  FOR DELETE USING (user_id = auth.uid());

-- MESSAGE MENTIONS POLICIES
DROP POLICY IF EXISTS "message_mentions_select" ON message_mentions;
CREATE POLICY "message_mentions_select" ON message_mentions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_id AND can_access_conversation(m.conversation_id)
    )
  );

DROP POLICY IF EXISTS "message_mentions_insert" ON message_mentions;
CREATE POLICY "message_mentions_insert" ON message_mentions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_id
        AND m.sender_id = auth.uid()
        AND can_access_conversation(m.conversation_id)
    )
  );

-- CONVERSATION READ STATUS POLICIES
DROP POLICY IF EXISTS "conversation_read_status_select_own" ON conversation_read_status;
CREATE POLICY "conversation_read_status_select_own" ON conversation_read_status
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "conversation_read_status_insert" ON conversation_read_status;
CREATE POLICY "conversation_read_status_insert" ON conversation_read_status
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND can_access_conversation(conversation_id)
  );

DROP POLICY IF EXISTS "conversation_read_status_update_own" ON conversation_read_status;
CREATE POLICY "conversation_read_status_update_own" ON conversation_read_status
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- REALTIME PUBLICATION
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;

-- ============================================================================
-- STORAGE BUCKET (run manually in Supabase dashboard if needed)
-- ============================================================================

-- Note: Storage bucket creation may need to be done via Supabase dashboard
-- Bucket name: message-attachments
-- Public: false (use signed URLs)

-- CREATE POLICY storage policies via dashboard:
-- INSERT: auth.role() = 'authenticated'
-- SELECT: auth.role() = 'authenticated'
-- DELETE: auth.role() = 'authenticated'

-- ============================================================================
-- BACKFILL: Create conversations for existing projects
-- ============================================================================

INSERT INTO conversations (project_id, type)
SELECT p.id, t.type
FROM projects p
CROSS JOIN (VALUES ('project'::conversation_type), ('workspace'::conversation_type), ('partner'::conversation_type)) AS t(type)
WHERE NOT EXISTS (
  SELECT 1 FROM conversations c
  WHERE c.project_id = p.id AND c.type = t.type
)
ON CONFLICT (project_id, type) DO NOTHING;


-- ============================================================================
-- Migration: 20260103000002_conversations_dm_inquiry.sql
-- ============================================================================

-- Migration: Add Direct Messages and Inquiry Conversations
-- Extends the conversations system to support:
-- 1. Direct messages between users (not tied to projects)
-- 2. Inquiry/proposal conversations

-- ============================================================================
-- UPDATE CONVERSATION TYPE ENUM
-- ============================================================================

-- Add new conversation types
ALTER TYPE conversation_type ADD VALUE IF NOT EXISTS 'direct';
ALTER TYPE conversation_type ADD VALUE IF NOT EXISTS 'inquiry';

-- ============================================================================
-- MODIFY CONVERSATIONS TABLE
-- ============================================================================

-- Make project_id nullable for direct conversations
ALTER TABLE conversations ALTER COLUMN project_id DROP NOT NULL;

-- Add inquiry_id for inquiry conversations
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS inquiry_id UUID REFERENCES inquiries(id) ON DELETE CASCADE;

-- Add title for direct conversations (e.g., group chat names)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS title TEXT;

-- Update unique constraint to handle new types
-- Drop the original unique constraint (this was created as UNIQUE(project_id, type))
DO $$
BEGIN
  -- Try to drop as constraint first
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'conversations_project_id_type_key'
    AND table_name = 'conversations'
  ) THEN
    ALTER TABLE conversations DROP CONSTRAINT conversations_project_id_type_key;
  END IF;
END $$;

-- Create new partial unique index for project conversations only
CREATE UNIQUE INDEX IF NOT EXISTS conversations_project_type_unique
  ON conversations(project_id, type)
  WHERE project_id IS NOT NULL AND type IN ('project', 'workspace', 'partner');

CREATE UNIQUE INDEX IF NOT EXISTS conversations_inquiry_unique
  ON conversations(inquiry_id)
  WHERE inquiry_id IS NOT NULL;

-- ============================================================================
-- DIRECT CONVERSATION PARTICIPANTS
-- ============================================================================

-- For direct messages, track who is in each conversation
CREATE TABLE IF NOT EXISTS direct_conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX idx_direct_participants_conversation ON direct_conversation_participants(conversation_id);
CREATE INDEX idx_direct_participants_user ON direct_conversation_participants(user_id);

-- ============================================================================
-- UPDATE RLS HELPER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.can_access_conversation(p_conversation_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role user_role;
  v_user_id UUID;
  v_project_id UUID;
  v_inquiry_id UUID;
  v_conv_type conversation_type;
BEGIN
  v_user_id := auth.uid();
  v_user_role := public.get_user_role();

  -- Get conversation details
  SELECT project_id, inquiry_id, type INTO v_project_id, v_inquiry_id, v_conv_type
  FROM conversations WHERE id = p_conversation_id;

  -- Direct conversation: check if user is a participant
  IF v_conv_type = 'direct' THEN
    RETURN EXISTS (
      SELECT 1 FROM direct_conversation_participants
      WHERE conversation_id = p_conversation_id AND user_id = v_user_id
    );
  END IF;

  -- Inquiry conversation: check if user is involved with the inquiry
  IF v_conv_type = 'inquiry' THEN
    RETURN EXISTS (
      SELECT 1 FROM inquiries i
      WHERE i.id = v_inquiry_id
        AND (
          -- Admin/internal can see all
          v_user_role IN ('admin', 'internal')
          -- DFY partner who submitted
          OR i.submitted_by = v_user_id
          -- Assigned dev
          OR i.assigned_dev_id = v_user_id
        )
    );
  END IF;

  -- Project conversations: existing logic
  IF v_project_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF NOT public.can_access_project(v_project_id) THEN
    RETURN FALSE;
  END IF;

  RETURN CASE v_conv_type
    WHEN 'project' THEN TRUE
    WHEN 'workspace' THEN v_user_role IN ('admin', 'internal', 'dev')
    WHEN 'partner' THEN v_user_role IN ('admin', 'internal', 'dfy')
    ELSE FALSE
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- RLS FOR DIRECT PARTICIPANTS
-- ============================================================================

ALTER TABLE direct_conversation_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "direct_participants_select" ON direct_conversation_participants;
CREATE POLICY "direct_participants_select" ON direct_conversation_participants
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM direct_conversation_participants dcp
      WHERE dcp.conversation_id = direct_conversation_participants.conversation_id
        AND dcp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "direct_participants_insert" ON direct_conversation_participants;
CREATE POLICY "direct_participants_insert" ON direct_conversation_participants
  FOR INSERT WITH CHECK (
    -- Can add participants to conversations you're in, or create new ones
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM direct_conversation_participants dcp
      WHERE dcp.conversation_id = direct_conversation_participants.conversation_id
        AND dcp.user_id = auth.uid()
    )
  );

-- ============================================================================
-- TRIGGER: Auto-create conversation for inquiries
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_inquiry_conversation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO conversations (inquiry_id, type)
  VALUES (NEW.id, 'inquiry')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS inquiries_create_conversation ON inquiries;
CREATE TRIGGER inquiries_create_conversation
  AFTER INSERT ON inquiries
  FOR EACH ROW EXECUTE FUNCTION create_inquiry_conversation();

-- ============================================================================
-- BACKFILL: Create conversations for existing inquiries
-- ============================================================================

INSERT INTO conversations (inquiry_id, type)
SELECT id, 'inquiry'::conversation_type
FROM inquiries
WHERE NOT EXISTS (
  SELECT 1 FROM conversations c WHERE c.inquiry_id = inquiries.id
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- ADD REALTIME FOR DIRECT PARTICIPANTS
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE direct_conversation_participants;


-- ============================================================================
-- Migration: 20260103000003_project_files_visibility.sql
-- ============================================================================

-- Add visibility and description columns to project_files
-- Visibility controls who can see files: workspace (internal only) or portal (shared with DFY/Client)

-- Add columns
ALTER TABLE project_files
ADD COLUMN visibility TEXT NOT NULL DEFAULT 'workspace'
CHECK (visibility IN ('workspace', 'portal'));

ALTER TABLE project_files
ADD COLUMN description TEXT;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "project_files_access_via_project" ON project_files;
DROP POLICY IF EXISTS "project_files_admin_all" ON project_files;
DROP POLICY IF EXISTS "project_files_insert_authenticated" ON project_files;

-- Admin/Internal see all files on accessible projects
DROP POLICY IF EXISTS "project_files_admin_internal_select" ON project_files;
CREATE POLICY "project_files_admin_internal_select" ON project_files
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND get_user_role() IN ('admin', 'internal')
    AND can_access_project(project_id)
  );

-- Dev sees all files on assigned projects
DROP POLICY IF EXISTS "project_files_dev_select" ON project_files;
CREATE POLICY "project_files_dev_select" ON project_files
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND get_user_role() = 'dev'
    AND can_access_project(project_id)
  );

-- DFY/Client only see portal files
DROP POLICY IF EXISTS "project_files_dfy_client_select" ON project_files;
CREATE POLICY "project_files_dfy_client_select" ON project_files
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND get_user_role() IN ('dfy', 'client')
    AND can_access_project(project_id)
    AND visibility = 'portal'
  );

-- Insert: Anyone with project access can upload
DROP POLICY IF EXISTS "project_files_insert" ON project_files;
CREATE POLICY "project_files_insert" ON project_files
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND can_access_project(project_id)
  );

-- Update: Admin/Internal can change any file, others can only update their own
DROP POLICY IF EXISTS "project_files_admin_internal_update" ON project_files;
CREATE POLICY "project_files_admin_internal_update" ON project_files
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND get_user_role() IN ('admin', 'internal')
    AND can_access_project(project_id)
  );

DROP POLICY IF EXISTS "project_files_own_update" ON project_files;
CREATE POLICY "project_files_own_update" ON project_files
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND uploaded_by = auth.uid()
    AND can_access_project(project_id)
  );

-- Delete: Own files OR admin/internal
DROP POLICY IF EXISTS "project_files_admin_internal_delete" ON project_files;
CREATE POLICY "project_files_admin_internal_delete" ON project_files
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND get_user_role() IN ('admin', 'internal')
    AND can_access_project(project_id)
  );

DROP POLICY IF EXISTS "project_files_own_delete" ON project_files;
CREATE POLICY "project_files_own_delete" ON project_files
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND uploaded_by = auth.uid()
    AND can_access_project(project_id)
  );


-- ============================================================================
-- Migration: 20260103000004_performance_indexes.sql
-- ============================================================================

-- Add missing indexes to foreign keys in project_files for performance
CREATE INDEX IF NOT EXISTS idx_project_files_deliverable_id ON public.project_files(deliverable_id);
CREATE INDEX IF NOT EXISTS idx_project_files_uploaded_by ON public.project_files(uploaded_by);


-- ============================================================================
-- Migration: 20260103000005_project_files_folders.sql
-- ============================================================================

-- hexOS Files Tab: Nested Folders Migration
-- Adds parent_id, content_type, content, position columns and auto-creates default folders

-- Schema changes
ALTER TABLE project_files ADD COLUMN parent_id UUID REFERENCES project_files(id) ON DELETE CASCADE;
ALTER TABLE project_files ADD COLUMN content_type TEXT NOT NULL DEFAULT 'file' CHECK (content_type IN ('file', 'folder', 'document', 'whiteboard'));
ALTER TABLE project_files ADD COLUMN content JSONB;
ALTER TABLE project_files ADD COLUMN position INT DEFAULT 0;
ALTER TABLE inquiries ADD COLUMN proposal_whiteboard JSONB;

-- Indexes
CREATE INDEX idx_project_files_parent_id ON project_files(parent_id);
CREATE INDEX idx_project_files_position ON project_files(project_id, parent_id, position);
CREATE INDEX idx_project_files_content_type ON project_files(content_type);

-- Helper function: Get effective visibility
CREATE OR REPLACE FUNCTION public.get_effective_file_visibility(p_file_id UUID) RETURNS TEXT AS $$
DECLARE
  v_visibility TEXT;
  v_parent_id UUID;
BEGIN
  SELECT visibility, parent_id INTO v_visibility, v_parent_id FROM project_files WHERE id = p_file_id;
  IF v_visibility IS NOT NULL THEN RETURN v_visibility; END IF;
  IF v_parent_id IS NOT NULL THEN RETURN get_effective_file_visibility(v_parent_id); END IF;
  RETURN 'workspace';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function: Check file access
CREATE OR REPLACE FUNCTION public.can_access_file(p_file_id UUID) RETURNS BOOLEAN AS $$
DECLARE
  v_user_role user_role;
  v_project_id UUID;
  v_effective_visibility TEXT;
BEGIN
  v_user_role := public.get_user_role();
  SELECT project_id INTO v_project_id FROM project_files WHERE id = p_file_id;
  IF v_project_id IS NULL THEN RETURN FALSE; END IF;
  IF NOT public.can_access_project(v_project_id) THEN RETURN FALSE; END IF;
  IF v_user_role IN ('admin', 'internal', 'dev') THEN RETURN TRUE; END IF;
  v_effective_visibility := get_effective_file_visibility(p_file_id);
  RETURN v_effective_visibility = 'portal';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Drop old RLS policies
DROP POLICY IF EXISTS "project_files_admin_internal_select" ON project_files;
DROP POLICY IF EXISTS "project_files_dev_select" ON project_files;
DROP POLICY IF EXISTS "project_files_dfy_client_select" ON project_files;
DROP POLICY IF EXISTS "project_files_insert" ON project_files;
DROP POLICY IF EXISTS "project_files_admin_internal_update" ON project_files;
DROP POLICY IF EXISTS "project_files_own_update" ON project_files;
DROP POLICY IF EXISTS "project_files_admin_internal_delete" ON project_files;
DROP POLICY IF EXISTS "project_files_own_delete" ON project_files;

-- New RLS policies
DROP POLICY IF EXISTS "project_files_select" ON project_files;
CREATE POLICY "project_files_select" ON project_files FOR SELECT USING (can_access_file(id));
DROP POLICY IF EXISTS "project_files_insert" ON project_files;
CREATE POLICY "project_files_insert" ON project_files FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND can_access_project(project_id));
DROP POLICY IF EXISTS "project_files_admin_internal_update" ON project_files;
CREATE POLICY "project_files_admin_internal_update" ON project_files FOR UPDATE USING (auth.uid() IS NOT NULL AND get_user_role() IN ('admin', 'internal') AND can_access_project(project_id));
DROP POLICY IF EXISTS "project_files_dev_update" ON project_files;
CREATE POLICY "project_files_dev_update" ON project_files FOR UPDATE USING (auth.uid() IS NOT NULL AND get_user_role() = 'dev' AND can_access_project(project_id));
DROP POLICY IF EXISTS "project_files_own_update" ON project_files;
CREATE POLICY "project_files_own_update" ON project_files FOR UPDATE USING (auth.uid() IS NOT NULL AND uploaded_by = auth.uid() AND can_access_file(id));
DROP POLICY IF EXISTS "project_files_admin_internal_delete" ON project_files;
CREATE POLICY "project_files_admin_internal_delete" ON project_files FOR DELETE USING (auth.uid() IS NOT NULL AND get_user_role() IN ('admin', 'internal') AND can_access_project(project_id));
DROP POLICY IF EXISTS "project_files_dev_delete" ON project_files;
CREATE POLICY "project_files_dev_delete" ON project_files FOR DELETE USING (auth.uid() IS NOT NULL AND get_user_role() = 'dev' AND can_access_project(project_id));
DROP POLICY IF EXISTS "project_files_own_delete" ON project_files;
CREATE POLICY "project_files_own_delete" ON project_files FOR DELETE USING (auth.uid() IS NOT NULL AND uploaded_by = auth.uid() AND can_access_file(id));

-- Trigger: Auto-create default folders for new projects
CREATE OR REPLACE FUNCTION public.create_project_default_folders() RETURNS TRIGGER AS $$
DECLARE
  v_internal_folder_id UUID;
  v_shared_folder_id UUID;
BEGIN
  INSERT INTO project_files (project_id, file_name, file_path, content_type, visibility, position) VALUES (NEW.id, 'Internal Files', '', 'folder', 'workspace', 0) RETURNING id INTO v_internal_folder_id;
  INSERT INTO project_files (project_id, file_name, file_path, content_type, visibility, position) VALUES (NEW.id, 'Shared with Client', '', 'folder', 'portal', 1) RETURNING id INTO v_shared_folder_id;
  INSERT INTO project_files (project_id, parent_id, file_name, file_path, content_type, visibility, content, position) VALUES (NEW.id, v_shared_folder_id, NEW.project_name || ' Whiteboard', '', 'whiteboard', 'portal', '{"elements": [], "appState": {}, "files": {}}'::jsonb, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS projects_create_default_folders ON projects;
CREATE TRIGGER projects_create_default_folders AFTER INSERT ON projects FOR EACH ROW EXECUTE FUNCTION create_project_default_folders();

-- Backfill: Create default folders for existing projects
DO $$
DECLARE
  v_project RECORD;
  v_internal_folder_id UUID;
  v_shared_folder_id UUID;
BEGIN
  FOR v_project IN SELECT p.id, p.project_name FROM projects p WHERE NOT EXISTS (SELECT 1 FROM project_files pf WHERE pf.project_id = p.id AND pf.content_type = 'folder') LOOP
    INSERT INTO project_files (project_id, file_name, file_path, content_type, visibility, position) VALUES (v_project.id, 'Internal Files', '', 'folder', 'workspace', 0) RETURNING id INTO v_internal_folder_id;
    INSERT INTO project_files (project_id, file_name, file_path, content_type, visibility, position) VALUES (v_project.id, 'Shared with Client', '', 'folder', 'portal', 1) RETURNING id INTO v_shared_folder_id;
    INSERT INTO project_files (project_id, parent_id, file_name, file_path, content_type, visibility, content, position) VALUES (v_project.id, v_shared_folder_id, v_project.project_name || ' Whiteboard', '', 'whiteboard', 'portal', '{"elements": [], "appState": {}, "files": {}}'::jsonb, 0);
    UPDATE project_files SET parent_id = CASE WHEN visibility = 'portal' THEN v_shared_folder_id ELSE v_internal_folder_id END WHERE project_id = v_project.id AND content_type = 'file' AND parent_id IS NULL;
  END LOOP;
END;
$$;


-- ============================================================================
-- Migration: 20260103000006_profile_last_seen.sql
-- ============================================================================

-- Add last_seen_at column to profiles table for presence tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW();

-- Index for efficient querying of recently active users
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON profiles (last_seen_at DESC);


-- ============================================================================
-- Migration: 20260103000006b_profile_last_seen.sql
-- ============================================================================

-- Add last_seen_at column to profiles table for presence tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW();

-- Index for efficient querying of recently active users
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON profiles (last_seen_at DESC);


-- ============================================================================
-- Migration: 20260103000007_two_workspaces.sql
-- ============================================================================

-- hexOS: Two Workspaces Files System
-- Implements internal/client workspace separation with share/move capabilities

-- ============================================
-- Step 0: Drop the old constraint FIRST (before any data changes)
-- ============================================

-- Drop old visibility constraint to allow new values
ALTER TABLE project_files DROP CONSTRAINT IF EXISTS project_files_visibility_check;

-- ============================================
-- Step 1: Add new columns
-- ============================================

-- Add shared_to column for cross-workspace sharing
ALTER TABLE project_files ADD COLUMN IF NOT EXISTS shared_to TEXT CHECK (shared_to IN ('internal', 'client') OR shared_to IS NULL);

-- Add main whiteboard column to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS main_whiteboard JSONB DEFAULT '{"elements": [], "appState": {}, "files": {}}'::jsonb;

-- Create index for shared_to queries
CREATE INDEX IF NOT EXISTS idx_project_files_shared_to ON project_files(shared_to) WHERE shared_to IS NOT NULL;

-- ============================================
-- Step 2: Migrate visibility values
-- ============================================

-- Update existing visibility values: workspace -> internal, portal -> client
UPDATE project_files SET visibility = 'internal' WHERE visibility = 'workspace';
UPDATE project_files SET visibility = 'client' WHERE visibility = 'portal';

-- ============================================
-- Step 3: Add new visibility constraint (after data migration)
-- ============================================

-- Add new constraint that only allows internal/client
ALTER TABLE project_files ADD CONSTRAINT project_files_visibility_check CHECK (visibility IN ('internal', 'client'));

-- ============================================
-- Step 4: Rename default folders
-- ============================================

UPDATE project_files SET file_name = 'Client Files' WHERE file_name = 'Shared with Client' AND content_type = 'folder' AND parent_id IS NULL;

-- ============================================
-- Step 5: Update default folders trigger
-- ============================================

CREATE OR REPLACE FUNCTION public.create_project_default_folders() RETURNS TRIGGER AS $$
BEGIN
  -- Create Internal Files folder
  INSERT INTO project_files (project_id, file_name, file_path, content_type, visibility, position)
  VALUES (NEW.id, 'Internal Files', '', 'folder', 'internal', 0);

  -- Create Client Files folder
  INSERT INTO project_files (project_id, file_name, file_path, content_type, visibility, position)
  VALUES (NEW.id, 'Client Files', '', 'folder', 'client', 0);

  -- Main whiteboard is now in projects.main_whiteboard, not in files
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Step 6: Backfill main whiteboard from existing project whiteboards
-- ============================================

DO $$
DECLARE
  v_project RECORD;
BEGIN
  FOR v_project IN
    SELECT DISTINCT pf.project_id, pf.content, pf.id, pf.file_name
    FROM project_files pf
    WHERE pf.content_type = 'whiteboard'
    AND pf.parent_id IN (
      SELECT id FROM project_files
      WHERE content_type = 'folder'
      AND (file_name = 'Shared with Client' OR file_name = 'Client Files')
      AND parent_id IS NULL
    )
    AND pf.file_name LIKE '% Whiteboard'
  LOOP
    -- Move whiteboard content to main_whiteboard
    UPDATE projects
    SET main_whiteboard = COALESCE(v_project.content, '{"elements": [], "appState": {}, "files": {}}'::jsonb)
    WHERE id = v_project.project_id
    AND (main_whiteboard IS NULL OR main_whiteboard = '{"elements": [], "appState": {}, "files": {}}'::jsonb);

    -- Delete the old whiteboard file entry
    DELETE FROM project_files WHERE id = v_project.id;
  END LOOP;
END;
$$;

-- ============================================
-- Step 7: Update RLS helper function
-- ============================================

CREATE OR REPLACE FUNCTION public.can_access_file(p_file_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role user_role;
  v_project_id UUID;
  v_visibility TEXT;
  v_shared_to TEXT;
BEGIN
  v_user_role := public.get_user_role();

  SELECT project_id, visibility, shared_to
  INTO v_project_id, v_visibility, v_shared_to
  FROM project_files WHERE id = p_file_id;

  IF v_project_id IS NULL THEN RETURN FALSE; END IF;
  IF NOT public.can_access_project(v_project_id) THEN RETURN FALSE; END IF;

  -- Admin and Internal see everything
  IF v_user_role IN ('admin', 'internal') THEN RETURN TRUE; END IF;

  -- Dev sees internal view and items shared_to internal
  IF v_user_role = 'dev' THEN
    RETURN v_visibility = 'internal' OR v_shared_to = 'internal';
  END IF;

  -- DFY and Client see client view and items shared_to client
  IF v_user_role IN ('dfy', 'client') THEN
    RETURN v_visibility = 'client' OR v_shared_to = 'client';
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- Step 8: Update RLS policies
-- ============================================

-- Drop and recreate SELECT policy with new logic
DROP POLICY IF EXISTS "project_files_select" ON project_files;
DROP POLICY IF EXISTS "project_files_select" ON project_files;
CREATE POLICY "project_files_select" ON project_files
  FOR SELECT USING (can_access_file(id));

-- UPDATE policy for admin/internal
DROP POLICY IF EXISTS "project_files_admin_internal_update" ON project_files;
DROP POLICY IF EXISTS "project_files_admin_internal_update" ON project_files;
CREATE POLICY "project_files_admin_internal_update" ON project_files
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND get_user_role() IN ('admin', 'internal')
    AND can_access_project(project_id)
  );

-- UPDATE policy for dev (their assigned projects)
DROP POLICY IF EXISTS "project_files_dev_update" ON project_files;
DROP POLICY IF EXISTS "project_files_dev_update" ON project_files;
CREATE POLICY "project_files_dev_update" ON project_files
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND get_user_role() = 'dev'
    AND can_access_project(project_id)
  );

-- UPDATE policy for own files
DROP POLICY IF EXISTS "project_files_own_update" ON project_files;
DROP POLICY IF EXISTS "project_files_own_update" ON project_files;
CREATE POLICY "project_files_own_update" ON project_files
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND uploaded_by = auth.uid()
    AND can_access_file(id)
  );

-- DELETE policy for admin/internal
DROP POLICY IF EXISTS "project_files_admin_internal_delete" ON project_files;
DROP POLICY IF EXISTS "project_files_admin_internal_delete" ON project_files;
CREATE POLICY "project_files_admin_internal_delete" ON project_files
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND get_user_role() IN ('admin', 'internal')
    AND can_access_project(project_id)
  );

-- DELETE policy for dev (their assigned projects)
DROP POLICY IF EXISTS "project_files_dev_delete" ON project_files;
DROP POLICY IF EXISTS "project_files_dev_delete" ON project_files;
CREATE POLICY "project_files_dev_delete" ON project_files
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND get_user_role() = 'dev'
    AND can_access_project(project_id)
  );

-- DELETE policy for own files
DROP POLICY IF EXISTS "project_files_own_delete" ON project_files;
DROP POLICY IF EXISTS "project_files_own_delete" ON project_files;
CREATE POLICY "project_files_own_delete" ON project_files
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND uploaded_by = auth.uid()
    AND can_access_file(id)
  );

-- INSERT policy: Anyone who can access the project can create files
-- Visibility is handled at the application layer (inherited from parent folder)
DROP POLICY IF EXISTS "project_files_insert" ON project_files;
DROP POLICY IF EXISTS "project_files_insert" ON project_files;
CREATE POLICY "project_files_insert" ON project_files
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND can_access_project(project_id)
  );


-- ============================================================================
-- Migration: 20260103000008_add_can_access_project_function.sql
-- ============================================================================

-- hexOS: Add missing can_access_project function
-- This function was referenced by RLS policies but never created

CREATE OR REPLACE FUNCTION public.can_access_project(p_project_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role user_role;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  v_user_role := public.get_user_role();

  -- Not authenticated
  IF v_user_id IS NULL THEN RETURN FALSE; END IF;

  -- Admin and Internal see all projects
  IF v_user_role IN ('admin', 'internal') THEN RETURN TRUE; END IF;

  -- Dev sees only assigned projects
  IF v_user_role = 'dev' THEN
    RETURN EXISTS (
      SELECT 1 FROM projects WHERE id = p_project_id AND assigned_dev_id = v_user_id
    );
  END IF;

  -- DFY sees only their deals
  IF v_user_role = 'dfy' THEN
    RETURN EXISTS (
      SELECT 1 FROM projects WHERE id = p_project_id AND dfy_partner_id = v_user_id
    );
  END IF;

  -- Client sees only their project
  IF v_user_role = 'client' THEN
    RETURN EXISTS (
      SELECT 1 FROM projects WHERE id = p_project_id AND client_id = v_user_id
    );
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- ============================================================================
-- Migration: 20260103000009_fix_rls_functions.sql
-- ============================================================================

-- !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-- OBSOLETE: This migration is superseded by 20260103000011_emergency_rls_fix.sql
-- DO NOT RUN - kept for historical reference only
-- !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
--
-- hexOS: Fix RLS helper functions
-- Ensures get_user_role and can_access_project handle edge cases properly

-- ============================================
-- Step 1: Create or replace get_user_role with proper NULL handling
-- ============================================

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
DECLARE
  v_role user_role;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- Step 2: Create robust can_access_project function
-- ============================================

CREATE OR REPLACE FUNCTION public.can_access_project(p_project_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_user_role user_role;
BEGIN
  v_user_id := auth.uid();

  -- Not authenticated
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get role directly from profiles (don't rely on get_user_role)
  SELECT role INTO v_user_role FROM public.profiles WHERE id = v_user_id;

  -- No profile found - deny access
  IF v_user_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Admin and Internal see all projects
  IF v_user_role = 'admin' OR v_user_role = 'internal' THEN
    RETURN TRUE;
  END IF;

  -- Dev sees only assigned projects
  IF v_user_role = 'dev' THEN
    RETURN EXISTS (
      SELECT 1 FROM projects WHERE id = p_project_id AND assigned_dev_id = v_user_id
    );
  END IF;

  -- DFY sees only their deals
  IF v_user_role = 'dfy' THEN
    RETURN EXISTS (
      SELECT 1 FROM projects WHERE id = p_project_id AND dfy_partner_id = v_user_id
    );
  END IF;

  -- Client sees only their project
  IF v_user_role = 'client' THEN
    RETURN EXISTS (
      SELECT 1 FROM projects WHERE id = p_project_id AND client_id = v_user_id
    );
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- Step 3: Recreate INSERT policy with simpler check as fallback
-- ============================================

DROP POLICY IF EXISTS "project_files_insert" ON project_files;

-- Primary INSERT policy using can_access_project
DROP POLICY IF EXISTS "project_files_insert" ON project_files;
CREATE POLICY "project_files_insert" ON project_files
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      -- Either can_access_project returns true
      can_access_project(project_id)
      -- OR user is admin/internal (direct check as fallback)
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'internal')
      )
    )
  );

-- ============================================
-- Step 4: Also fix can_access_file to not fail silently
-- ============================================

CREATE OR REPLACE FUNCTION public.can_access_file(p_file_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role user_role;
  v_user_id UUID;
  v_project_id UUID;
  v_visibility TEXT;
  v_shared_to TEXT;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN RETURN FALSE; END IF;

  -- Get role directly
  SELECT role INTO v_user_role FROM public.profiles WHERE id = v_user_id;

  IF v_user_role IS NULL THEN RETURN FALSE; END IF;

  -- Get file info
  SELECT project_id, visibility, shared_to
  INTO v_project_id, v_visibility, v_shared_to
  FROM project_files WHERE id = p_file_id;

  IF v_project_id IS NULL THEN RETURN FALSE; END IF;

  -- Check project access
  IF NOT can_access_project(v_project_id) THEN RETURN FALSE; END IF;

  -- Admin and Internal see everything
  IF v_user_role = 'admin' OR v_user_role = 'internal' THEN RETURN TRUE; END IF;

  -- Dev sees internal view and items shared_to internal
  IF v_user_role = 'dev' THEN
    RETURN v_visibility = 'internal' OR v_shared_to = 'internal';
  END IF;

  -- DFY and Client see client view and items shared_to client
  IF v_user_role = 'dfy' OR v_user_role = 'client' THEN
    RETURN v_visibility = 'client' OR v_shared_to = 'client';
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- ============================================================================
-- Migration: 20260103000010_fix_recursive_rls.sql
-- ============================================================================

-- !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-- OBSOLETE: This migration is superseded by 20260103000011_emergency_rls_fix.sql
-- DO NOT RUN - kept for historical reference only
-- !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
--
-- hexOS: Fix recursive RLS function with depth limit
-- Prevents infinite loops if parent_id has cycles

-- Add depth limit to prevent infinite recursion
CREATE OR REPLACE FUNCTION public.get_effective_file_visibility(p_file_id UUID, p_depth INT DEFAULT 0)
RETURNS TEXT AS $$
DECLARE
  v_visibility TEXT;
  v_parent_id UUID;
BEGIN
  -- Safety: prevent infinite recursion (max 10 levels deep)
  IF p_depth > 10 THEN RETURN 'internal'; END IF;

  SELECT visibility, parent_id INTO v_visibility, v_parent_id FROM project_files WHERE id = p_file_id;
  IF v_visibility IS NOT NULL THEN RETURN v_visibility; END IF;
  IF v_parent_id IS NOT NULL THEN RETURN get_effective_file_visibility(v_parent_id, p_depth + 1); END IF;
  RETURN 'internal';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Simplified can_access_file that's faster for RLS
CREATE OR REPLACE FUNCTION public.can_access_file(p_file_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role user_role;
  v_user_id UUID;
  v_project_id UUID;
  v_visibility TEXT;
  v_shared_to TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN FALSE; END IF;

  -- Get role directly (avoid function call)
  SELECT role INTO v_user_role FROM public.profiles WHERE id = v_user_id;
  IF v_user_role IS NULL THEN RETURN FALSE; END IF;

  -- Get file info directly
  SELECT project_id, visibility, shared_to
  INTO v_project_id, v_visibility, v_shared_to
  FROM project_files WHERE id = p_file_id;

  IF v_project_id IS NULL THEN RETURN FALSE; END IF;

  -- Admin and Internal see everything
  IF v_user_role IN ('admin', 'internal') THEN RETURN TRUE; END IF;

  -- Check project access inline (avoid function call)
  IF v_user_role = 'dev' THEN
    IF NOT EXISTS (SELECT 1 FROM projects WHERE id = v_project_id AND assigned_dev_id = v_user_id) THEN
      RETURN FALSE;
    END IF;
    -- Dev sees internal view
    RETURN v_visibility = 'internal' OR v_shared_to = 'internal';
  END IF;

  IF v_user_role = 'dfy' THEN
    IF NOT EXISTS (SELECT 1 FROM projects WHERE id = v_project_id AND dfy_partner_id = v_user_id) THEN
      RETURN FALSE;
    END IF;
    RETURN v_visibility = 'client' OR v_shared_to = 'client';
  END IF;

  IF v_user_role = 'client' THEN
    IF NOT EXISTS (SELECT 1 FROM projects WHERE id = v_project_id AND client_id = v_user_id) THEN
      RETURN FALSE;
    END IF;
    RETURN v_visibility = 'client' OR v_shared_to = 'client';
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- ============================================================================
-- Migration: 20260103000011_emergency_rls_fix.sql
-- ============================================================================

-- hexOS: Emergency RLS Fix
-- Date: 2026-01-03
--
-- FULL INCIDENT REPORT: docs/INCIDENT_2026-01-03_RLS_CRASH.md
--
-- INCIDENT SUMMARY:
-- The recursive get_effective_file_visibility function caused infinite loops
-- that crashed the Supabase database repeatedly. This migration documents
-- the emergency fix applied via Supabase Dashboard SQL Editor.
--
-- ROOT CAUSE:
-- The original get_effective_file_visibility function recursively walked up
-- parent folders to determine visibility inheritance. This caused:
-- 1. Infinite loops if parent_id had cycles
-- 2. Deep recursion for nested folders
-- 3. N+1 query explosion in RLS policy checks
-- 4. Database connection exhaustion and crashes
--
-- WHAT WAS CHANGED:
-- 1. Dropped all recursive/problematic functions with CASCADE
-- 2. Recreated simpler, non-recursive versions
-- 3. Recreated basic RLS policies (simplified from role-specific to project-based)
--
-- TRADE-OFFS:
-- - Folder visibility inheritance NO LONGER WORKS (files use direct visibility)
-- - Role-specific update/delete permissions simplified
-- - shared_to field not currently checked in RLS
--
-- This file documents what was applied manually. DO NOT re-run this migration.
-- ============================================================================

-- Step 1: Disable RLS on all affected tables
ALTER TABLE project_files DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE deliverables DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_milestones DISABLE ROW LEVEL SECURITY;
ALTER TABLE scope_changes DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_requirements DISABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_requirements DISABLE ROW LEVEL SECURITY;
ALTER TABLE requirement_attachments DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop functions with CASCADE (drops all dependent policies)
DROP FUNCTION IF EXISTS get_effective_file_visibility(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_effective_file_visibility(UUID, INT) CASCADE;
DROP FUNCTION IF EXISTS can_access_file(UUID) CASCADE;
DROP FUNCTION IF EXISTS can_access_project(UUID) CASCADE;

-- Step 3: Recreate simple, safe functions

-- Get user role (simple, no recursion)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Can access project (no nested function calls)
CREATE OR REPLACE FUNCTION public.can_access_project(p_project_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_role user_role;
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN FALSE; END IF;
  SELECT role INTO v_role FROM profiles WHERE id = v_uid;
  IF v_role IN ('admin', 'internal') THEN RETURN TRUE; END IF;
  IF v_role = 'dev' THEN RETURN EXISTS (SELECT 1 FROM projects WHERE id = p_project_id AND assigned_dev_id = v_uid); END IF;
  IF v_role = 'dfy' THEN RETURN EXISTS (SELECT 1 FROM projects WHERE id = p_project_id AND dfy_partner_id = v_uid); END IF;
  IF v_role = 'client' THEN RETURN EXISTS (SELECT 1 FROM projects WHERE id = p_project_id AND client_id = v_uid); END IF;
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Can access file (no recursion, simplified visibility check)
CREATE OR REPLACE FUNCTION public.can_access_file(p_file_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_role user_role;
  v_uid UUID := auth.uid();
  v_project_id UUID;
  v_visibility TEXT;
BEGIN
  IF v_uid IS NULL THEN RETURN FALSE; END IF;
  SELECT role INTO v_role FROM profiles WHERE id = v_uid;
  IF v_role IS NULL THEN RETURN FALSE; END IF;
  SELECT project_id, visibility INTO v_project_id, v_visibility FROM project_files WHERE id = p_file_id;
  IF v_project_id IS NULL THEN RETURN FALSE; END IF;
  IF v_role IN ('admin', 'internal', 'dev') THEN
    RETURN can_access_project(v_project_id);
  END IF;
  IF v_role IN ('dfy', 'client') THEN
    IF NOT can_access_project(v_project_id) THEN RETURN FALSE; END IF;
    RETURN v_visibility = 'client';
  END IF;
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Step 4: Re-enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE scope_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE requirement_attachments ENABLE ROW LEVEL SECURITY;

-- Step 5: Recreate RLS policies (simplified)

-- PROJECT_FILES policies
DROP POLICY IF EXISTS "project_files_select" ON project_files;
CREATE POLICY "project_files_select" ON project_files FOR SELECT USING (can_access_file(id));
DROP POLICY IF EXISTS "project_files_insert" ON project_files;
CREATE POLICY "project_files_insert" ON project_files FOR INSERT WITH CHECK (can_access_project(project_id));
DROP POLICY IF EXISTS "project_files_update" ON project_files;
CREATE POLICY "project_files_update" ON project_files FOR UPDATE USING (can_access_project(project_id));
DROP POLICY IF EXISTS "project_files_delete" ON project_files;
CREATE POLICY "project_files_delete" ON project_files FOR DELETE USING (can_access_project(project_id));

-- DELIVERABLES policies
DROP POLICY IF EXISTS "deliverables_select" ON deliverables;
CREATE POLICY "deliverables_select" ON deliverables FOR SELECT USING (can_access_project(project_id));
DROP POLICY IF EXISTS "deliverables_insert" ON deliverables;
CREATE POLICY "deliverables_insert" ON deliverables FOR INSERT WITH CHECK (can_access_project(project_id));
DROP POLICY IF EXISTS "deliverables_update" ON deliverables;
CREATE POLICY "deliverables_update" ON deliverables FOR UPDATE USING (can_access_project(project_id));
DROP POLICY IF EXISTS "deliverables_delete" ON deliverables;
CREATE POLICY "deliverables_delete" ON deliverables FOR DELETE USING (can_access_project(project_id));

-- ACTIVITY_LOG policies
DROP POLICY IF EXISTS "activity_log_select" ON activity_log;
CREATE POLICY "activity_log_select" ON activity_log FOR SELECT USING (can_access_project(project_id));
DROP POLICY IF EXISTS "activity_log_insert" ON activity_log;
CREATE POLICY "activity_log_insert" ON activity_log FOR INSERT WITH CHECK (can_access_project(project_id));

-- ONBOARDING_REQUIREMENTS policies
DROP POLICY IF EXISTS "onboarding_requirements_select" ON onboarding_requirements;
CREATE POLICY "onboarding_requirements_select" ON onboarding_requirements FOR SELECT USING (can_access_project(project_id));
DROP POLICY IF EXISTS "onboarding_requirements_insert" ON onboarding_requirements;
CREATE POLICY "onboarding_requirements_insert" ON onboarding_requirements FOR INSERT WITH CHECK (can_access_project(project_id));
DROP POLICY IF EXISTS "onboarding_requirements_update" ON onboarding_requirements;
CREATE POLICY "onboarding_requirements_update" ON onboarding_requirements FOR UPDATE USING (can_access_project(project_id));
DROP POLICY IF EXISTS "onboarding_requirements_delete" ON onboarding_requirements;
CREATE POLICY "onboarding_requirements_delete" ON onboarding_requirements FOR DELETE USING (can_access_project(project_id));

-- REQUIREMENT_ATTACHMENTS policies
DROP POLICY IF EXISTS "requirement_attachments_select" ON requirement_attachments;
CREATE POLICY "requirement_attachments_select" ON requirement_attachments FOR SELECT USING (
  EXISTS (SELECT 1 FROM onboarding_requirements r WHERE r.id = requirement_id AND can_access_project(r.project_id))
);
DROP POLICY IF EXISTS "requirement_attachments_insert" ON requirement_attachments;
CREATE POLICY "requirement_attachments_insert" ON requirement_attachments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM onboarding_requirements r WHERE r.id = requirement_id AND can_access_project(r.project_id))
);

-- SCOPE_CHANGES policies
DROP POLICY IF EXISTS "scope_changes_select" ON scope_changes;
CREATE POLICY "scope_changes_select" ON scope_changes FOR SELECT USING (can_access_project(project_id));
DROP POLICY IF EXISTS "scope_changes_insert" ON scope_changes;
CREATE POLICY "scope_changes_insert" ON scope_changes FOR INSERT WITH CHECK (can_access_project(project_id));
DROP POLICY IF EXISTS "scope_changes_update" ON scope_changes;
CREATE POLICY "scope_changes_update" ON scope_changes FOR UPDATE USING (can_access_project(project_id));

-- PAYMENT_MILESTONES policies
DROP POLICY IF EXISTS "payment_milestones_select" ON payment_milestones;
CREATE POLICY "payment_milestones_select" ON payment_milestones FOR SELECT USING (can_access_project(project_id));
DROP POLICY IF EXISTS "payment_milestones_insert" ON payment_milestones;
CREATE POLICY "payment_milestones_insert" ON payment_milestones FOR INSERT WITH CHECK (can_access_project(project_id));
DROP POLICY IF EXISTS "payment_milestones_update" ON payment_milestones;
CREATE POLICY "payment_milestones_update" ON payment_milestones FOR UPDATE USING (can_access_project(project_id));

-- PROJECT_REQUIREMENTS policies
DROP POLICY IF EXISTS "project_requirements_select" ON project_requirements;
CREATE POLICY "project_requirements_select" ON project_requirements FOR SELECT USING (can_access_project(project_id));
DROP POLICY IF EXISTS "project_requirements_insert" ON project_requirements;
CREATE POLICY "project_requirements_insert" ON project_requirements FOR INSERT WITH CHECK (can_access_project(project_id));
DROP POLICY IF EXISTS "project_requirements_update" ON project_requirements;
CREATE POLICY "project_requirements_update" ON project_requirements FOR UPDATE USING (can_access_project(project_id));


-- ============================================================================
-- Migration: 20260103000012_restore_projects_rls.sql
-- ============================================================================

-- Restore RLS policies for projects table
-- These were accidentally dropped during emergency RLS fix (20260103000011)
-- and never recreated.
--
-- CRITICAL: Do NOT use can_access_project() here! That function queries
-- the projects table, which would create infinite recursion when used
-- in the projects table's own RLS policy. Use inline checks instead.

-- Admin: Full access to all projects
DROP POLICY IF EXISTS "projects_admin_all" ON projects;
CREATE POLICY "projects_admin_all" ON projects
  FOR ALL USING (
    auth.uid() IS NOT NULL AND get_user_role() = 'admin'
  );

-- Internal: Can view all projects
DROP POLICY IF EXISTS "projects_internal_select" ON projects;
CREATE POLICY "projects_internal_select" ON projects
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND get_user_role() = 'internal'
  );

-- Internal: Can insert/update projects
DROP POLICY IF EXISTS "projects_internal_write" ON projects;
CREATE POLICY "projects_internal_write" ON projects
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND get_user_role() = 'internal'
  );

DROP POLICY IF EXISTS "projects_internal_update" ON projects;
CREATE POLICY "projects_internal_update" ON projects
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND get_user_role() = 'internal'
  );

-- Dev: Can only see projects assigned to them
DROP POLICY IF EXISTS "projects_dev_select" ON projects;
CREATE POLICY "projects_dev_select" ON projects
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND get_user_role() = 'dev' AND assigned_dev_id = auth.uid()
  );

-- DFY: Can only see projects they referred
DROP POLICY IF EXISTS "projects_dfy_select" ON projects;
CREATE POLICY "projects_dfy_select" ON projects
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND get_user_role() = 'dfy' AND dfy_partner_id = auth.uid()
  );

-- Client: Can only see their own project
DROP POLICY IF EXISTS "projects_client_select" ON projects;
CREATE POLICY "projects_client_select" ON projects
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND get_user_role() = 'client' AND client_id = auth.uid()
  );


-- ============================================================================
-- Migration: 20260103000013_restore_stability.sql
-- ============================================================================

-- hexOS: Restore Stability & Optimize RLS (v4 - Ultra Robust)
-- Date: 2026-01-03
--
-- This migration checks for both tables AND columns before modifying.
-- FIXES:
-- 1. Performance-intensive subqueries in project_files
-- 2. Potential recursion loops in profiles and conversations
-- 3. Column-level resilience (handles missing inquiry_id)

BEGIN;

-- 1. RE-IMPLEMENT FUNCTIONS (Hardened and Optimized)

-- Non-recursive role getter
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Optimized file access (no recursion, no self-select)
CREATE OR REPLACE FUNCTION public.can_access_file_v2(p_project_id UUID, p_visibility TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role user_role;
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN FALSE; END IF;
  SELECT role INTO v_user_role FROM public.profiles WHERE id = v_uid;
  IF NOT public.can_access_project(p_project_id) THEN RETURN FALSE; END IF;
  IF v_user_role IN ('admin', 'internal', 'dev') THEN RETURN TRUE; END IF;
  RETURN p_visibility = 'portal' OR p_visibility = 'client';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Optimized conversation access
CREATE OR REPLACE FUNCTION public.can_access_conversation_v2(
  p_project_id UUID, 
  p_inquiry_id UUID, 
  p_type TEXT,
  p_conversation_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role user_role;
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN FALSE; END IF;
  SELECT role INTO v_user_role FROM public.profiles WHERE id = v_uid;

  -- Logic depends on type
  IF p_type = 'direct' THEN
    RETURN EXISTS (
      SELECT 1 FROM information_schema.tables WHERE table_name = 'direct_conversation_participants'
    ) AND EXISTS (
      SELECT 1 FROM public.direct_conversation_participants
      WHERE conversation_id = p_conversation_id AND user_id = v_uid
    );
  END IF;

  -- Default to project access check
  IF p_project_id IS NOT NULL THEN
    IF NOT public.can_access_project(p_project_id) THEN RETURN FALSE; END IF;
    IF p_type = 'project' THEN RETURN TRUE; END IF;
    IF p_type = 'workspace' THEN RETURN v_user_role IN ('admin', 'internal', 'dev'); END IF;
    IF p_type = 'partner' THEN RETURN v_user_role IN ('admin', 'internal', 'dfy'); END IF;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- 2. APPLY POLICIES CONDITIONALLY

DO $$ 
BEGIN
    -- PROFILES FIX
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
        CREATE POLICY "profiles_select_admin" ON profiles FOR SELECT USING (
            auth.uid() IS NOT NULL AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
        );
    END IF;

    -- PROJECT_FILES FIX
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_files') THEN
        DROP POLICY IF EXISTS "project_files_select" ON project_files;
        DROP POLICY IF EXISTS "project_files_own_update" ON project_files;
        DROP POLICY IF EXISTS "project_files_own_delete" ON project_files;
        
        -- pass columns directly
        CREATE POLICY "project_files_select" ON project_files 
          FOR SELECT USING (can_access_file_v2(project_id, visibility));
        
        ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;
    END IF;

    -- CONVERSATIONS FIX (Safe for missing inquiry_id)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations') THEN
        DROP POLICY IF EXISTS "conversations_select" ON conversations;
        
        -- Check if inquiry_id column exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'inquiry_id') THEN
            EXECUTE 'CREATE POLICY "conversations_select" ON conversations FOR SELECT USING (can_access_conversation_v2(project_id, inquiry_id, type::text, id))';
        ELSE
            -- Fallback if messaging system is partially installed
            EXECUTE 'CREATE POLICY "conversations_select" ON conversations FOR SELECT USING (can_access_conversation_v2(project_id, NULL, type::text, id))';
        END IF;
    END IF;

    -- DIRECT PARTICIPANTS FIX
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'direct_conversation_participants') THEN
        DROP POLICY IF EXISTS "direct_participants_select" ON direct_conversation_participants;
        CREATE POLICY "direct_participants_select" ON direct_conversation_participants
          FOR SELECT USING (
            user_id = auth.uid() OR
            conversation_id IN (
              SELECT conversation_id FROM direct_conversation_participants WHERE user_id = auth.uid()
            )
          );
    END IF;
END $$;

-- 3. FINAL CLEANUP
DROP FUNCTION IF EXISTS can_access_file(UUID) CASCADE;
DROP FUNCTION IF EXISTS can_access_conversation(UUID) CASCADE;

COMMIT;

