-- Developer Skills & Gamification System
-- Skills matrix, badges, XP, leveling, and endorsements

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE skill_category AS ENUM (
  'ai_chatbots',           -- AI & Chatbots
  'automation_platforms',  -- n8n, Make, Zapier
  'crm_platforms',        -- GHL, HubSpot, Airtable
  'marketing_sales',      -- Marketing & Sales Automation
  'cloud_apis',           -- Cloud Platforms & APIs
  'development',          -- Full-stack, Frontend, Backend
  'data_analytics',       -- Data & Analytics
  'modern_tools'          -- Vibe-coding, Project Management
);

-- ============================================================================
-- TABLES
-- ============================================================================

-- Developer Skills
CREATE TABLE dev_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dev_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Skill identification
  category skill_category NOT NULL,
  skill_name TEXT NOT NULL,
  display_name TEXT NOT NULL,

  -- Proficiency tracking
  proficiency_level INT NOT NULL DEFAULT 0 CHECK (proficiency_level BETWEEN 0 AND 10),
  self_assessed BOOLEAN DEFAULT true,
  admin_verified BOOLEAN DEFAULT false,
  admin_adjusted_level INT CHECK (admin_adjusted_level IS NULL OR (admin_adjusted_level BETWEEN 0 AND 10)),

  -- Usage tracking
  projects_count INT DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  total_hours DECIMAL(10,1) DEFAULT 0,

  -- Social proof
  endorsed_by UUID[] DEFAULT ARRAY[]::UUID[],
  endorsement_count INT DEFAULT 0,

  -- Notes
  notes TEXT,
  portfolio_examples TEXT[] DEFAULT ARRAY[]::TEXT[],

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(dev_id, skill_name)
);

-- Badges
CREATE TABLE dev_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dev_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  badge_type TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  badge_description TEXT,
  badge_icon TEXT,

  earned_at TIMESTAMPTZ DEFAULT NOW(),

  -- Achievement criteria (stored for reference)
  criteria JSONB,

  UNIQUE(dev_id, badge_type)
);

-- Project Skill Tags
CREATE TABLE project_skill_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id),
  auto_tagged BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Skill Endorsements
CREATE TABLE skill_endorsements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dev_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  endorsed_by UUID NOT NULL REFERENCES profiles(id),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(dev_id, skill_name, endorsed_by)
);

-- Skill Templates (Pre-defined skills list)
CREATE TABLE skill_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category skill_category NOT NULL,
  skill_name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- ============================================================================
-- ADD COLUMNS TO PROFILES (XP & Leveling)
-- ============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS xp_points INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS level INT DEFAULT 1;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_projects_completed INT DEFAULT 0;

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_dev_skills_dev_id ON dev_skills(dev_id);
CREATE INDEX idx_dev_skills_category ON dev_skills(category);
CREATE INDEX idx_dev_skills_proficiency ON dev_skills(dev_id, proficiency_level DESC);
CREATE INDEX idx_dev_skills_verified ON dev_skills(admin_verified, proficiency_level DESC);
CREATE INDEX idx_dev_badges_dev_id ON dev_badges(dev_id);
CREATE INDEX idx_dev_badges_type ON dev_badges(badge_type);
CREATE INDEX idx_project_skill_tags_project ON project_skill_tags(project_id);
CREATE INDEX idx_project_skill_tags_skill ON project_skill_tags(skill_name);
CREATE INDEX idx_skill_endorsements_dev ON skill_endorsements(dev_id);
CREATE INDEX idx_skill_endorsements_by ON skill_endorsements(endorsed_by);
CREATE INDEX idx_profiles_xp ON profiles(xp_points DESC, level DESC);

-- ============================================================================
-- SEED SKILL TEMPLATES
-- ============================================================================

INSERT INTO skill_templates (category, skill_name, display_name, description, icon, sort_order) VALUES
-- AI & Chatbots
('ai_chatbots', 'chatbots', 'Chatbots', 'Conversational AI, flow design, training', '🤖', 1),
('ai_chatbots', 'voice_agents', 'Voice Agents', 'Voice AI, speech-to-text, telephony', '🎤', 2),
('ai_chatbots', 'manychat', 'Manychat', 'Instagram/FB bots, sequences, broadcasts', '💬', 3),
('ai_chatbots', 'agentic_builds', 'Agentic Builds (code)', 'Custom AI agents, function calling', '🦾', 4),
('ai_chatbots', 'mcp', 'Model Context Protocol', 'MCP servers, tools, resources', '🔌', 5),
('ai_chatbots', 'model_training', 'Model Training/Tuning', 'Fine-tuning, RAG, prompt optimization', '🧠', 6),
('ai_chatbots', 'on_prem_llm', 'On-Prem LLM Deployment', 'Self-hosted models, Ollama, vLLM', '🖥️', 7),

-- Automation Platforms
('automation_platforms', 'n8n', 'n8n', 'Workflows, custom nodes, self-hosting', '⚡', 10),
('automation_platforms', 'make', 'Make (Integromat)', 'Scenarios, routers, data mapping', '🔄', 11),
('automation_platforms', 'zapier', 'Zapier', 'Zaps, multi-step, filters, formatters', '⚙️', 12),

-- CRM & Business Platforms
('crm_platforms', 'ghl', 'GHL (GoHighLevel)', 'Funnels, workflows, calendars, sub-accounts', '🏢', 20),
('crm_platforms', 'hubspot', 'HubSpot', 'CRM, workflows, deal pipelines, integrations', '🔶', 21),
('crm_platforms', 'airtable', 'Airtable', 'Bases, automations, scripts, interfaces', '📊', 22),
('crm_platforms', 'other_crms', 'Other CRMs', 'Salesforce, Pipedrive, Monday, Notion', '📋', 23),

-- Marketing & Sales
('marketing_sales', 'marketing_automation', 'Marketing Automations', 'Email/SMS sequences, drip campaigns', '📧', 30),
('marketing_sales', 'lead_qualification', 'Lead Qualification/Ranking', 'Scoring, routing, enrichment, automation', '🎯', 31),
('marketing_sales', 'sales', 'Sales', 'Sales processes, deal management, outreach', '💰', 32),
('marketing_sales', 'marketing', 'Marketing', 'Campaigns, funnels, conversion optimization', '📈', 33),

-- Cloud & APIs
('cloud_apis', 'meta_platform', 'Meta Developer Platform', 'FB/IG APIs, webhooks, business API', '🔵', 40),
('cloud_apis', 'google_cloud', 'Google Cloud Integration', 'GCP services, Firebase, Cloud Functions', '☁️', 41),
('cloud_apis', 'aws_s3', 'AWS S3 & Similar', 'S3, Lambda, storage, CDN', '📦', 42),

-- Development
('development', 'fullstack', 'Fullstack Development', 'End-to-end apps, databases, deployment', '💻', 50),
('development', 'frontend', 'Frontend Development', 'React, Next.js, TypeScript, UI/UX', '🎨', 51),
('development', 'backend', 'Backend Development', 'Node.js, Python, APIs, databases', '⚙️', 52),
('development', 'website_building', 'Website Building', 'Landing pages, marketing sites, CMSs', '🌐', 53),
('development', 'custom_scraping', 'Custom Scraping', 'Web scraping, data extraction, automation', '🕷️', 54),
('development', 'python_scripting', 'Python Scripting', 'Automation scripts, data processing, CLI', '🐍', 55),

-- Data & Analytics
('data_analytics', 'analytics_dashboards', 'Analytics/Reporting Dashboards', 'Charts, KPIs, real-time reporting', '📊', 60),
('data_analytics', 'data_analysis', 'Data Analysis', 'SQL, data manipulation, insights', '📉', 61),

-- Modern Tools
('modern_tools', 'vibe_coding', 'Vibe-coding', 'Claude Code, Cursor, Copilot, AI-assisted dev', '✨', 70),
('modern_tools', 'project_management', 'Project Management', 'Planning, estimation, delivery, communication', '📅', 71);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE dev_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_skill_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_endorsements ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_templates ENABLE ROW LEVEL SECURITY;

-- Dev Skills Policies
CREATE POLICY "dev_skills_select" ON dev_skills
  FOR SELECT USING (
    dev_id = auth.uid() OR
    get_user_role() IN ('admin', 'internal')
  );

CREATE POLICY "dev_skills_insert_own" ON dev_skills
  FOR INSERT WITH CHECK (dev_id = auth.uid());

CREATE POLICY "dev_skills_update_own" ON dev_skills
  FOR UPDATE USING (dev_id = auth.uid())
  WITH CHECK (dev_id = auth.uid());

CREATE POLICY "dev_skills_update_admin" ON dev_skills
  FOR UPDATE USING (get_user_role() IN ('admin', 'internal'));

CREATE POLICY "dev_skills_delete_own" ON dev_skills
  FOR DELETE USING (dev_id = auth.uid() OR get_user_role() IN ('admin', 'internal'));

-- Badges Policies (Public to team)
CREATE POLICY "dev_badges_select" ON dev_badges
  FOR SELECT USING (true);

CREATE POLICY "dev_badges_insert_admin" ON dev_badges
  FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'internal'));

CREATE POLICY "dev_badges_delete_admin" ON dev_badges
  FOR DELETE USING (get_user_role() IN ('admin', 'internal'));

-- Project Skill Tags Policies
CREATE POLICY "project_skill_tags_select" ON project_skill_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id
      AND can_access_project(p.id)
    )
  );

CREATE POLICY "project_skill_tags_insert" ON project_skill_tags
  FOR INSERT WITH CHECK (
    get_user_role() IN ('admin', 'internal') OR
    (auth.uid() = created_by AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id AND p.assigned_dev_id = auth.uid()
    ))
  );

CREATE POLICY "project_skill_tags_delete" ON project_skill_tags
  FOR DELETE USING (
    get_user_role() IN ('admin', 'internal') OR
    created_by = auth.uid()
  );

-- Endorsements Policies (Public to team)
CREATE POLICY "skill_endorsements_select" ON skill_endorsements
  FOR SELECT USING (true);

CREATE POLICY "skill_endorsements_insert" ON skill_endorsements
  FOR INSERT WITH CHECK (endorsed_by = auth.uid() AND dev_id != auth.uid());

CREATE POLICY "skill_endorsements_delete_own" ON skill_endorsements
  FOR DELETE USING (endorsed_by = auth.uid());

-- Skill Templates Policies (Public read)
CREATE POLICY "skill_templates_select" ON skill_templates
  FOR SELECT USING (is_active = true);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Increment skill usage when used in project
CREATE OR REPLACE FUNCTION increment_skill_usage()
RETURNS TRIGGER AS $$
DECLARE
  v_assigned_dev UUID;
BEGIN
  -- Get assigned dev from project
  SELECT assigned_dev_id INTO v_assigned_dev
  FROM projects WHERE id = NEW.project_id;

  -- Increment if dev has this skill
  IF v_assigned_dev IS NOT NULL THEN
    UPDATE dev_skills
    SET
      projects_count = projects_count + 1,
      last_used_at = NOW(),
      updated_at = NOW()
    WHERE dev_id = v_assigned_dev
      AND skill_name = NEW.skill_name;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER project_skill_tags_increment_usage
  AFTER INSERT ON project_skill_tags
  FOR EACH ROW EXECUTE FUNCTION increment_skill_usage();

COMMENT ON TRIGGER project_skill_tags_increment_usage ON project_skill_tags IS
  'Auto-increment skill usage count when skill is tagged on a project';

-- Award XP to user
CREATE OR REPLACE FUNCTION award_xp(p_user_id UUID, p_xp_amount INT)
RETURNS VOID AS $$
DECLARE
  v_new_xp INT;
  v_new_level INT;
BEGIN
  -- Add XP
  UPDATE profiles
  SET xp_points = xp_points + p_xp_amount
  WHERE id = p_user_id
  RETURNING xp_points INTO v_new_xp;

  -- Calculate new level (every 500 XP = 1 level)
  v_new_level := 1 + (v_new_xp / 500);

  -- Update level if changed
  UPDATE profiles
  SET level = v_new_level
  WHERE id = p_user_id AND level < v_new_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION award_xp IS 'Award XP points to a user and calculate level progression (500 XP per level)';

-- Update endorsement count
CREATE OR REPLACE FUNCTION update_endorsement_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Add endorser to array and increment count
    UPDATE dev_skills
    SET
      endorsed_by = array_append(endorsed_by, NEW.endorsed_by),
      endorsement_count = endorsement_count + 1,
      updated_at = NOW()
    WHERE dev_id = NEW.dev_id AND skill_name = NEW.skill_name;

    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Remove endorser from array and decrement count
    UPDATE dev_skills
    SET
      endorsed_by = array_remove(endorsed_by, OLD.endorsed_by),
      endorsement_count = GREATEST(0, endorsement_count - 1),
      updated_at = NOW()
    WHERE dev_id = OLD.dev_id AND skill_name = OLD.skill_name;

    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER skill_endorsements_update_count
  AFTER INSERT OR DELETE ON skill_endorsements
  FOR EACH ROW EXECUTE FUNCTION update_endorsement_count();

COMMENT ON TRIGGER skill_endorsements_update_count ON skill_endorsements IS
  'Auto-update endorsement count and array on dev_skills when endorsement is added/removed';

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE dev_skills IS 'Developer skill proficiencies with usage tracking and endorsements';
COMMENT ON TABLE dev_badges IS 'Achievement badges earned by developers';
COMMENT ON TABLE project_skill_tags IS 'Skills used in projects for tracking and matching';
COMMENT ON TABLE skill_endorsements IS 'Peer endorsements of developer skills';
COMMENT ON TABLE skill_templates IS 'Pre-defined list of skills based on application form';
