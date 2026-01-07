-- Organizations & Invitations System
-- Enables DFY/Dev agencies with team management and unified invitation system

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE organization_type AS ENUM ('dfy_agency', 'dev_agency');

CREATE TYPE invitation_type AS ENUM (
  'admin',      -- Hexona admin invite
  'internal',   -- Hexona internal invite
  'dfy_first',  -- Hexona invites first DFY (creates org)
  'dfy_team',   -- DFY owner invites team member
  'dev_solo',   -- Hexona approves dev application
  'dev_team'    -- Dev agency owner invites team member
);

CREATE TYPE invitation_status AS ENUM (
  'pending_approval',  -- Dev application awaiting review
  'pending',           -- Invitation sent, awaiting acceptance
  'accepted',          -- User accepted
  'expired',           -- Past expiry date
  'revoked',           -- Manually cancelled
  'rejected'           -- Dev application rejected
);

CREATE TYPE org_member_role AS ENUM ('owner', 'admin', 'member');

-- ============================================================================
-- ORGANIZATIONS TABLE
-- ============================================================================

CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type organization_type NOT NULL,

  -- Contact
  website TEXT,
  contact_email TEXT,

  -- Settings (type-specific JSONB)
  -- DFY: { "default_commission_pct": 30 }
  -- Dev: { "hourly_rate": 100 }
  settings JSONB DEFAULT '{}',

  -- Seat limits
  max_seats INT NOT NULL DEFAULT 3,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT true
);

-- Indexes
CREATE INDEX idx_organizations_type ON organizations(type);
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_created_by ON organizations(created_by);

-- Updated at trigger
CREATE TRIGGER set_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ORGANIZATION MEMBERS TABLE
-- ============================================================================

CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Role within organization
  role org_member_role NOT NULL DEFAULT 'member',

  -- Status (no leaving - only deactivate)
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  invited_by UUID REFERENCES profiles(id),

  UNIQUE(organization_id, user_id)
);

-- Indexes
CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_org_members_active ON organization_members(organization_id, is_active) WHERE is_active = true;

-- ============================================================================
-- INVITATIONS TABLE
-- ============================================================================

CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  type invitation_type NOT NULL,
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,

  -- Target organization (null for admin/internal/dfy_first/dev_solo)
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- For dfy_first: org name they'll create on accept
  new_organization_name TEXT,

  -- User role after accepting
  target_role TEXT NOT NULL CHECK (target_role IN ('admin', 'internal', 'dfy', 'dev')),

  -- Status
  status invitation_status NOT NULL DEFAULT 'pending',

  -- Metadata
  invited_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  accepted_at TIMESTAMPTZ,

  -- Dev application fields (for dev_solo type)
  application_data JSONB DEFAULT NULL,
  -- { "name": "...", "portfolio": "...", "skills": [...], "availability": "...", "bio": "..." }

  -- Prevent duplicate invites to same org (or null org for platform invites)
  UNIQUE NULLS NOT DISTINCT (email, organization_id)
);

-- Indexes
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_type ON invitations(type);
CREATE INDEX idx_invitations_status ON invitations(status);
CREATE INDEX idx_invitations_org ON invitations(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX idx_invitations_pending ON invitations(status) WHERE status IN ('pending', 'pending_approval');

-- ============================================================================
-- ADD ORGANIZATION COLUMNS TO PROJECTS & INQUIRIES
-- ============================================================================

-- Projects: link to DFY and Dev organizations
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS dfy_organization_id UUID REFERENCES organizations(id),
  ADD COLUMN IF NOT EXISTS dev_organization_id UUID REFERENCES organizations(id);

CREATE INDEX IF NOT EXISTS idx_projects_dfy_org ON projects(dfy_organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_dev_org ON projects(dev_organization_id);

-- Inquiries: link to DFY organization
ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS dfy_organization_id UUID REFERENCES organizations(id);

CREATE INDEX IF NOT EXISTS idx_inquiries_dfy_org ON inquiries(dfy_organization_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Check if user is active member of an organization
CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_org_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_org_id
    AND user_id = auth.uid()
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get user's organization ID for a specific type
CREATE OR REPLACE FUNCTION public.get_user_org_id(p_type organization_type)
RETURNS UUID AS $$
  SELECT o.id
  FROM organizations o
  JOIN organization_members om ON om.organization_id = o.id
  WHERE om.user_id = auth.uid()
  AND om.is_active = true
  AND o.type = p_type
  AND o.is_active = true
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get user's organization for their role
CREATE OR REPLACE FUNCTION public.get_user_organization()
RETURNS UUID AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();

  IF v_role = 'dfy' THEN
    RETURN get_user_org_id('dfy_agency');
  ELSIF v_role = 'dev' THEN
    RETURN get_user_org_id('dev_agency');
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user is org owner or admin
CREATE OR REPLACE FUNCTION public.is_org_admin(p_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_org_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_org_id
    AND user_id = auth.uid()
    AND is_active = true
    AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get seat count for an organization
CREATE OR REPLACE FUNCTION public.get_org_seat_count(p_org_id UUID)
RETURNS INT AS $$
  SELECT COUNT(*)::INT
  FROM organization_members
  WHERE organization_id = p_org_id
  AND is_active = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get pending invitation count for an organization
CREATE OR REPLACE FUNCTION public.get_org_pending_invites(p_org_id UUID)
RETURNS INT AS $$
  SELECT COUNT(*)::INT
  FROM invitations
  WHERE organization_id = p_org_id
  AND status = 'pending';
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if org has available seats
CREATE OR REPLACE FUNCTION public.org_has_available_seats(p_org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_max_seats INT;
  v_current_seats INT;
  v_pending_invites INT;
BEGIN
  SELECT max_seats INTO v_max_seats FROM organizations WHERE id = p_org_id;
  v_current_seats := get_org_seat_count(p_org_id);
  v_pending_invites := get_org_pending_invites(p_org_id);

  RETURN (v_current_seats + v_pending_invites) < v_max_seats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- RLS POLICIES - ORGANIZATIONS
-- ============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Admin/Internal can see all organizations
CREATE POLICY "organizations_admin_select" ON organizations
  FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin', 'internal'));

-- Admin can manage all organizations
CREATE POLICY "organizations_admin_all" ON organizations
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin');

-- DFY/Dev can see their own organization
CREATE POLICY "organizations_member_select" ON organizations
  FOR SELECT TO authenticated
  USING (
    get_user_role() IN ('dfy', 'dev')
    AND is_org_member(id)
  );

-- Org owner can update their organization
CREATE POLICY "organizations_owner_update" ON organizations
  FOR UPDATE TO authenticated
  USING (is_org_admin(id))
  WITH CHECK (is_org_admin(id));

-- ============================================================================
-- RLS POLICIES - ORGANIZATION MEMBERS
-- ============================================================================

ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Admin/Internal can see all members
CREATE POLICY "org_members_admin_select" ON organization_members
  FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin', 'internal'));

-- Admin can manage all members
CREATE POLICY "org_members_admin_all" ON organization_members
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin');

-- Members can see their org's members
CREATE POLICY "org_members_member_select" ON organization_members
  FOR SELECT TO authenticated
  USING (is_org_member(organization_id));

-- Org admin can add/update members (but not delete - deactivate instead)
CREATE POLICY "org_members_admin_insert" ON organization_members
  FOR INSERT TO authenticated
  WITH CHECK (is_org_admin(organization_id));

CREATE POLICY "org_members_admin_update" ON organization_members
  FOR UPDATE TO authenticated
  USING (is_org_admin(organization_id))
  WITH CHECK (is_org_admin(organization_id));

-- ============================================================================
-- RLS POLICIES - INVITATIONS
-- ============================================================================

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Admin/Internal can see all invitations
CREATE POLICY "invitations_admin_select" ON invitations
  FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin', 'internal'));

-- Admin can manage all invitations
CREATE POLICY "invitations_admin_all" ON invitations
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin');

-- Org admin can see their org's invitations
CREATE POLICY "invitations_org_admin_select" ON invitations
  FOR SELECT TO authenticated
  USING (
    organization_id IS NOT NULL
    AND is_org_admin(organization_id)
  );

-- Org admin can create invitations for their org (if seats available)
CREATE POLICY "invitations_org_admin_insert" ON invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IS NOT NULL
    AND is_org_admin(organization_id)
    AND org_has_available_seats(organization_id)
  );

-- Org admin can update their org's invitations (revoke, resend)
CREATE POLICY "invitations_org_admin_update" ON invitations
  FOR UPDATE TO authenticated
  USING (
    organization_id IS NOT NULL
    AND is_org_admin(organization_id)
  );

-- Public can view invitation by token (for accept page)
-- This is handled by service role in API, not RLS

-- ============================================================================
-- UPDATE PROJECT RLS FOR ORG-BASED ACCESS
-- ============================================================================

-- Drop existing DFY policy and recreate with org support
DROP POLICY IF EXISTS "projects_dfy_select" ON projects;

CREATE POLICY "projects_dfy_org_select" ON projects
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'dfy'
    AND (
      is_org_member(dfy_organization_id)
      OR dfy_partner_id = auth.uid()  -- backwards compat for legacy projects
    )
  );

-- Drop existing Dev policy and recreate with org support
DROP POLICY IF EXISTS "projects_dev_select" ON projects;

CREATE POLICY "projects_dev_org_select" ON projects
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'dev'
    AND (
      is_org_member(dev_organization_id)
      OR assigned_dev_id = auth.uid()  -- backwards compat / solo devs
    )
  );

-- ============================================================================
-- UPDATE INQUIRIES RLS FOR ORG-BASED ACCESS
-- ============================================================================

-- Drop existing DFY policy and recreate with org support
DROP POLICY IF EXISTS "inquiries_dfy_select" ON inquiries;

CREATE POLICY "inquiries_dfy_org_select" ON inquiries
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'dfy'
    AND (
      is_org_member(dfy_organization_id)
      OR submitted_by = auth.uid()  -- backwards compat
    )
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE organizations IS 'DFY and Dev agencies - team containers for partners';
COMMENT ON TABLE organization_members IS 'Users belonging to organizations with roles';
COMMENT ON TABLE invitations IS 'Unified invitation system for all user types';
COMMENT ON COLUMN invitations.type IS 'admin/internal = Hexona team, dfy_first = new agency, dfy_team/dev_team = org member, dev_solo = solo dev application';
COMMENT ON COLUMN invitations.application_data IS 'For dev_solo: portfolio, skills, availability, bio';
COMMENT ON COLUMN organization_members.role IS 'owner = created org, admin = can manage team, member = regular access';
