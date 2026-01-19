-- Fix RLS policies for project_opportunities
-- The dev_select policy had a subquery to project_invitations which caused permission issues

-- Drop the problematic policy
DROP POLICY IF EXISTS "opportunities_dev_select" ON project_opportunities;

-- Recreate with a SECURITY DEFINER function to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.dev_has_opportunity_access(p_opportunity_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if opportunity is public and open
  IF EXISTS (
    SELECT 1 FROM project_opportunities
    WHERE id = p_opportunity_id
    AND is_public = TRUE
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check if dev has been invited to this opportunity
  IF EXISTS (
    SELECT 1 FROM project_invitations
    WHERE opportunity_id = p_opportunity_id
    AND dev_id = auth.uid()
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Recreate the dev select policy using the helper function
CREATE POLICY "opportunities_dev_select" ON project_opportunities
  FOR SELECT USING (
    get_user_role() = 'dev' AND dev_has_opportunity_access(id)
  );

-- Also ensure the admin policy uses WITH CHECK for inserts
DROP POLICY IF EXISTS "opportunities_admin_all" ON project_opportunities;
CREATE POLICY "opportunities_admin_all" ON project_opportunities
  FOR ALL
  USING (get_user_role() IN ('admin', 'internal'))
  WITH CHECK (get_user_role() IN ('admin', 'internal'));
