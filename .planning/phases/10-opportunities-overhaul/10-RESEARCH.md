# Phase 10: Opportunities Overhaul - Research

**Researched:** 2026-01-19
**Domain:** Developer bidding system, AI-powered brief generation, opportunity management
**Confidence:** HIGH

## Summary

This research investigates the existing opportunities/invitations system, developer skills structure, AI extraction patterns, and dependencies needed to implement Phase 10's "Opportunities Overhaul" - a system for developer bidding, pre-commitment workflows, and AI-generated redacted briefs.

The codebase already has a solid foundation:
- **Opportunities System:** Tables for `project_opportunities`, `project_invitations`, `project_applications` with full RLS
- **Developer Skills:** Complete skill tracking system with 30+ skills, proficiency levels, badges, and XP
- **AI Extraction Patterns:** Established pattern using OpenRouter + Claude 3.5 Haiku with tool calling
- **Caching:** No dedicated caching infrastructure yet; relies on Next.js revalidation patterns

**Primary recommendation:** Extend the existing opportunities schema with bidding fields, add a `brief_extractions` cache table for AI-generated content, and implement a pre-commitment tab leveraging the existing `dev_opportunity_preferences` table.

---

## Current State

### Existing Opportunities System

**Database Tables (Already Exist):**

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `project_opportunities` | Project postings devs can apply to | `title`, `description`, `estimated_hours`, `tech_stack`, `complexity`, `status`, `is_public`, `expires_at` |
| `project_invitations` | Direct invitations to specific devs | `opportunity_id`, `project_id`, `dev_id`, `status`, `message`, `match_percentage` |
| `project_applications` | Dev applications to opportunities | `opportunity_id`, `dev_id`, `status`, `cover_message`, `estimated_completion` |
| `dev_opportunity_preferences` | Dev preferences (starred/hidden) | `dev_id`, `opportunity_id`, `is_starred`, `is_hidden` |

**Existing API Layer:** `/lib/api/project-invitations.ts`
- Full CRUD for opportunities, invitations, applications
- Dev preference toggling (star/hide)
- Available devs lookup

**Existing UI Components:**
- `ProjectOpportunityCard` - Card UI for displaying opportunities
- `OpportunityDetailModal` - Detail view with apply functionality
- Admin page at `/admin/opportunities`
- Dev dashboard at `/dashboard/dev`

### Developer Skills System

**Complete Implementation:** The developer skills system is fully built with:

| Component | Status |
|-----------|--------|
| Database schema | `skill_templates`, `dev_skills`, `dev_badges`, `skill_endorsements` |
| API layer | `/lib/api/dev-skills.ts` |
| UI | Settings page, SkillsMatrix component |
| 30+ skill templates | AI, automation, CRM, development categories |
| Proficiency levels | 0-10 scale with semantic meanings |
| Badges & XP | Gamification system ready |

**Key Skills Categories:**
- `ai_chatbots` - Chatbots, Voice Agents, MCP, Model Training
- `automation_platforms` - n8n, Make, Zapier
- `crm_platforms` - GHL, HubSpot, Airtable
- `marketing_sales` - Marketing/Sales automation
- `cloud_apis` - Meta, Google Cloud, AWS
- `development` - Fullstack, Frontend, Backend
- `data_analytics` - Dashboards, Data Analysis
- `modern_tools` - Vibe-coding, Project Management

### AI Extraction Patterns

**Established Pattern:** The codebase uses OpenRouter API with Claude 3.5 Haiku for AI extractions.

**Implementation Files:**
- `/app/api/copilot/route.ts` - Form-filling copilot
- `/app/api/parse-deliverables/route.ts` - Deliverables extraction from proposals
- `/features/inquiries/actions/deliverableActions.ts` - Server action wrapper

**AI Pattern:**
```typescript
// Standard approach in codebase
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL,
    'X-Title': 'hexOS [Feature Name]',
  },
  body: JSON.stringify({
    model: 'anthropic/claude-3.5-haiku',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
    tools: [/* function definitions */],
    tool_choice: { type: 'function', function: { name: 'function_name' } },
  }),
})
```

**Key Insight:** The existing deliverables parser extracts structured data with confidence scores - this pattern should be reused for brief generation.

### Blueprint and Case Study Structure (Phase 06 Dependency)

**Blueprints:**
| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key |
| `name` | TEXT | Blueprint name |
| `description` | TEXT | Full description |
| `content` | JSONB | Plate.js content |
| `estimated_hours` | INT | Time estimate |
| `base_price` | DECIMAL | Starting price |
| `pricing_tiers` | JSONB | Array of tier objects |
| `tags` | TEXT[] | Categorization |

**Case Studies:**
| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key |
| `name` | TEXT | Case study name |
| `description` | TEXT | Summary |
| `client_name` | TEXT | Client info |
| `industry` | TEXT | Industry category |
| `challenge` | TEXT | Problem statement |
| `solution` | TEXT | Solution description |
| `results` | TEXT | Outcomes |
| `blueprint_id` | UUID | Links to blueprint |

**Note:** Phase 06 adds Loom URL fields to these tables. The AI brief generator should be able to reference these for context but must NOT include actual Loom URLs in redacted briefs.

### Inquiry/Proposal Flow

**Current Flow:**
```
Inquiry Created → Proposal Written → Deliverables Parsed → DFY Review → Approval → Deal Closed → Project Created
```

**Post-Project Opportunity Context:**
- `inquiries.closed_at` marks when deal closed
- `projects.source_inquiry_id` links project to originating inquiry
- "Post-project opportunity creation" means creating opportunities AFTER a project is completed
- This enables a pipeline: Project Completed → Create Opportunity for Similar Work → Devs Bid

---

## Technical Analysis

### Current Schema Gaps

To implement the full opportunities overhaul, the following schema changes are needed:

#### 1. Opportunity Timing Change (Hours to Weeks)

The current `estimated_hours` field should be supplemented or replaced:

```sql
-- Add to project_opportunities
ALTER TABLE project_opportunities ADD COLUMN estimated_weeks DECIMAL(3,1);
ALTER TABLE project_opportunities ADD COLUMN estimated_hours_min INT;
ALTER TABLE project_opportunities ADD COLUMN estimated_hours_max INT;
```

#### 2. Bidding System Tables

```sql
-- Developer bids on opportunities
CREATE TABLE dev_opportunity_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES project_opportunities(id) ON DELETE CASCADE,
  dev_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Bid details
  proposed_weeks DECIMAL(3,1) NOT NULL,
  proposed_price DECIMAL(10,2),
  cover_message TEXT,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'shortlisted', 'accepted', 'rejected', 'withdrawn')),

  -- Admin review
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(opportunity_id, dev_id)
);
```

#### 3. Brief Extractions Cache Table

```sql
-- Cached AI-generated briefs
CREATE TABLE brief_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source reference
  source_type TEXT NOT NULL CHECK (source_type IN ('project', 'inquiry', 'blueprint', 'case_study')),
  source_id UUID NOT NULL,

  -- Extraction content
  brief_content JSONB NOT NULL, -- Structured brief data
  redacted_brief TEXT NOT NULL, -- Human-readable redacted version

  -- Generation metadata
  model_used TEXT DEFAULT 'anthropic/claude-3.5-haiku',
  input_hash TEXT, -- Hash of input for cache invalidation
  tokens_used INT,
  generation_time_ms INT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Optional TTL

  UNIQUE(source_type, source_id, input_hash)
);
```

#### 4. Pre-Commitment Tracking

The existing `dev_opportunity_preferences` table can be extended:

```sql
ALTER TABLE dev_opportunity_preferences ADD COLUMN commitment_status TEXT
  CHECK (commitment_status IN ('interested', 'committed', 'declined'));
ALTER TABLE dev_opportunity_preferences ADD COLUMN committed_at TIMESTAMPTZ;
ALTER TABLE dev_opportunity_preferences ADD COLUMN commitment_note TEXT;
```

### AI Brief Generation Strategy

**Source Data for Brief:**
1. **Project/Inquiry Data:** `project_name`, `client_business`, `industry`, deliverables, requirements
2. **Blueprint Context:** If linked, include blueprint description and pricing tiers
3. **Case Study Context:** If linked, include challenge/solution/results (redacted)

**Redaction Rules:**
- Remove client names, company names, specific URLs
- Remove pricing information
- Remove internal notes
- Keep: industry, problem type, tech stack, scope complexity, timeline

**Brief Structure:**
```typescript
interface RedactedBrief {
  industry: string
  problem_type: string
  scope_summary: string
  tech_stack: string[]
  complexity: 'low' | 'medium' | 'high'
  estimated_duration: string
  deliverables_overview: string[]
  special_requirements?: string
  redacted_fields: string[] // Track what was removed
}
```

### Caching Strategy

**No existing caching infrastructure** beyond Next.js revalidation. Options:

1. **Database Cache (Recommended):** Use `brief_extractions` table with input hash for cache key
2. **Redis/Upstash:** Overkill for current scale
3. **Next.js unstable_cache:** Good for read-heavy, but AI generation needs persistence

**Cache Invalidation:**
- Invalidate when source data changes (project updated, deliverables modified)
- Use input hash comparison: `SHA256(JSON.stringify(relevantFields))`
- TTL: 7 days for completed projects, 24 hours for in-progress

---

## Implementation Patterns

### Existing Patterns to Follow

**Server Actions Pattern:**
```typescript
// features/[feature]/actions/[feature]Actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { apiFunction } from '@/lib/api/[feature]'

export async function actionName(params: ParamType): Promise<ReturnType> {
  const result = await apiFunction(params)
  revalidatePath('/path/to/revalidate')
  return result
}
```

**API Layer Pattern:**
```typescript
// lib/api/[feature].ts
import { createClient } from '@/lib/supabase/server'

export async function getFeatureData(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('table')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}
```

### Recommended Project Structure

```
features/
├── opportunities/
│   ├── actions/
│   │   ├── opportunityActions.ts    # Admin: create/publish/close
│   │   ├── bidActions.ts            # Dev: submit/withdraw bids
│   │   └── briefActions.ts          # AI brief generation
│   ├── components/
│   │   ├── OpportunityList.tsx
│   │   ├── OpportunityCard.tsx
│   │   ├── BidForm.tsx
│   │   ├── BidList.tsx
│   │   ├── RedactedBriefCard.tsx
│   │   └── PreCommitmentTab.tsx
│   └── types/
│       └── index.ts
lib/api/
├── opportunities.ts                  # Extend existing project-invitations.ts
├── bids.ts                          # New: bidding system
└── brief-extractions.ts             # New: AI brief caching
app/api/
└── generate-brief/
    └── route.ts                     # AI brief generation endpoint
```

---

## Key Findings

### What Already Works

1. **Complete Opportunity Foundation:** Tables, RLS, API, and basic UI exist
2. **Developer Skills Ready:** Full skills matrix for bid eligibility filtering
3. **AI Pattern Established:** OpenRouter + Claude tool calling pattern proven
4. **Preference System:** Star/hide already implemented for dev opportunity management

### What Needs Building

1. **Bidding System:** New table + API + UI for dev bids
2. **Brief Generation:** AI extraction with caching layer
3. **Pre-Commitment Flow:** Extend preferences to commitment workflow
4. **Hours to Weeks:** Schema update for timeline estimation
5. **Post-Project Opportunities:** Flow to create opportunity from completed project

### Complexity Assessment

| Feature | Complexity | Notes |
|---------|------------|-------|
| Bidding System | Medium | New table, straightforward CRUD |
| AI Brief Generation | Medium | Follows existing AI pattern, needs redaction logic |
| Brief Caching | Low | Simple database cache with hash key |
| Pre-Commitment Tab | Low | Extends existing preferences |
| Hours to Weeks Change | Low | Schema migration + UI updates |

---

## Dependencies & Prerequisites

### Phase 06 Dependency

Phase 10 depends on Phase 06 (Blueprints/Case Studies) for:
- Loom URLs on blueprints/case studies (for AI context)
- Enhanced relationships between entities

**Blocking:** AI brief generation can reference blueprint/case study content, but should work without Phase 06 being complete - just with reduced context.

### External Dependencies

- **OpenRouter API:** Already configured (`OPENROUTER_API_KEY`)
- **Claude 3.5 Haiku:** Model for brief generation (already used)
- **No new packages needed:** All AI/UI capabilities exist

---

## Open Questions

### 1. Bid Acceptance Flow
**Question:** When a bid is accepted, does it automatically assign the dev to the project, or is there an intermediate step?

**Recommendation:** Two-step: Accept Bid -> Admin Confirms Assignment -> Dev Assigned. This allows admin oversight.

### 2. Opportunity Expiry Behavior
**Question:** What happens when an opportunity expires with pending bids?

**Recommendation:** Auto-close with `closed` status, notify all bidding devs their bids were not selected.

### 3. Brief Regeneration
**Question:** Can admins manually trigger brief regeneration, or is it purely automatic?

**Recommendation:** Allow manual regeneration button for admins, with cache invalidation.

### 4. Pre-Commitment vs Application
**Question:** How does "pre-commitment" differ from the existing application system?

**Recommendation:** Pre-commitment is a lighter "expression of interest" before formal application. Devs can commit without submitting a full bid, signaling they want to be notified when bidding opens.

---

## Sources

### Primary (HIGH confidence)
- `/lib/api/project-invitations.ts` - Full opportunities API implementation
- `/lib/api/dev-skills.ts` - Developer skills API
- `/supabase/migrations/20260107000002_project_invitations.sql` - Opportunities schema
- `/supabase/migrations/20260108000001_dev_skills_system.sql` - Skills schema
- `/app/api/parse-deliverables/route.ts` - AI extraction pattern
- `/features/inquiries/actions/deliverableActions.ts` - AI action pattern

### Secondary (MEDIUM confidence)
- `/agent_docs/developer-skills-system.md` - Skills documentation
- `/agent_docs/future-features.md` - BaigWork marketplace context

---

## Metadata

**Confidence breakdown:**
- Current system analysis: HIGH - Direct code inspection
- Schema design: HIGH - Follows established patterns
- AI patterns: HIGH - Existing implementations reviewed
- Bidding flow: MEDIUM - Some design decisions open

**Research date:** 2026-01-19
**Valid until:** 2026-02-19 (stable domain, 30 days)
