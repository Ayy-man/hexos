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

### 10. API for External Integrations

Public API for partners to integrate.

**Keep in Mind:**
- API abstraction layer already exists (`lib/api/`)
- Can expose as REST or GraphQL
- Rate limiting, API keys

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
