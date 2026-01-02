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
