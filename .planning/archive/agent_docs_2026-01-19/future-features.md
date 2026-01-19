# Future Features

**DO NOT BUILD THESE NOW.** This document exists so Claude keeps these in mind when making architectural decisions, ensuring the codebase can accommodate them later without major refactoring.

## Q2+ Roadmap

### 1. A2UI Agent-Generated UIs

The entire portal could eventually use A2UI for dynamic, contextual interfaces.

**Keep in Mind:**
- Components should be simple and composable
- Data fetching patterns should be extractable
- State management should be minimal (easier for agents to manipulate)

**Future Pattern:**
```typescript
// Agent generates this payload
const dashboardUI = await agent.generate({
  role: userRole,
  context: projectData,
  prompt: 'Generate dashboard for this role'
})

// Rendered by A2UI
<A2UIRenderer payload={dashboardUI} catalog={componentCatalog} />
```

### 2. Interactive Proposal Builder

Client-facing proposal configuration where they select options and price updates live.

**Keep in Mind:**
- Proposal data model should support options/add-ons
- Pricing should be calculable from data (not hardcoded in UI)
- Blueprint structure should include option metadata

**Future Schema:**
```sql
-- In blueprints table
default_deliverables JSONB -- includes optional add-ons with prices
```

### 3. BaigWork Marketplace

Full marketplace with public dev profiles, bidding, 20% commission.

**Keep in Mind:**
- User model should support public profiles (bio, skills, portfolio)
- Projects might have multiple bids before assignment
- Commission calculation should be configurable per project

**Future Schema:**
```sql
ALTER TABLE profiles ADD COLUMN public_bio TEXT;
ALTER TABLE profiles ADD COLUMN skills TEXT[];
ALTER TABLE profiles ADD COLUMN portfolio_url TEXT;

CREATE TABLE bids (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  dev_id UUID REFERENCES profiles(id),
  amount DECIMAL(10,2),
  timeline_days INT,
  status TEXT -- pending, accepted, rejected
);
```

### 4. Email Notifications

Transactional emails for all status changes.

**Keep in Mind:**
- Activity log already captures events (use as trigger source)
- User preferences for notification types
- Email templates should be data-driven

**Future Pattern:**
```typescript
// Triggered by activity_log insert
async function onActivityCreated(activity) {
  const template = getTemplate(activity.action)
  const recipients = getRecipients(activity.project_id, activity.action)
  await sendEmail(template, recipients, activity.details)
}
```

### 5. WhatsApp Integration

Notifications via WhatsApp (n8n integration).

**Keep in Mind:**
- Same event source as email (activity_log)
- User preferences for channel (email vs WhatsApp vs both)
- Phone number field on profiles

**Future Schema:**
```sql
ALTER TABLE profiles ADD COLUMN phone TEXT;
ALTER TABLE profiles ADD COLUMN notification_channel TEXT; -- email, whatsapp, both
```

### 6. AI-Powered Scope Creep Detection

> **Note:** The foundational manual scope monitoring system is now planned. See `docs/plans/2026-01-10-scope-monitoring-system.md` for the implementation plan which includes baselines, manual flagging, and admin approval workflows.

This future feature builds on that foundation with AI-powered automatic detection of scope creep from client communications.

**Problem:**
Even with manual scope flagging, scope creep often happens subtly in conversations where clients ask for "small adjustments" that accumulate into significant work. Relying on humans to notice and flag every instance is error-prone.

**Solution:**
AI copilot that analyzes conversations, documents, and emails to detect scope creep and distinguish between:
- Clarifications of existing deliverables (not scope creep)
- New scope requests beyond baseline (scope creep)
- Timeline/budget discussions (may be scope creep)

**Keep in Mind:**
- Requires baseline to exist (captured at `signed_off` per the plan)
- Need structured deliverables snapshot for comparison
- Confidence thresholds to avoid false positives
- Human-in-the-loop: AI flags, admin approves

**Future Pattern:**
```typescript
// AI analyzes content against baseline
async function analyzeForScopeCreep(content: string, baseline: ScopeBaseline) {
  const analysis = await ai.analyze({
    content,
    baseline: baseline.deliverables_snapshot,
    prompt: `Analyze this content for scope changes. Distinguish between:
      - Clarifications of existing deliverables
      - New scope requests beyond baseline
      - Timeline/budget discussions

      Flag any potential scope creep with confidence score.`
  })

  if (analysis.isScopeChange && analysis.confidence > 0.7) {
    await autoFlagScopeChange({
      trigger: 'ai_detected',
      description: analysis.summary,
      source_conversation_id: conversationId,
      confidence: analysis.confidence,
      ai_reasoning: analysis.reasoning
    })
  }
}
```

**Integration Points:**
| Source | Trigger | Notes |
|--------|---------|-------|
| Conversations | When client sends message | Most common source |
| Document uploads | When new docs added | May contain new requirements |
| Email imports | When external emails imported | Future feature |

**Confidence Thresholds:**
- `> 0.9`: Auto-flag with high priority notification
- `0.7 - 0.9`: Auto-flag, normal priority
- `0.5 - 0.7`: Surface in weekly digest for admin review
- `< 0.5`: Log but don't flag (learning data)

**AI Training Data:**
- Use approved/rejected scope changes as feedback loop
- Track when admin agrees/disagrees with AI assessment
- Improve model over time with domain-specific examples

### 7. Multi-Tenant / White-Label

Allow DFY partners to have their own branded portal.

**Keep in Mind:**
- Theming should be configurable (already using CSS variables via shadcn)
- Logo/branding storage in profiles
- Subdomain routing (partner.hexos.io)

### 8. Time Tracking — ❌ REMOVED

> **Status:** Removed in January 2026. Time tracking was implemented but later removed along with the Pulse system. May return in a future iteration with a new design.

**What Was Removed:**
- `time_entries` table
- `active_timers` table
- All time tracking components (GlobalTimeTracker, HeaderTimerIndicator, ActiveTimerWidget, TimeEntryForm, TaskSelector)
- Dashboard time widgets
- Timer functionality

**Migration:** `20260112000006_remove_time_tracking.sql`

### 9. Agreement / Contract Phase

Digital contracts and e-signatures before project kickoff.

**Keep in Mind:**
- Agreement step between "closed" and "onboarding"
- E-signature integration (DocuSign, HelloSign, or custom)
- Contract templates per blueprint
- Legal review workflow

**Future Flow:**
```
Deal Closed → Agreement Generated → Sent for Signature → Signed → Onboarding Begins
```

### 10. Claude Artifact-Style Proposal Pages

Interactive, rich proposal pages generated as Claude artifacts - like mini-websites that clients can interact with.

**Keep in Mind:**
- Proposals currently rendered via Plate.js
- Could generate interactive React components
- Allow client to configure options, see price updates live
- Share via public link (already have `/p/[token]`)

**Future Pattern:**
```typescript
// AI generates interactive proposal artifact
const proposalArtifact = await claude.generateArtifact({
  type: 'proposal_page',
  data: {
    deliverables,
    pricing,
    options: blueprintTiers
  }
})
// Rendered as interactive page at /p/[token]
```

### 11. Recurring Projects / Retainers

Monthly retainer management.

**Keep in Mind:**
- Projects have one-time vs recurring flag
- Billing cycles
- Auto-renewal

### 12. Hierarchical Deliverables with Sub-Deliverables

**Problem:**
The current AI deliverable parser (`/api/parse-deliverables`) extracts deliverables from proposal content, but it often extracts sub-deliverables and clarifications as separate top-level deliverables. This causes issues because:
- Pricing is only meaningful at the parent deliverable level, not for sub-items
- The deliverables list becomes cluttered with items that shouldn't be individually priced
- When DFY partners negotiate or clients request changes, it's confusing to have flat lists

**Solution:**
Support hierarchical deliverables where parent deliverables can contain sub-deliverables.

**Keep in Mind:**
- Fine-tune the AI parser to distinguish parent deliverables from sub-items
- Sub-deliverables are clarifications/breakdowns, not separately priced items
- UI should show collapsible/dropdown sections for deliverables with children
- Only parent deliverables should have pricing fields
- Database schema already supports this via `parent_id` on deliverables table

**Future UI Pattern:**
```
┌─────────────────────────────────────────────────────────────┐
│ ▼ Automation Flow Setup                           $2,500    │
│   ├─ Trigger configuration                                  │
│   ├─ Data mapping between systems                           │
│   └─ Error handling setup                                   │
│                                                             │
│ ▼ CRM Integration                                 $1,800    │
│   ├─ HubSpot connection                                     │
│   ├─ Contact sync workflow                                  │
│   └─ Deal stage automation                                  │
│                                                             │
│ ▶ Testing & Documentation                         $500      │
└─────────────────────────────────────────────────────────────┘
```

**AI Parser Changes Needed:**
```typescript
// Current: flat array
[
  { title: 'Automation Flow Setup', price: 2500 },
  { title: 'Trigger configuration', price: 0 },  // ❌ Wrong
  { title: 'Data mapping', price: 0 },           // ❌ Wrong
]

// Future: hierarchical structure
[
  {
    title: 'Automation Flow Setup',
    price: 2500,
    subDeliverables: [
      { title: 'Trigger configuration' },
      { title: 'Data mapping between systems' },
      { title: 'Error handling setup' }
    ]
  },
]
```

### 13. Project Map Visualization

A tree-based visualization showing the entire project hierarchy with status at a glance. Visual representation of Project → Deliverables → Subtasks with progress and status indicators.

**Concept:**
```
                              ┌─────────────┐
                              │   PROJECT   │
                              │  Acme Corp  │
                              │   ████░░    │  ← 67% complete
                              └──────┬──────┘
                                     │
           ┌─────────────────────────┼─────────────────────────┐
           │                         │                         │
    ┌──────┴──────┐          ┌──────┴──────┐          ┌──────┴──────┐
    │ DELIVERABLE │          │ DELIVERABLE │          │ DELIVERABLE │
    │  DM Flows   │          │  Dashboard  │          │   Testing   │
    │     ✓       │          │     ◐       │          │     ○       │
    └──────┬──────┘          └──────┴──────┘          └─────────────┘
           │                        │
     ┌─────┼─────┐            ┌─────┼─────┐
     │     │     │            │     │     │
    [✓]   [✓]   [✓]          [✓]   [◐]   [○]
   Flow  Flow  Test         Auth  API   UI
    1     2
```

**Data Structure:**
```typescript
interface ProjectMapNode {
  id: string;
  name: string;
  type: 'project' | 'deliverable' | 'subtask';
  status: 'pending' | 'in_progress' | 'review' | 'completed' | 'blocked';
  progress: number; // 0-100, calculated from children
  assignee?: {
    id: string;
    name: string;
    avatar?: string;
  };
  dueDate?: string;
  isOverdue?: boolean;
  children?: ProjectMapNode[];
}

function buildProjectMap(project: Project): ProjectMapNode {
  return {
    id: project.id,
    name: project.name,
    type: 'project',
    status: project.status,
    progress: calculateProgress(project.deliverables),
    children: project.deliverables.map(d => ({
      id: d.id,
      name: d.name,
      type: 'deliverable',
      status: d.status,
      progress: calculateProgress(d.subtasks),
      assignee: d.assignee,
      dueDate: d.due_date,
      isOverdue: d.due_date && new Date(d.due_date) < new Date(),
      children: d.subtasks?.map(s => ({
        id: s.id,
        name: s.name,
        type: 'subtask',
        status: s.status,
        progress: s.status === 'completed' ? 100 : 0,
        assignee: s.assignee,
      })),
    })),
  };
}
```

**Visual Encoding:**

| Status | Node Color | Icon |
|--------|-----------|------|
| Pending | `stone-400` | `○` empty circle |
| In Progress | `cyan-500` | `◐` half circle |
| Review | `amber-500` | `◉` dot circle |
| Completed | `emerald-500` | `✓` checkmark |
| Blocked | `red-500` | `⊘` blocked |

| Condition | Visual |
|-----------|--------|
| Overdue | Red border pulse |
| Has assignee | Avatar badge |
| Collapsed (has hidden children) | `+N` badge |

**Keep in Mind:**
- Use `@visx/hierarchy` for tree layout and `@visx/shape` for links
- Nodes should be expandable/collapsible
- Click node to navigate to deliverable detail
- Overdue items get red pulse animation
- Assignee avatars as badges on nodes

**Integration Point:**
Add "Map" tab to Project Detail page alongside Overview, Deliverables, Files, Activity.

**Dependencies:**
```bash
pnpm add @visx/group @visx/hierarchy @visx/shape d3-shape
```

**Future Enhancements:**
1. Zoom/Pan with `@visx/zoom` for large projects
2. Filters (show only blocked, only in-progress, by assignee)
3. Drag to reorder deliverables visually
4. PNG/SVG export of the map
5. Timeline overlay showing due dates on horizontal axis

### 14. API for External Integrations

Public API for partners to integrate.

**Keep in Mind:**
- API abstraction layer already exists (`lib/api/`)
- Can expose as REST or GraphQL
- Rate limiting, API keys

### 15. Phase-Aware Navigation Tabs

**Problem:**
As hexOS grows, the project detail page accumulates more tabs: Overview, Deliverables, Requirements, Files, Activity, Chat, Project Info — and potentially more (Invoices, Time Tracking, Scope Changes, etc.). Showing all tabs at all times creates:
1. Cognitive overload — Users scan 8+ tabs to find what they need
2. Irrelevant options — "Requirements" doesn't matter during Delivery; "Invoices" doesn't exist during Onboarding
3. Wasted space — Horizontal tab bars don't scale gracefully

**Proposed Solution:**
Tabs dynamically show/hide (or emphasize/de-emphasize) based on the project's current phase.

**Phase-Tab Mapping (Draft):**

| Phase | Primary Tabs | Secondary/Collapsed |
|-------|--------------|---------------------|
| Inquiry → Proposal | Overview, Chat, Project Info | — |
| Sign-off → Agreement | Overview, Deliverables, Chat, Project Info | Files |
| Payment | Overview, Invoices, Chat, Project Info | Deliverables, Files |
| Onboarding | Overview, Requirements, Files, Chat | Deliverables |
| Development | Overview, Deliverables, Files, Activity, Chat | Requirements |
| Delivery | Overview, Deliverables, Files, Activity, Chat | Requirements |
| Closed | Overview, Files, Activity, Project Info | Everything else archived |

**UI Options:**

- **Option A: Show/Hide** — Tabs literally appear or disappear based on phase. Clean but potentially confusing if users expect a tab to exist.
- **Option B: Primary + Overflow (Recommended)** — Show 4-5 primary tabs for current phase. Others collapse into a "More" dropdown. All tabs always accessible, just prioritized differently.
- **Option C: Visual Hierarchy** — All tabs visible, but current-phase-relevant tabs are full opacity, others are muted/smaller. Subtle but keeps everything discoverable.

**Keep in Mind:**
- Tab config as simple mapping: `phaseToTabs: Record<Phase, { primary: Tab[], secondary: Tab[] }>`
- Override capability: Admin can pin/unpin tabs per project if needed
- Transition animations when tabs shift during phase change
- Persist user's last-visited tab per project (don't reset on every visit)

**Edge Cases:**
- What if user is mid-task in a tab that becomes secondary? Don't force-navigate them.
- What about tabs with notifications/unread? Maybe always show if there's activity.
- Role-based + phase-based overlap: Client doesn't see internal tabs regardless of phase.

**Dependencies:**
- Finalize the full tab list first (what are all possible tabs?)
- Understand actual usage patterns (which tabs do users access at each phase?)

**Status:** Documented, not scheduled. Revisit once tab count exceeds 7-8 and clutter becomes a real pain point.

## Architectural Decisions That Enable Future

| Decision | Why | Enables |
|----------|-----|---------|
| Feature-based folders | Easy to add new features | All future features |
| API abstraction layer | Swap implementation without changing components | API, A2UI, testing |
| Activity log | Event sourcing pattern | Notifications, audit, analytics |
| RLS + views | Security at DB level | Multi-tenant, white-label |
| Generated types | Schema-first development | API, migrations |
| Deliverables as source of truth | Structured baseline | Scope monitoring, Gantt |
| Comment system | Communication tracking | AI analysis, history |

## What NOT to Pre-Build

Don't add complexity for futures that might not happen:

- ❌ Don't add notification tables until needed
- ❌ Don't add bidding logic until marketplace
- ❌ Don't add multi-tenant routing until white-label
- ~~❌ Don't add time tracking until requested~~ → ✅ Implemented Jan 2026 → ❌ Removed Jan 2026

**Build for today, architect for tomorrow.**
