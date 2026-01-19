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
