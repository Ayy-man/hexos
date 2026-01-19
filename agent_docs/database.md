# Database

> **Note:** After the RLS crisis of 2026-01-03, some functions were removed. See `security.md` for safe patterns.

## Migration Workflow

```bash
# Create new migration
pnpm supabase migration new <n>

# Apply migrations locally
pnpm supabase db reset

# Generate TypeScript types
pnpm supabase:types

# Push to production
pnpm supabase db push
```

**Rules:**
- Never edit old migration files
- Each schema change = new migration file
- Always regenerate types after migration
- Test locally before pushing to prod

## Core Schema

### Enums

```sql
CREATE TYPE user_role AS ENUM ('admin', 'internal', 'dev', 'dfy', 'client');

-- Projects start at sign-off phase after conversion from inquiry
-- Inquiry/proposal phases handled at inquiry level via proposal_stage
CREATE TYPE project_status AS ENUM (
  -- Sign-off
  'deliverables_pending', 'awaiting_signoff', 'signed_off',
  -- Agreement
  'agreement_sent', 'agreement_signed',
  -- Payment
  'payment_pending', 'payment_partial', 'payment_paid',
  -- Onboarding
  'collecting_access', 'access_complete', 'dev_assigned',
  -- Development
  'in_progress', 'blocked_client', 'blocked_internal', 'review_checkpoint', 'revisions', 'final_qa',
  -- Delivery
  'delivered', 'acceptance_pending', 'accepted',
  -- Closed
  'completed', 'cancelled', 'on_hold'
);

CREATE TYPE project_type AS ENUM ('blueprint', 'blueprint_custom', 'full_custom');
CREATE TYPE operational_mode AS ENUM ('internal', 'hexona_devs', 'hexona_devs_dfy');
CREATE TYPE payment_structure AS ENUM ('100_upfront', '50_50', '40_30_30', 'custom');
CREATE TYPE scope_change_trigger AS ENUM ('client_request', 'dev_flag', 'deliverable_modified', 'timeline_extended');

-- Proposal workflow stages (ClickUp-style pipeline)
CREATE TYPE proposal_stage AS ENUM (
  'unopened',        -- Newly submitted, not yet reviewed
  'admin_reviewed',  -- Admin has viewed the inquiry
  'in_queue',        -- In the proposal queue
  'working',         -- Actively working on proposal
  'on_hold',         -- Paused (client request, timing, etc.)
  'final_review',    -- Final internal review
  'ready',           -- Ready to send to partner
  'sent',            -- Proposal sent to DFY partner (auto-transitions on submit)
  'closed',          -- Deal won, converted to project (auto-transitions on conversion)
  'lost'             -- Deal lost, no conversion
);

-- Deliverables negotiation status
CREATE TYPE deliverables_negotiation_status AS ENUM (
  'none',            -- No negotiation started
  'parsing',         -- AI parsing proposal
  'dfy_editing',     -- DFY editing deliverables
  'dfy_submitted',   -- DFY submitted for review
  'int_reviewing',   -- Internal team reviewing
  'approved',        -- Negotiation approved
  'needs_revision'   -- Sent back for revision
);

-- Deliverable change status
CREATE TYPE deliverable_change_status AS ENUM (
  'original',   -- Original from AI parse
  'edited',     -- DFY edited
  'added',      -- DFY added
  'removed',    -- DFY marked for removal
  'approved',   -- INT approved
  'rejected',   -- INT rejected
  'countered'   -- INT countered with different price
);

-- Deliverable source
CREATE TYPE deliverable_source AS ENUM (
  'ai_parsed',       -- Parsed from proposal by AI
  'blueprint_tier',  -- Added from blueprint tier
  'custom'           -- Manually added
);

-- Project requirement status
CREATE TYPE requirement_status AS ENUM (
  'pending',     -- Not started
  'in_progress', -- Being worked on
  'completed',   -- Done
  'blocked'      -- Blocked by something
);

-- Onboarding requirement owner (who is responsible)
CREATE TYPE requirement_owner AS ENUM (
  'hexona',  -- Hexona team
  'dfy',     -- DFY partner
  'client'   -- End client
);

-- Onboarding requirement blocker type
CREATE TYPE requirement_blocker AS ENUM (
  'none',      -- Not a blocker
  'partial',   -- Partial blocker (work can proceed partially)
  'absolute'   -- Absolute blocker (must complete before proceeding)
);

-- Onboarding requirement status
CREATE TYPE onboarding_requirement_status AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'blocked',
  'not_applicable'
);
```

> **Note:** `pulse_target_status` enum was removed in January 2026 along with all Pulse tables. See migration `20260112000005_remove_pulse_system.sql`.

### Core Tables

```sql
-- Users (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'client',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  dfy_partner_id UUID REFERENCES profiles(id),
  assigned_dev_id UUID REFERENCES profiles(id),
  client_id UUID REFERENCES profiles(id),
  
  -- Core info
  project_name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_business TEXT,
  
  -- Classification
  status project_status DEFAULT 'inquiry_new',
  project_type project_type,
  operational_mode operational_mode DEFAULT 'internal',
  blueprint_match_score INT,
  matched_blueprint_id UUID,
  
  -- Financials (Admin only via RLS)
  quoted_price DECIMAL(10,2),
  dev_cost DECIMAL(10,2),
  dfy_commission_pct DECIMAL(5,2),
  payment_structure payment_structure DEFAULT '50_50',
  
  -- Dates
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  proposal_sent_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  target_delivery_date DATE,
  delivered_at TIMESTAMPTZ,

  notes TEXT
);

-- Deliverables (source of truth for timeline/Gantt)
CREATE TABLE public.deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending', -- pending, in_progress, blocked, done
  
  estimated_hours DECIMAL(5,1),
  start_date DATE,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Files (Two-Workspace System)
CREATE TABLE public.project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES project_files(id) ON DELETE CASCADE, -- For nested folders
  deliverable_id UUID REFERENCES deliverables(id),

  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INT,
  content_type TEXT NOT NULL,           -- 'folder', 'document', or MIME type

  -- Two-Workspace Visibility
  visibility TEXT NOT NULL CHECK (visibility IN ('internal', 'client')),
  shared_to TEXT CHECK (shared_to IN ('internal', 'client') OR shared_to IS NULL),

  -- Content storage
  content JSONB,                         -- For documents (Plate.js format)
  storage_path TEXT,                     -- For uploaded files (Supabase Storage)

  position INT DEFAULT 0,                -- Sort order within parent
  uploaded_by UUID REFERENCES profiles(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment Milestones
CREATE TABLE public.payment_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  label TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  stripe_payment_id TEXT,

  sort_order INT DEFAULT 0
);

-- Invoices (Stripe Integration)
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Links
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  milestone_id UUID REFERENCES payment_milestones(id) ON DELETE SET NULL,

  -- Invoice details
  invoice_number TEXT UNIQUE NOT NULL,  -- HEX-0001 format
  status TEXT DEFAULT 'draft',           -- draft, sent, paid, void, overdue

  -- Amounts (in cents)
  subtotal INT NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,4) DEFAULT 0,
  tax_amount INT NOT NULL DEFAULT 0,
  total INT NOT NULL DEFAULT 0,

  -- Dates
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,

  -- Stripe
  stripe_invoice_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_hosted_url TEXT,
  stripe_pdf_url TEXT,

  -- Recipient
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_company TEXT,

  -- Line items (JSONB array)
  line_items JSONB NOT NULL DEFAULT '[]',

  notes TEXT
);

-- Auto-generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  next_num INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 5) AS INT)), 0) + 1
  INTO next_num
  FROM invoices;

  RETURN 'HEX-' || LPAD(next_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Scope Changes
CREATE TABLE public.scope_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  trigger_type scope_change_trigger NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'detected', -- detected, pending_review, approved, denied
  price_adjustment DECIMAL(10,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id)
);

-- Activity Log
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blueprints (productized services catalog)
CREATE TABLE public.blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  default_deliverables JSONB,
  estimated_hours INT,
  base_price DECIMAL(10,2),
  content JSONB,              -- Rich text content (Plate.js format)
  pricing_tiers JSONB,        -- Structured tier pricing
  tags TEXT[],                -- Free-form filtering tags
  status TEXT DEFAULT 'draft', -- draft/published
  icon TEXT,                  -- Emoji icon
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inquiries (DFY partner submissions)
CREATE TABLE public.inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by UUID REFERENCES profiles(id),
  partner_name TEXT NOT NULL,
  submission_type TEXT NOT NULL,      -- 'closed' or 'proposal'
  deal_type TEXT,                      -- e.g., 'new_blueprint', 'existing_blueprint'
  form_path TEXT NOT NULL,             -- Branch taken in form (e.g., 'A1', 'B2')
  prospect_company_name TEXT,
  prospect_website TEXT,
  industry TEXT,
  blueprint_id UUID REFERENCES blueprints(id),
  form_data JSONB,                     -- All form field values
  forward_emails TEXT[],
  status TEXT DEFAULT 'new',           -- new, processing, converted, rejected
  converted_to_project_id UUID REFERENCES projects(id),
  document_content JSONB,              -- Rich text document (Plate.js format)
  inline_discussions JSONB DEFAULT '[]', -- Persisted inline comment threads

  -- Proposal workflow (Phase 4.6)
  proposal_stage proposal_stage DEFAULT 'unopened',
  stage_entered_at TIMESTAMPTZ DEFAULT NOW(),
  stage_history JSONB DEFAULT '[]',   -- Array of { from, to, changed_by, changed_at, notes }
  priority TEXT DEFAULT 'normal',      -- low, normal, high, urgent
  due_date DATE,
  assigned_to UUID REFERENCES profiles(id),

  -- Pricing fields (renamed 2026-01-05)
  price_dfy DECIMAL(10,2),              -- What client pays (was estimated_value)
  price_hexona DECIMAL(10,2),           -- What Hexona charges DFY partner
  price_dev DECIMAL(10,2),              -- What Hexona pays developer
  pricing_notes TEXT,

  -- Lifecycle dates (added 2026-01-05)
  date_inquiry TIMESTAMPTZ,             -- When inquiry was submitted
  date_proposal_sent TIMESTAMPTZ,       -- When proposal was sent

  -- Proposal content (Phase 4.7)
  proposal_content JSONB,              -- Rich text proposal (Plate.js format)
  proposal_discussions JSONB DEFAULT '[]', -- Inline discussions
  proposal_whiteboard JSONB,           -- Whiteboard for proposal (added 2026-01-05)
  proposal_submitted_at TIMESTAMPTZ,
  proposal_submitted_by UUID REFERENCES profiles(id),
  dfy_version_content JSONB,           -- DFY private copy of proposal

  -- Client view link (P1)
  public_token UUID DEFAULT gen_random_uuid(),
  client_viewed_at TIMESTAMPTZ,
  client_view_count INT DEFAULT 0,

  -- Deliverables negotiation (Phase 4.8)
  deliverables_status deliverables_negotiation_status DEFAULT 'none',
  closed_at TIMESTAMPTZ,               -- When DFY marked deal as closed
  closed_by UUID REFERENCES profiles(id),
  closed_notes TEXT,
  client_email TEXT,                   -- Client email for project conversion

  archived_at TIMESTAMPTZ,
  archived_by UUID REFERENCES profiles(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inquiry Comments (sidebar comment threads)
CREATE TYPE comment_type AS ENUM ('internal', 'dfy', 'proposal');

CREATE TABLE public.inquiry_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID REFERENCES inquiries(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  content TEXT NOT NULL,
  comment_type comment_type DEFAULT 'internal',
  parent_id UUID REFERENCES inquiry_comments(id), -- For threaded replies
  resolved BOOLEAN DEFAULT false,
  synced_message_id UUID REFERENCES messages(id) ON DELETE SET NULL, -- Bidirectional sync
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversations System
CREATE TYPE conversation_type AS ENUM ('project', 'workspace', 'partner', 'direct', 'inquiry');

CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  inquiry_id UUID REFERENCES inquiries(id) ON DELETE CASCADE,
  type conversation_type NOT NULL,
  title TEXT,  -- For direct conversations
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  synced_inquiry_comment_id UUID REFERENCES inquiry_comments(id) ON DELETE SET NULL, -- Bidirectional sync
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.conversation_read_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_message_id UUID REFERENCES messages(id),
  UNIQUE(conversation_id, user_id)
);

CREATE TABLE public.direct_conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- Proposal Deliverables (Phase 4.8 - negotiated deliverables)
CREATE TABLE public.proposal_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  source deliverable_source DEFAULT 'custom',
  source_blueprint_id UUID REFERENCES blueprints(id),
  source_tier_name TEXT,
  ai_confidence DECIMAL(3,2),       -- AI parsing confidence 0-1
  ai_source_text TEXT,              -- Original text AI parsed from
  change_status deliverable_change_status DEFAULT 'original',
  original_name TEXT,               -- Pre-edit values for diff display
  original_description TEXT,
  original_price DECIMAL(10,2),
  counter_price DECIMAL(10,2),      -- INT counter-offer price
  counter_note TEXT,                -- INT counter-offer note
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  sort_order INT DEFAULT 0
);

-- Proposal Deliverable Comments (per-deliverable discussion)
CREATE TABLE public.proposal_deliverable_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID NOT NULL REFERENCES proposal_deliverables(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Requirements (DEPRECATED)
-- Use onboarding_requirements instead - supports tree structure via parent_id
-- This table kept for backward compatibility with old RequirementsTab
-- TODO: Migrate existing data and remove this table
CREATE TABLE public.project_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status requirement_status DEFAULT 'pending',
  file_id UUID REFERENCES project_files(id),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES profiles(id),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Requirement Templates (library of reusable templates)
CREATE TABLE public.requirement_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  loom_url TEXT,                                    -- Optional tutorial video
  default_owner requirement_owner DEFAULT 'hexona',
  default_blocker requirement_blocker DEFAULT 'none',
  category TEXT NOT NULL,                           -- platform_access, credentials, assets, setup, payments
  parent_id UUID REFERENCES requirement_templates(id) ON DELETE CASCADE,  -- For hierarchical templates
  position INT DEFAULT 0,                           -- Sort order within siblings
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Onboarding Requirements (tree-structured requirements for projects)
CREATE TABLE public.onboarding_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES onboarding_requirements(id) ON DELETE CASCADE, -- For nesting
  title TEXT NOT NULL,
  description TEXT,
  notes TEXT,                                       -- Internal notes
  owner_type requirement_owner DEFAULT 'hexona',
  blocker_type requirement_blocker DEFAULT 'none',
  status onboarding_requirement_status DEFAULT 'pending',
  loom_url TEXT,
  resource_url TEXT,
  position INT DEFAULT 0,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Requirement Attachments (files attached to onboarding requirements)
CREATE TABLE public.requirement_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID NOT NULL REFERENCES onboarding_requirements(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,                          -- Supabase Storage path
  file_size INT,
  file_type TEXT,
  uploaded_by UUID REFERENCES profiles(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Relationships

```
profiles 1──* projects (as dfy_partner, assigned_dev, client)
profiles 1──* inquiries (as submitted_by)
projects 1──* deliverables
projects 1──* project_files
project_files 1──* project_files (via parent_id for nested folders)
projects 1──* payment_milestones
projects 1──* scope_changes
projects 1──* activity_log
projects 1──* project_requirements
projects 1──* invoices
deliverables 1──* project_files
payment_milestones 1──* invoices
blueprints 1──* projects (via matched_blueprint_id)
blueprints 1──* inquiries (via blueprint_id)
inquiries 1──* inquiry_comments
inquiries 1──* proposal_deliverables
inquiries 1──1 projects (via converted_to_project_id)
inquiries 1──1 conversations (via inquiry_id, type='inquiry')
projects 1──1 inquiries (via source_inquiry_id)
projects 1──* conversations (via project_id)
inquiry_comments 1──* inquiry_comments (threaded replies via parent_id)
inquiry_comments 1──1 messages (bidirectional sync via synced_message_id/synced_inquiry_comment_id)
conversations 1──* messages
conversations 1──* direct_conversation_participants (for direct type)
conversations 1──* conversation_read_status
proposal_deliverables 1──* proposal_deliverable_comments
requirement_templates 1──* requirement_templates (via parent_id for hierarchical templates)
projects 1──* onboarding_requirements
onboarding_requirements 1──* onboarding_requirements (via parent_id for nesting)
onboarding_requirements 1──* requirement_attachments
```

## Indexes

```sql
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_dfy ON projects(dfy_partner_id);
CREATE INDEX idx_projects_dev ON projects(assigned_dev_id);
CREATE INDEX idx_projects_client ON projects(client_id);
CREATE INDEX idx_projects_source_inquiry ON projects(source_inquiry_id);
CREATE INDEX idx_deliverables_project ON deliverables(project_id);
CREATE INDEX idx_activity_project ON activity_log(project_id);
CREATE INDEX idx_inquiries_submitted_by ON inquiries(submitted_by);
CREATE INDEX idx_inquiries_status ON inquiries(status);
CREATE INDEX idx_inquiries_proposal_stage ON inquiries(proposal_stage);
CREATE INDEX idx_inquiries_public_token ON inquiries(public_token);
CREATE INDEX idx_inquiries_deliverables_status ON inquiries(deliverables_status);
CREATE INDEX idx_inquiry_comments_inquiry ON inquiry_comments(inquiry_id);
CREATE INDEX idx_proposal_deliverables_inquiry ON proposal_deliverables(inquiry_id);
CREATE INDEX idx_proposal_deliverable_comments_deliverable ON proposal_deliverable_comments(deliverable_id);
CREATE INDEX idx_project_requirements_project ON project_requirements(project_id);
CREATE INDEX idx_requirement_templates_parent ON requirement_templates(parent_id);
CREATE INDEX idx_requirement_templates_category ON requirement_templates(category);
CREATE INDEX idx_onboarding_requirements_project ON onboarding_requirements(project_id);
CREATE INDEX idx_onboarding_requirements_parent ON onboarding_requirements(parent_id);
CREATE INDEX idx_onboarding_requirements_status ON onboarding_requirements(status);
CREATE INDEX idx_requirement_attachments_requirement ON requirement_attachments(requirement_id);
CREATE INDEX idx_project_files_parent ON project_files(parent_id);
CREATE INDEX idx_project_files_shared_to ON project_files(shared_to) WHERE shared_to IS NOT NULL;
CREATE INDEX idx_invoices_project ON invoices(project_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
```

See `security.md` for RLS policies on these tables.

**Important:** When writing RLS helper functions, NEVER create functions that query the same table they protect. This caused a major outage on 2026-01-03. See `security.md` → "RLS Crisis Lessons" for details.

## Phase 4.2 Tables (Gameplan + Logging)

### Project Documents (Gameplan Tab)

```sql
-- Rich text documents for project planning
CREATE TABLE project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,        -- 'gameplan', 'notes', etc.
  content JSONB,             -- Plate.js JSON content
  discussions JSONB,         -- Inline discussions
  created_by UUID REFERENCES profiles(id),
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, slug)
);

-- Version history for documents
CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES project_documents(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  content JSONB NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  description TEXT,
  is_checkpoint BOOLEAN DEFAULT FALSE,
  UNIQUE(document_id, version_number)
);
```

**RLS:** Admin, internal, and assigned dev only - NOT visible to DFY/client.

### Dev Logging System

```sql
-- Daily check-ins from devs
CREATE TABLE dev_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  checkin_date DATE NOT NULL,
  checkin_type TEXT CHECK (checkin_type IN ('progress', 'no_work', 'delay')),
  summary TEXT,
  locked_at TIMESTAMPTZ,     -- Can't edit after this time (created_at + 24h)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, project_id, checkin_date)
);

-- Per-deliverable notes within a check-in
CREATE TABLE checkin_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id UUID NOT NULL REFERENCES dev_checkins(id) ON DELETE CASCADE,
  deliverable_id UUID NOT NULL REFERENCES deliverables(id),
  note TEXT,
  position_before INT,
  position_after INT,
  position_delta INT,        -- -5, 0, +5, +10
  UNIQUE(checkin_id, deliverable_id)
);

-- Snooze tracking for check-in reminders
CREATE TABLE checkin_snoozes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  snoozed_until TIMESTAMPTZ NOT NULL,
  UNIQUE(user_id)
);

-- Profile addition
ALTER TABLE profiles ADD COLUMN day_ends_at TIME DEFAULT '18:00';
```

### Delay Tracking

```sql
CREATE TYPE delay_type AS ENUM ('client_delay', 'dev_delay');

CREATE TABLE project_delays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  delay_type delay_type NOT NULL,
  delay_date DATE NOT NULL,
  days_count INT DEFAULT 1,
  deliverable_id UUID REFERENCES deliverables(id),
  blocker_id UUID REFERENCES blockers(id),
  reason TEXT NOT NULL,
  marked_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_delay_date CHECK (delay_date >= CURRENT_DATE - INTERVAL '3 days')
);
```

- `client_delay` - Adjusts expected progress timeline
- `dev_delay` - For accountability tracking only

### Project Extensions

```sql
CREATE TYPE extension_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE project_extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  status extension_status DEFAULT 'pending',
  original_deadline DATE NOT NULL,
  requested_deadline DATE NOT NULL,
  client_delay_days INT DEFAULT 0,  -- Auto-calculated from project_delays
  additional_days INT DEFAULT 0,     -- Extra days beyond client delays
  reason TEXT NOT NULL,
  requested_by UUID REFERENCES profiles(id),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT
);

-- Projects table addition
ALTER TABLE projects ADD COLUMN original_target_date DATE;
```

**Workflow:**
1. Admin/internal creates extension request
2. System auto-calculates client_delay_days from project_delays
3. Notification sent to DFY partner
4. DFY approves/rejects
5. On approval: trigger updates projects.target_delivery_date

### Progress Calculation Functions

```sql
-- Calculate expected vs actual progress
CREATE FUNCTION calculate_expected_progress(p_project_id UUID)
RETURNS TABLE (
  expected_progress_pct DECIMAL,
  actual_progress_pct DECIMAL,
  variance_pct DECIMAL,
  is_at_risk BOOLEAN,       -- TRUE if variance < -30%
  client_delay_days INT,
  dev_delay_days INT
);

-- Get dev logging status
CREATE FUNCTION get_dev_logging_status(p_user_id UUID)
RETURNS TABLE (
  needs_checkin BOOLEAN,
  last_checkin_date DATE,
  overdue_projects UUID[],
  is_snoozed BOOLEAN,
  snoozed_until TIMESTAMPTZ
);
```

## Utility Scripts

### Clear All Projects and Inquiries (Dev/Testing)

Use this to reset project and inquiry data during development. Disables triggers to avoid FK constraint issues.

```sql
-- Disable triggers temporarily
ALTER TABLE projects DISABLE TRIGGER ALL;
ALTER TABLE inquiries DISABLE TRIGGER ALL;
ALTER TABLE deliverables DISABLE TRIGGER ALL;

-- Delete in dependency order (child tables first)
DELETE FROM activity_log;
DELETE FROM scope_changes;
DELETE FROM payment_milestones;
DELETE FROM project_files;
DELETE FROM project_requirements;
DELETE FROM deliverables;

DELETE FROM proposal_deliverable_history;
DELETE FROM proposal_deliverable_comments;
DELETE FROM proposal_deliverables;
DELETE FROM inquiry_comments;

DELETE FROM projects;
DELETE FROM inquiries;

-- Re-enable triggers
ALTER TABLE projects ENABLE TRIGGER ALL;
ALTER TABLE inquiries ENABLE TRIGGER ALL;
ALTER TABLE deliverables ENABLE TRIGGER ALL;
```

**Note:** This preserves `profiles`, `blueprints`, and `case_studies` tables.
