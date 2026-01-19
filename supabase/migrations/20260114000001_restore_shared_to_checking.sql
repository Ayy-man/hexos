-- hexOS: Restore shared_to Field Checking in File RLS
-- Date: 2026-01-14
--
-- This migration restores the shared_to field checking that was simplified
-- during the 2026-01-03 RLS crisis. The shared_to field allows files to be
-- explicitly shared with clients even if their visibility is 'internal'.
--
-- Related: docs/INCIDENT_2026-01-03_RLS_CRASH.md

BEGIN;

-- Update can_access_file_v2 to accept optional shared_to parameter
-- Uses DEFAULT NULL for backward compatibility with existing calls
CREATE OR REPLACE FUNCTION public.can_access_file_v2(
  p_project_id UUID,
  p_visibility TEXT,
  p_shared_to TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role user_role;
  v_uid UUID := auth.uid();
BEGIN
  -- Must be authenticated
  IF v_uid IS NULL THEN RETURN FALSE; END IF;

  -- Get user's role
  SELECT role INTO v_user_role FROM public.profiles WHERE id = v_uid;

  -- Must have project access first
  IF NOT public.can_access_project(p_project_id) THEN RETURN FALSE; END IF;

  -- Admin, internal, and dev see all files in their projects
  IF v_user_role IN ('admin', 'internal', 'dev') THEN RETURN TRUE; END IF;

  -- DFY/Client see:
  -- 1. Files with visibility = 'client' or 'portal'
  -- 2. Files explicitly shared to 'client' (even if visibility is 'internal')
  RETURN p_visibility = 'client'
    OR p_visibility = 'portal'
    OR p_shared_to = 'client';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Update policy to pass shared_to column
DROP POLICY IF EXISTS "project_files_select" ON project_files;
CREATE POLICY "project_files_select" ON project_files
  FOR SELECT USING (can_access_file_v2(project_id, visibility, shared_to));

COMMIT;
