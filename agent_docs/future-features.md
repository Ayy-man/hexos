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

### 6. Advanced Scope Monitoring

AI-powered scope detection from client messages.

**Keep in Mind:**
- Comments table should store all client communications
- Messages should be tagged with source (portal, email, etc.)
- Baseline comparison needs structured deliverables

**Future Pattern:**
```typescript
// On new comment from client
async function analyzeForScopeCreep(comment, project) {
  const baseline = await getDeliverables(project.id)
  const analysis = await ai.analyze({
    comment: comment.content,
    baseline: baseline,
    prompt: 'Is this a scope change request?'
  })
  if (analysis.isScopeChange) {
    await createScopeChange(project.id, analysis)
  }
}
```

### 7. Multi-Tenant / White-Label

Allow DFY partners to have their own branded portal.

**Keep in Mind:**
- Theming should be configurable (already using CSS variables via shadcn)
- Logo/branding storage in profiles
- Subdomain routing (partner.hexos.io)

### 8. Time Tracking

Dev time tracking per deliverable.

**Keep in Mind:**
- Deliverables have `estimated_hours`
- Need actual hours tracking

**Future Schema:**
```sql
CREATE TABLE time_entries (
  id UUID PRIMARY KEY,
  deliverable_id UUID REFERENCES deliverables(id),
  dev_id UUID REFERENCES profiles(id),
  hours DECIMAL(5,2),
  notes TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);
```

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
- ❌ Don't add time tracking until requested

**Build for today, architect for tomorrow.**
