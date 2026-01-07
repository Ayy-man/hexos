-- Backfill Organizations for Existing DFY Users
-- This migration creates organizations for existing DFY users and links their projects/inquiries

-- ============================================================================
-- STEP 1: Create organizations for existing DFY users
-- ============================================================================

-- Create a solo agency for each existing DFY user who doesn't have one
INSERT INTO organizations (name, slug, type, max_seats, created_by, contact_email)
SELECT
  COALESCE(p.name, split_part(p.email, '@', 1)) || '''s Agency',
  'agency-' || p.id::text,
  'dfy_agency'::organization_type,
  3,
  p.id,
  p.email
FROM profiles p
WHERE p.role = 'dfy'
AND NOT EXISTS (
  SELECT 1 FROM organization_members om
  JOIN organizations o ON o.id = om.organization_id
  WHERE om.user_id = p.id
  AND o.type = 'dfy_agency'
);

-- ============================================================================
-- STEP 2: Add DFY users as owners of their organizations
-- ============================================================================

INSERT INTO organization_members (organization_id, user_id, role)
SELECT o.id, o.created_by, 'owner'::org_member_role
FROM organizations o
WHERE o.type = 'dfy_agency'
AND o.created_by IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM organization_members
  WHERE organization_id = o.id AND user_id = o.created_by
);

-- ============================================================================
-- STEP 3: Backfill dfy_organization_id on projects
-- ============================================================================

-- Link existing projects to their DFY partner's organization
UPDATE projects p
SET dfy_organization_id = (
  SELECT om.organization_id
  FROM organization_members om
  JOIN organizations o ON o.id = om.organization_id
  WHERE om.user_id = p.dfy_partner_id
  AND o.type = 'dfy_agency'
  LIMIT 1
)
WHERE p.dfy_partner_id IS NOT NULL
AND p.dfy_organization_id IS NULL;

-- ============================================================================
-- STEP 4: Backfill dfy_organization_id on inquiries
-- ============================================================================

-- Link existing inquiries to their submitter's organization
UPDATE inquiries i
SET dfy_organization_id = (
  SELECT om.organization_id
  FROM organization_members om
  JOIN organizations o ON o.id = om.organization_id
  WHERE om.user_id = i.submitted_by
  AND o.type = 'dfy_agency'
  LIMIT 1
)
WHERE i.submitted_by IS NOT NULL
AND i.dfy_organization_id IS NULL;

-- ============================================================================
-- VERIFICATION QUERIES (for manual checking)
-- ============================================================================

-- After running this migration, you can verify with:
-- SELECT COUNT(*) as dfy_users FROM profiles WHERE role = 'dfy';
-- SELECT COUNT(*) as dfy_orgs FROM organizations WHERE type = 'dfy_agency';
-- SELECT COUNT(*) as org_members FROM organization_members om JOIN organizations o ON o.id = om.organization_id WHERE o.type = 'dfy_agency';
-- SELECT COUNT(*) as projects_with_org FROM projects WHERE dfy_organization_id IS NOT NULL;
-- SELECT COUNT(*) as inquiries_with_org FROM inquiries WHERE dfy_organization_id IS NOT NULL;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE organizations IS 'DFY and Dev agencies - team containers for partners. Auto-created for existing DFY users.';
