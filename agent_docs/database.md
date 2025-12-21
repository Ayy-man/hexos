# Database

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

CREATE TYPE project_status AS ENUM (
  -- Inquiry
  'inquiry_new', 'ai_matching', 'qualified',
  -- Proposal
  'proposal_drafting', 'internal_review', 'proposal_sent', 'negotiating', 'committed',
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
```

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

-- Project Files
CREATE TABLE public.project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  deliverable_id UUID REFERENCES deliverables(id),
  
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INT,
  file_type TEXT,
  
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
  default_deliverables JSONB,
  estimated_hours INT,
  base_price DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Relationships

```
profiles 1──* projects (as dfy_partner, assigned_dev, client)
projects 1──* deliverables
projects 1──* project_files
projects 1──* payment_milestones
projects 1──* scope_changes
projects 1──* activity_log
deliverables 1──* project_files
blueprints 1──* projects (via matched_blueprint_id)
```

## Indexes

```sql
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_dfy ON projects(dfy_partner_id);
CREATE INDEX idx_projects_dev ON projects(assigned_dev_id);
CREATE INDEX idx_projects_client ON projects(client_id);
CREATE INDEX idx_deliverables_project ON deliverables(project_id);
CREATE INDEX idx_activity_project ON activity_log(project_id);
```

See `security.md` for RLS policies on these tables.
