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
