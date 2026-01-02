-- hexOS: Emergency RLS Fix
-- Date: 2026-01-03
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
CREATE POLICY "project_files_select" ON project_files FOR SELECT USING (can_access_file(id));
CREATE POLICY "project_files_insert" ON project_files FOR INSERT WITH CHECK (can_access_project(project_id));
CREATE POLICY "project_files_update" ON project_files FOR UPDATE USING (can_access_project(project_id));
CREATE POLICY "project_files_delete" ON project_files FOR DELETE USING (can_access_project(project_id));

-- DELIVERABLES policies
CREATE POLICY "deliverables_select" ON deliverables FOR SELECT USING (can_access_project(project_id));
CREATE POLICY "deliverables_insert" ON deliverables FOR INSERT WITH CHECK (can_access_project(project_id));
CREATE POLICY "deliverables_update" ON deliverables FOR UPDATE USING (can_access_project(project_id));
CREATE POLICY "deliverables_delete" ON deliverables FOR DELETE USING (can_access_project(project_id));

-- ACTIVITY_LOG policies
CREATE POLICY "activity_log_select" ON activity_log FOR SELECT USING (can_access_project(project_id));
CREATE POLICY "activity_log_insert" ON activity_log FOR INSERT WITH CHECK (can_access_project(project_id));

-- ONBOARDING_REQUIREMENTS policies
CREATE POLICY "onboarding_requirements_select" ON onboarding_requirements FOR SELECT USING (can_access_project(project_id));
CREATE POLICY "onboarding_requirements_insert" ON onboarding_requirements FOR INSERT WITH CHECK (can_access_project(project_id));
CREATE POLICY "onboarding_requirements_update" ON onboarding_requirements FOR UPDATE USING (can_access_project(project_id));
CREATE POLICY "onboarding_requirements_delete" ON onboarding_requirements FOR DELETE USING (can_access_project(project_id));

-- REQUIREMENT_ATTACHMENTS policies
CREATE POLICY "requirement_attachments_select" ON requirement_attachments FOR SELECT USING (
  EXISTS (SELECT 1 FROM onboarding_requirements r WHERE r.id = requirement_id AND can_access_project(r.project_id))
);
CREATE POLICY "requirement_attachments_insert" ON requirement_attachments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM onboarding_requirements r WHERE r.id = requirement_id AND can_access_project(r.project_id))
);

-- SCOPE_CHANGES policies
CREATE POLICY "scope_changes_select" ON scope_changes FOR SELECT USING (can_access_project(project_id));
CREATE POLICY "scope_changes_insert" ON scope_changes FOR INSERT WITH CHECK (can_access_project(project_id));
CREATE POLICY "scope_changes_update" ON scope_changes FOR UPDATE USING (can_access_project(project_id));

-- PAYMENT_MILESTONES policies
CREATE POLICY "payment_milestones_select" ON payment_milestones FOR SELECT USING (can_access_project(project_id));
CREATE POLICY "payment_milestones_insert" ON payment_milestones FOR INSERT WITH CHECK (can_access_project(project_id));
CREATE POLICY "payment_milestones_update" ON payment_milestones FOR UPDATE USING (can_access_project(project_id));

-- PROJECT_REQUIREMENTS policies
CREATE POLICY "project_requirements_select" ON project_requirements FOR SELECT USING (can_access_project(project_id));
CREATE POLICY "project_requirements_insert" ON project_requirements FOR INSERT WITH CHECK (can_access_project(project_id));
CREATE POLICY "project_requirements_update" ON project_requirements FOR UPDATE USING (can_access_project(project_id));
