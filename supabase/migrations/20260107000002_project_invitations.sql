-- hexOS Project Invitations & Availability System
-- Allows admins to post project opportunities and invite devs

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE invitation_status AS ENUM (
  'pending',      -- Invitation sent, awaiting response
  'accepted',     -- Dev accepted
  'declined',     -- Dev declined
  'expired',      -- No response, invitation expired
  'withdrawn'     -- Admin withdrew invitation
);

CREATE TYPE opportunity_status AS ENUM (
  'draft',        -- Not yet published
  'open',         -- Accepting applications
  'filled',       -- Position filled
  'closed'        -- No longer available
);

CREATE TYPE application_status AS ENUM (
  'pending',      -- Awaiting review
  'shortlisted',  -- Under consideration
  'accepted',     -- Dev selected
  'rejected'      -- Not selected
);

CREATE TYPE project_complexity AS ENUM (
  'low',
  'medium',
  'high'
);

-- ============================================================================
-- PROJECT OPPORTUNITIES TABLE
-- Public/private project postings that devs can apply to
-- ============================================================================

CREATE TABLE public.project_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  -- Content
  title TEXT NOT NULL,
  description TEXT,
  requirements TEXT,

  -- Project details
  estimated_hours INT,
  tech_stack TEXT[] DEFAULT '{}',
  complexity project_complexity DEFAULT 'medium',
  deadline DATE,

  -- Visibility
  status opportunity_status DEFAULT 'draft',
  is_public BOOLEAN DEFAULT FALSE, -- Show in public directory

  -- Match scoring (optional)
  required_skills TEXT[] DEFAULT '{}',

  -- Audit
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ
);

-- ============================================================================
-- PROJECT INVITATIONS TABLE
-- Direct invitations to specific devs
-- ============================================================================

CREATE TABLE public.project_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID REFERENCES project_opportunities(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  dev_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Invitation details
  status invitation_status DEFAULT 'pending',
  message TEXT, -- Personal message from admin
  match_percentage INT, -- Optional skill match score

  -- Response
  response_message TEXT,
  responded_at TIMESTAMPTZ,

  -- Expiration
  expires_at TIMESTAMPTZ,

  -- Audit
  invited_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(project_id, dev_id) -- One invitation per dev per project
);

-- ============================================================================
-- PROJECT APPLICATIONS TABLE
-- Dev applications to public opportunities
-- ============================================================================

CREATE TABLE public.project_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES project_opportunities(id) ON DELETE CASCADE,
  dev_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Application
  status application_status DEFAULT 'pending',
  cover_message TEXT,
  estimated_completion TEXT, -- Dev's estimate

  -- Review
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(opportunity_id, dev_id) -- One application per dev per opportunity
);

-- ============================================================================
-- DEV SKILLS TABLE (for matching)
-- ============================================================================

CREATE TABLE public.dev_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dev_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill TEXT NOT NULL,
  proficiency INT DEFAULT 3 CHECK (proficiency >= 1 AND proficiency <= 5),
  years_experience DECIMAL(3,1),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(dev_id, skill)
);

-- ============================================================================
-- DEV AVAILABILITY TABLE
-- Track when devs are available for new work
-- ============================================================================

CREATE TABLE public.dev_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dev_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,

  -- Availability
  is_available BOOLEAN DEFAULT TRUE,
  available_hours_per_week INT DEFAULT 40,
  available_from DATE,

  -- Preferences
  preferred_complexity project_complexity[] DEFAULT '{medium}',
  preferred_project_types TEXT[] DEFAULT '{}',
  min_hours_per_project INT,
  max_hours_per_project INT,

  -- Bio
  headline TEXT, -- Short description
  portfolio_url TEXT,

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_opportunities_status ON project_opportunities(status);
CREATE INDEX idx_opportunities_public ON project_opportunities(is_public, status)
  WHERE is_public = TRUE AND status = 'open';
CREATE INDEX idx_opportunities_project ON project_opportunities(project_id);

CREATE INDEX idx_invitations_dev ON project_invitations(dev_id);
CREATE INDEX idx_invitations_project ON project_invitations(project_id);
CREATE INDEX idx_invitations_status ON project_invitations(status);
CREATE INDEX idx_invitations_dev_pending ON project_invitations(dev_id, status)
  WHERE status = 'pending';

CREATE INDEX idx_applications_dev ON project_applications(dev_id);
CREATE INDEX idx_applications_opportunity ON project_applications(opportunity_id);
CREATE INDEX idx_applications_status ON project_applications(status);

CREATE INDEX idx_dev_skills_dev ON dev_skills(dev_id);
CREATE INDEX idx_dev_skills_skill ON dev_skills(skill);

CREATE INDEX idx_dev_availability_available ON dev_availability(is_available)
  WHERE is_available = TRUE;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE project_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev_availability ENABLE ROW LEVEL SECURITY;

-- OPPORTUNITIES POLICIES
CREATE POLICY "opportunities_admin_all" ON project_opportunities
  FOR ALL USING (get_user_role() IN ('admin', 'internal'));

CREATE POLICY "opportunities_public_select" ON project_opportunities
  FOR SELECT USING (is_public = TRUE AND status = 'open');

CREATE POLICY "opportunities_dev_select" ON project_opportunities
  FOR SELECT USING (
    get_user_role() = 'dev' AND
    (is_public = TRUE OR EXISTS (
      SELECT 1 FROM project_invitations
      WHERE opportunity_id = project_opportunities.id
      AND dev_id = auth.uid()
    ))
  );

-- INVITATIONS POLICIES
CREATE POLICY "invitations_admin_all" ON project_invitations
  FOR ALL USING (get_user_role() IN ('admin', 'internal'));

CREATE POLICY "invitations_dev_select" ON project_invitations
  FOR SELECT USING (get_user_role() = 'dev' AND dev_id = auth.uid());

CREATE POLICY "invitations_dev_update" ON project_invitations
  FOR UPDATE USING (
    get_user_role() = 'dev' AND
    dev_id = auth.uid() AND
    status = 'pending'
  );

-- APPLICATIONS POLICIES
CREATE POLICY "applications_admin_all" ON project_applications
  FOR ALL USING (get_user_role() IN ('admin', 'internal'));

CREATE POLICY "applications_dev_own" ON project_applications
  FOR ALL USING (get_user_role() = 'dev' AND dev_id = auth.uid());

-- DEV_SKILLS POLICIES
CREATE POLICY "dev_skills_admin_select" ON dev_skills
  FOR SELECT USING (get_user_role() IN ('admin', 'internal'));

CREATE POLICY "dev_skills_own" ON dev_skills
  FOR ALL USING (dev_id = auth.uid());

-- DEV_AVAILABILITY POLICIES
CREATE POLICY "dev_availability_admin_select" ON dev_availability
  FOR SELECT USING (get_user_role() IN ('admin', 'internal'));

CREATE POLICY "dev_availability_own" ON dev_availability
  FOR ALL USING (dev_id = auth.uid());

CREATE POLICY "dev_availability_public_select" ON dev_availability
  FOR SELECT USING (is_available = TRUE); -- Available devs visible to all

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-create availability record for new devs
CREATE OR REPLACE FUNCTION create_dev_availability()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'dev' THEN
    INSERT INTO dev_availability (dev_id)
    VALUES (NEW.id)
    ON CONFLICT (dev_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER profile_dev_availability
  AFTER INSERT OR UPDATE OF role ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_dev_availability();

-- Notify dev when invited to project
CREATE OR REPLACE FUNCTION notify_project_invitation()
RETURNS TRIGGER AS $$
DECLARE
  v_project_name TEXT;
  v_opportunity_title TEXT;
BEGIN
  -- Get project name
  SELECT project_name INTO v_project_name
  FROM projects WHERE id = NEW.project_id;

  -- Get opportunity title if exists
  IF NEW.opportunity_id IS NOT NULL THEN
    SELECT title INTO v_opportunity_title
    FROM project_opportunities WHERE id = NEW.opportunity_id;
  END IF;

  -- Create notification
  INSERT INTO notifications (user_id, type, title, message, project_id, actor_id)
  VALUES (
    NEW.dev_id,
    'project_assigned',
    'New Project Invitation',
    'You have been invited to: ' || COALESCE(v_opportunity_title, v_project_name),
    NEW.project_id,
    NEW.invited_by
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER invitation_notify
  AFTER INSERT ON project_invitations
  FOR EACH ROW
  EXECUTE FUNCTION notify_project_invitation();

-- Updated_at triggers
CREATE TRIGGER opportunities_updated_at
  BEFORE UPDATE ON project_opportunities
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER invitations_updated_at
  BEFORE UPDATE ON project_invitations
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER applications_updated_at
  BEFORE UPDATE ON project_applications
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER dev_availability_updated_at
  BEFORE UPDATE ON dev_availability
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE project_opportunities IS 'Project postings that devs can apply to or be invited to';
COMMENT ON TABLE project_invitations IS 'Direct invitations from admin to specific devs';
COMMENT ON TABLE project_applications IS 'Dev applications to public opportunities';
COMMENT ON TABLE dev_skills IS 'Skills and proficiency for each dev';
COMMENT ON TABLE dev_availability IS 'Availability status and preferences for devs';
