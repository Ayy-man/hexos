# Developer Skills & Proficiency System

> RPG-style skill tracking, badges, and gamification for developer profiles

## Implementation Status

**✅ Phase 1 Complete (Core Skills System)**
- Database migration: `20260108000001_dev_skills_system.sql` ✅
- API layer: `/lib/api/dev-skills.ts` ✅
- Server actions: `/features/developer/actions/skillActions.ts` ✅
- UI components: `SkillsMatrix` ✅
- Settings page: `/settings/developer` ✅
- Navigation: Developer Profile link in dev sidebar ✅
- 30+ skills seeded from actual application form ✅

**🔜 Next Phases (Documented, Not Built)**
- Phase 2: Badge auto-awarding logic & UI
- Phase 3: Endorsement UI & social features
- Phase 4: Admin team skills dashboard
- Phase 5: Auto-intelligence (project skill tagging, assignment matching)

---

## Skill Categories (Based on Real Application Form)

### 🤖 **AI & Chatbots**
```
Chatbots                [0-10] Conversational AI, flow design, training
Voice Agents            [0-10] Voice AI, speech-to-text, telephony integration
Manychat                [0-10] Instagram/FB bots, sequences, broadcasts
Agentic Builds (code)   [0-10] Custom AI agents, function calling, tool use
Model Context Protocol  [0-10] MCP servers, tools, resources, prompts
Model Training/Tuning   [0-10] Fine-tuning, RAG, prompt optimization
On-Prem LLM Deployment  [0-10] Self-hosted models, Ollama, vLLM
```

### ⚡ **Automation Platforms**
```
n8n                     [0-10] Workflows, custom nodes, self-hosting
Make (Integromat)       [0-10] Scenarios, routers, data mapping, webhooks
Zapier                  [0-10] Zaps, multi-step, filters, formatters
```

### 🔌 **CRM & Business Platforms**
```
GHL (GoHighLevel)       [0-10] Funnels, workflows, calendars, sub-accounts
HubSpot                 [0-10] CRM, workflows, deal pipelines, integrations
Airtable                [0-10] Bases, automations, scripts, interfaces
Other CRMs              [0-10] Salesforce, Pipedrive, Monday, Notion
```

### 📧 **Marketing & Sales Automation**
```
Marketing Automations   [0-10] Email/SMS sequences, drip campaigns, triggers
Lead Qualification      [0-10] Scoring, routing, enrichment, sales automation
Sales                   [0-10] Sales processes, deal management, outreach
Marketing               [0-10] Campaigns, funnels, conversion optimization
```

### ☁️ **Cloud Platforms & APIs**
```
Meta Developer Platform [0-10] FB/IG APIs, webhooks, business API
Google Cloud            [0-10] GCP services, Firebase, Cloud Functions
AWS S3 & Similar        [0-10] S3, Lambda, storage, CDN
```

### 💻 **Development**
```
Fullstack Development   [0-10] End-to-end apps, databases, deployment
Frontend Development    [0-10] React, Next.js, TypeScript, UI/UX
Backend Development     [0-10] Node.js, Python, APIs, databases
Website Building        [0-10] Landing pages, marketing sites, CMSs
Custom Scraping         [0-10] Web scraping, data extraction, automation
Python Scripting        [0-10] Automation scripts, data processing, CLI tools
```

### 📊 **Data & Analytics**
```
Analytics Dashboards    [0-10] Charts, KPIs, real-time reporting
Data Analysis           [0-10] SQL, data manipulation, insights, visualization
```

### 🛠️ **Modern Dev Tools**
```
Vibe-coding             [0-10] Claude Code, Cursor, Copilot, AI-assisted dev
Project Management      [0-10] Planning, estimation, delivery, communication
```

---

## Proficiency Level Guide

```
0:  No experience
1:  Aware of it, never used
2:  Tutorial level, need heavy guidance
3:  Basic tasks with documentation
4:  Can build simple projects independently
5:  Comfortable, handle most common scenarios
6:  Proficient, can solve complex problems
7:  Advanced, can architect solutions
8:  Expert, mentor others, best practices
9:  Master, top 5%, create tools/frameworks
10: World-class, known in community, innovator
```

---

## Badge System

### 🏆 **Platform Mastery Badges**
```javascript
{
  'n8n Wizard':           { skill: 'n8n', level: 9, projects: 15 },
  'Make Master':          { skill: 'Make', level: 9, projects: 12 },
  'GHL Expert':           { skill: 'GHL', level: 8, projects: 10 },
  'HubSpot Pro':          { skill: 'HubSpot', level: 8, projects: 8 },
  'Airtable Architect':   { skill: 'Airtable', level: 8, projects: 10 },
  'Zapier Ninja':         { skill: 'Zapier', level: 8, projects: 10 },
}
```

### 🤖 **AI/ML Badges**
```javascript
{
  'AI Agent Builder':     { skill: 'Agentic Builds', level: 8, projects: 5 },
  'MCP Pioneer':          { skill: 'Model Context Protocol', level: 7, projects: 3 },
  'Chatbot Master':       { skill: 'Chatbots', level: 9, projects: 20 },
  'Voice AI Specialist':  { skill: 'Voice Agents', level: 8, projects: 5 },
  'ML Engineer':          { skill: 'Model Training/Tuning', level: 8, projects: 5 },
  'LLM Operator':         { skill: 'On-Prem LLM Deployment', level: 7, projects: 3 },
}
```

### 💻 **Development Badges**
```javascript
{
  'Full-Stack Hero':      { skills: ['Fullstack', 'Frontend', 'Backend'], avgLevel: 7 },
  'Frontend Wizard':      { skill: 'Frontend Development', level: 9, projects: 20 },
  'Backend Architect':    { skill: 'Backend Development', level: 9, projects: 15 },
  'API Master':           { skills: ['Backend', 'Meta Platform', 'Google Cloud'], avgLevel: 7 },
  'Vibe-Coding Pro':      { skill: 'Vibe-coding', level: 8, projects: 10 },
}
```

### 📊 **Data & Integration Badges**
```javascript
{
  'Data Wizard':          { skills: ['Data Analysis', 'Analytics Dashboards'], avgLevel: 8 },
  'Scraping Specialist':  { skill: 'Custom Scraping', level: 8, projects: 10 },
  'Cloud Engineer':       { skills: ['Google Cloud', 'AWS S3'], avgLevel: 7 },
  'Integration Expert':   { skills: ['n8n', 'Make', 'Zapier'], avgLevel: 7, count: 3 },
}
```

### 🎯 **Project Performance Badges**
```javascript
{
  'Speed Demon':          { avgDeliveryTime: 'under_estimate', count: 10 },
  'Perfect Delivery':     { onTimeDelivery: 100, projects: 15 },
  'Client Favorite':      { avgClientRating: 4.8, projects: 10 },
  'Bug Crusher':          { resolvedBlockers: 50 },
  'Documentation King':   { documentation: 9, projects: 10 },
  'Team Player':          { endorsements: 15 },
  'Mentor':               { helpedDevs: 10 },
  'Innovator':            { customSolutions: 5 },
}
```

### 🚀 **Milestone Badges**
```javascript
{
  'First Project':        { projectsCompleted: 1 },
  'Getting Started':      { projectsCompleted: 5 },
  'Experienced':          { projectsCompleted: 10 },
  'Veteran':              { projectsCompleted: 25 },
  'Legend':               { projectsCompleted: 50 },
  'MVP':                  { xp: 10000 },
  'Elite':                { level: 20 },
}
```

---

## Database Schema

```sql
-- migration: 20260108000001_dev_skills_system.sql

-- ============================================================================
-- SKILL CATEGORIES ENUM
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
-- DEV SKILLS TABLE
-- ============================================================================

CREATE TABLE dev_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dev_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Skill identification
  category skill_category NOT NULL,
  skill_name TEXT NOT NULL, -- 'n8n', 'Chatbots', 'GHL', etc.
  display_name TEXT NOT NULL, -- Human-readable name

  -- Proficiency tracking
  proficiency_level INT NOT NULL DEFAULT 0 CHECK (proficiency_level BETWEEN 0 AND 10),
  self_assessed BOOLEAN DEFAULT true,
  admin_verified BOOLEAN DEFAULT false,
  admin_adjusted_level INT, -- Admin's assessment if different

  -- Usage tracking
  projects_count INT DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  total_hours DECIMAL(10,1) DEFAULT 0, -- From time tracking

  -- Social proof
  endorsed_by UUID[], -- Array of profile IDs who endorsed this skill
  endorsement_count INT DEFAULT 0,

  -- Notes
  notes TEXT, -- Dev's notes about their experience
  portfolio_examples TEXT[], -- URLs to portfolio pieces showcasing this skill

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(dev_id, skill_name)
);

-- ============================================================================
-- BADGES TABLE
-- ============================================================================

CREATE TABLE dev_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dev_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  badge_type TEXT NOT NULL, -- 'n8n_wizard', 'full_stack_hero', etc.
  badge_name TEXT NOT NULL, -- Display name
  badge_description TEXT,
  badge_icon TEXT, -- Emoji or icon name

  earned_at TIMESTAMPTZ DEFAULT NOW(),

  -- Achievement criteria (stored for reference)
  criteria JSONB, -- { "skill": "n8n", "level": 9, "projects": 15 }

  UNIQUE(dev_id, badge_type)
);

-- ============================================================================
-- XP & LEVELING (Add to profiles table)
-- ============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS xp_points INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS level INT DEFAULT 1;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_projects_completed INT DEFAULT 0;

-- ============================================================================
-- PROJECT SKILL TAGS (For auto-tracking)
-- ============================================================================

CREATE TABLE project_skill_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id), -- Who tagged it (admin or dev)
  auto_tagged BOOLEAN DEFAULT false, -- Auto-detected vs manual
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SKILL ENDORSEMENTS
-- ============================================================================

CREATE TABLE skill_endorsements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dev_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  endorsed_by UUID NOT NULL REFERENCES profiles(id),
  comment TEXT, -- Optional comment about why endorsing
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(dev_id, skill_name, endorsed_by)
);

-- ============================================================================
-- SKILL TEMPLATES (Pre-defined skills)
-- ============================================================================

CREATE TABLE skill_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category skill_category NOT NULL,
  skill_name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- Emoji
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

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

-- Dev Skills: Devs see their own, admins see all
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

-- Badges: Public to team
CREATE POLICY "dev_badges_select" ON dev_badges
  FOR SELECT USING (true); -- All team members can see badges

CREATE POLICY "dev_badges_insert_admin" ON dev_badges
  FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'internal'));

-- Project skill tags: Project team members can see
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

-- Endorsements: Public to team
CREATE POLICY "skill_endorsements_select" ON skill_endorsements
  FOR SELECT USING (true);

CREATE POLICY "skill_endorsements_insert" ON skill_endorsements
  FOR INSERT WITH CHECK (endorsed_by = auth.uid() AND dev_id != auth.uid());

-- Skill templates: Public read
CREATE POLICY "skill_templates_select" ON skill_templates
  FOR SELECT USING (is_active = true);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Auto-increment skill usage when used in project
CREATE OR REPLACE FUNCTION increment_skill_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE dev_skills
  SET
    projects_count = projects_count + 1,
    last_used_at = NOW(),
    updated_at = NOW()
  WHERE dev_id = (SELECT assigned_dev_id FROM projects WHERE id = NEW.project_id)
    AND skill_name = NEW.skill_name;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER project_skill_tags_increment_usage
  AFTER INSERT ON project_skill_tags
  FOR EACH ROW EXECUTE FUNCTION increment_skill_usage();

-- Award XP
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

-- Check and award badges
CREATE OR REPLACE FUNCTION check_and_award_badges(p_dev_id UUID)
RETURNS VOID AS $$
DECLARE
  v_skill_record RECORD;
BEGIN
  -- n8n Wizard: level 9, 15 projects
  IF NOT EXISTS (SELECT 1 FROM dev_badges WHERE dev_id = p_dev_id AND badge_type = 'n8n_wizard') THEN
    IF EXISTS (
      SELECT 1 FROM dev_skills
      WHERE dev_id = p_dev_id
        AND skill_name = 'n8n'
        AND proficiency_level >= 9
        AND projects_count >= 15
    ) THEN
      INSERT INTO dev_badges (dev_id, badge_type, badge_name, badge_description, badge_icon)
      VALUES (p_dev_id, 'n8n_wizard', 'n8n Wizard', 'Master of n8n automation', '⚡');
    END IF;
  END IF;

  -- Add more badge checks here...

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION award_xp IS 'Award XP points to a user and calculate level progression';
COMMENT ON FUNCTION check_and_award_badges IS 'Check if user qualifies for new badges and award them';
```

---

## XP Award System

```typescript
// Award XP when events happen
const XP_AWARDS = {
  // Project milestones
  project_started: 50,
  project_completed: 200,
  project_delivered_early: 100,
  project_delivered_on_time: 50,

  // Quality metrics
  zero_bugs: 50,
  client_5_star: 50,
  client_4_star: 25,

  // Deliverables
  deliverable_completed: 10,
  all_deliverables_done: 30,

  // Collaboration
  helped_another_dev: 20,
  received_endorsement: 15,
  code_review: 10,

  // Documentation
  wrote_documentation: 15,
  added_project_notes: 5,

  // Learning
  learned_new_skill: 25,
  skill_level_up: 10,
}
```

---

## UI Pages & Components

### 1. Developer Profile Page (`/team/[dev-id]`)

**Sections:**
- **Hero:** Avatar, name, role, level, XP progress bar
- **Skills Matrix:** Grouped by category, 0-10 bars with colors
- **Badge Showcase:** Grid of earned badges (locked ones shown as grayscale)
- **Stats:**
  - Total Projects: 23
  - Avg Rating: 4.8/5
  - On-Time Delivery: 95%
  - Active Projects: 3/5
- **Recent Projects:** List with skill tags
- **Endorsements:** "Endorsed by 12 people"

### 2. Skills Matrix Component

```typescript
// features/developer/components/SkillsMatrix.tsx

// Displays all skills grouped by category
// - Color-coded progress bars (0-3: red, 4-6: yellow, 7-8: green, 9-10: cyan)
// - Editable by dev (if own profile) or admin
// - Shows endorsement count per skill
// - "Admin Verified" checkmark if verified
// - Portfolio examples as clickable chips
```

### 3. Badge Collection Component

```typescript
// features/developer/components/BadgeCollection.tsx

// Grid layout of badge cards
// - Earned badges: Full color + tooltip with criteria
// - Locked badges: Grayscale + progress bar toward unlock
// - Sort by: Rarity, Date Earned, Category
```

### 4. Skill Endorsement Component

```typescript
// features/developer/components/SkillEndorsement.tsx

// Similar to LinkedIn endorsements
// - "Endorse [Skill]" button for each skill
// - Shows endorser avatars (first 5 + count)
// - Can't endorse yourself
// - Optional comment when endorsing
```

### 5. Leaderboard Component

```typescript
// features/developer/components/DevLeaderboard.tsx

// Sortable table:
// Columns: Rank, Avatar, Name, Level, XP, Badges, Projects, Avg Rating
// Filters: This Week, This Month, All Time
// Highlights current user's row
```

### 6. XP Progress Bar

```typescript
// features/developer/components/XPProgressBar.tsx

// Shows current level progress
// Level 15 → Level 16 (320/500 XP) [████████████░░░░░░░░] 64%
```

---

## Developer Settings Page (`/settings/developer`)

**Form Fields:**
- Skills Matrix (interactive sliders 0-10)
- Portfolio Examples (per skill, URL inputs)
- Notes (textarea per skill category)
- Availability (from profiles-system.md)
- Auto-assign toggle

**Actions:**
- "Verify Skills" (admin only)
- "Request Endorsement" (sends notification to team)
- "View My Stats" (opens profile page)

---

## Admin Views

### Team Skills Dashboard (`/dashboard/admin/team-skills`)

**Skill Heatmap:**
```
                n8n  Make  GHL  HubSpot  Chatbots  Frontend
Alex Chen       10    6    10     8        9         8
Sarah Lee        7    9     5     9        7         9
Mike Brown       8    5     8     4        6         9
───────────────────────────────────────────────────────
Team Average    8.3  6.7   7.7   7.0      7.3       8.7
Team Max        10    9    10     9        9         9
```

**Skill Coverage Report:**
- ✅ **Strong Coverage** (avg ≥ 7): n8n, GHL, Frontend, Chatbots
- ⚠️ **Moderate Coverage** (avg 4-6): Make, HubSpot, Backend
- 🔴 **Weak Coverage** (avg < 4): Voice Agents, On-Prem LLM, MCP

**Hiring Recommendations:**
- "Need Voice Agents expert (team avg: 3.2)"
- "Consider hiring MCP specialist (team max: 5)"

---

## Integration with Project Assignment

```typescript
// When assigning a dev to a project:

// 1. Get project required skills from tags
const projectSkills = ['n8n', 'Chatbots', 'HubSpot']

// 2. Find available devs with skill match
const devs = await getAvailableDevs()
const scored = devs.map(dev => {
  const skillMatch = projectSkills.reduce((score, skill) => {
    const devSkill = dev.skills.find(s => s.skill_name === skill)
    return score + (devSkill?.proficiency_level || 0)
  }, 0)

  const maxScore = projectSkills.length * 10
  const matchPercent = (skillMatch / maxScore) * 100

  return { dev, skillMatch, matchPercent }
})

// 3. Show recommendations with match scores
// Alex Chen:   n8n: 10, Chatbots: 9, HubSpot: 8 → 90% match
// Sarah Lee:   n8n: 7,  Chatbots: 7, HubSpot: 9 → 77% match
// Mike Brown:  n8n: 8,  Chatbots: 6, HubSpot: 4 → 60% match
```

**UI in Project Assignment:**
```
┌─────────────────────────────────────────────────────┐
│ Assign Developer                                    │
├─────────────────────────────────────────────────────┤
│ ✅ Alex Chen           90% Match  [Assign]          │
│    n8n: 10  Chatbots: 9  HubSpot: 8                 │
│    Available, 2/5 projects, Level 15                │
│                                                     │
│ ⚠️  Sarah Lee          77% Match  [Assign]          │
│    n8n: 7   Chatbots: 7  HubSpot: 9                 │
│    Busy, 4/5 projects, Level 12                     │
│                                                     │
│ ❌ Mike Brown          60% Match  [Assign]          │
│    n8n: 8   Chatbots: 6  HubSpot: 4 ⚠️ Low          │
│    Available, 1/5 projects, Level 10                │
└─────────────────────────────────────────────────────┘
```

---

## Auto-Tagging System

```typescript
// When project is created/completed, auto-tag skills used

// Admin fills out during project creation:
"Which skills are required for this project?"
[✓] n8n
[✓] Chatbots
[✓] HubSpot
[ ] Make
[ ] GHL
...

// On project completion:
// 1. Create project_skill_tags records
// 2. Increment dev's skill usage counts
// 3. Award XP
// 4. Check for badge unlocks
// 5. Potentially level up skill if thresholds met
```

---

## Implementation Phases

### Phase 1: Core Skills System (P0)
- [ ] Database migration with all tables
- [ ] Seed skill_templates with real skills
- [ ] `/settings/developer` page with skills matrix
- [ ] Skills editing (sliders 0-10)
- [ ] Basic profile view with skills

### Phase 2: Gamification (P1)
- [ ] XP system and leveling
- [ ] Badge definitions and auto-awarding
- [ ] Badge collection UI
- [ ] XP progress bars
- [ ] Project completion → XP awards

### Phase 3: Social Features (P1)
- [ ] Skill endorsements
- [ ] Endorsement UI on profiles
- [ ] "Request endorsement" notifications

### Phase 4: Admin Tools (P2)
- [ ] Team skills dashboard
- [ ] Skill heatmap
- [ ] Skill coverage report
- [ ] Admin verification of skills
- [ ] Hiring recommendations

### Phase 5: Auto-Intelligence (P2)
- [ ] Project skill tagging
- [ ] Auto-increment usage on project completion
- [ ] Skill match scoring for assignment
- [ ] Skill recommendations based on project history
- [ ] "Suggested skills to learn" for devs

---

Want me to build Phase 1 (core skills matrix + database) now?
