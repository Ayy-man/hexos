# Workflows

## Project Lifecycle

```
INQUIRY → PROPOSAL → AGREEMENT → PAYMENT → ONBOARDING → DEVELOPMENT → DELIVERY → CLOSED
```

## State Machine

### INQUIRY Phase

| State | Description | Exit Criteria |
|-------|-------------|---------------|
| `inquiry_new` | Submitted via form | Auto-advance |
| `ai_matching` | System matches against blueprints | Match score calculated |
| `qualified` | Ready for proposal | Admin reviews |

### PROPOSAL Phase

| State | Description | Exit Criteria |
|-------|-------------|---------------|
| `proposal_drafting` | Being created (AI-assisted) | Draft complete |
| `internal_review` | Admin reviews | Approved |
| `proposal_sent` | Delivered to client/DFY | Response received |
| `negotiating` | Back-and-forth | Agreement reached |
| `committed` | Verbal/written yes | Ready for agreement |

### AGREEMENT Phase

| State | Description | Exit Criteria |
|-------|-------------|---------------|
| `agreement_sent` | Contract sent | Signed |
| `agreement_signed` | Legally binding | Ready for payment |

### PAYMENT Phase

| State | Description | Exit Criteria |
|-------|-------------|---------------|
| `payment_pending` | Awaiting first payment | Payment received |
| `payment_partial` | Some milestones paid | Based on structure |
| `payment_paid` | All payments complete | N/A |

**Payment Structures:**
- `100_upfront` — Single payment
- `50_50` — 50% start, 50% delivery
- `40_30_30` — 40% start, 30% midpoint, 30% delivery
- `custom` — Define per-project

### ONBOARDING Phase

| State | Description | Exit Criteria |
|-------|-------------|---------------|
| `collecting_access` | Gathering credentials | All access received |
| `access_complete` | Have everything | Dev assignment |
| `dev_assigned` | Dev(s) assigned | Work begins |

### DEVELOPMENT Phase

| State | Description | Exit Criteria |
|-------|-------------|---------------|
| `in_progress` | Active development | Checkpoint or block |
| `blocked_client` | Waiting on client | Client responds |
| `blocked_internal` | Internal issue | Issue resolved |
| `review_checkpoint` | Milestone review | Approved or revisions |
| `revisions` | Changes being made | Complete |
| `final_qa` | Quality assurance | Passed |

### DELIVERY Phase

| State | Description | Exit Criteria |
|-------|-------------|---------------|
| `delivered` | Handed to client | Feedback received |
| `acceptance_pending` | Awaiting sign-off | Accepted or revisions |
| `accepted` | Client confirms | Project closes |

### CLOSED Phase

| State | Description |
|-------|-------------|
| `completed` | Successfully delivered |
| `cancelled` | Terminated |
| `on_hold` | Paused |

## Scope Monitoring (Parallel Layer)

Runs alongside DEVELOPMENT phase.

**Baseline:** Deliverables list created at project launch.

**Triggers:**
- Client requests new feature
- Dev flags out-of-scope work
- Deliverable list modified
- Timeline extended

**Flow:**
```
on_track → change_detected → pending_review → approved/denied → on_track
```

**On Approval:**
1. Update deliverables list
2. Update pricing (if applicable)
3. Notify all stakeholders
4. Continue development

## Project Types

| Type | Match Score | Characteristics |
|------|-------------|-----------------|
| `blueprint` | 90%+ | Standardized, fixed pricing |
| `blueprint_custom` | 50-89% | Base template + modifications |
| `full_custom` | <50% | Premium pricing, custom scope |

## AI Blueprint Matching

When inquiry submitted:
1. Extract requirements from form
2. Compare against blueprints table
3. Calculate match score per blueprint
4. Return highest match + score
5. Route based on score threshold

```typescript
// Pseudo-code
async function matchBlueprint(inquiry: Inquiry) {
  const blueprints = await getBlueprints()
  const scores = await Promise.all(
    blueprints.map(bp => calculateMatchScore(inquiry, bp))
  )
  const best = scores.reduce((a, b) => a.score > b.score ? a : b)
  return {
    blueprintId: best.blueprint.id,
    score: best.score,
    projectType: 
      best.score >= 90 ? 'blueprint' :
      best.score >= 50 ? 'blueprint_custom' : 'full_custom'
  }
}
```

## Form Copilot (Proposal Creation)

AI-assisted proposal form filling:

1. User pastes meeting notes / context
2. AI extracts: client name, business, requirements, budget hints
3. AI matches to blueprint (if applicable)
4. Form fields pre-filled
5. User reviews and adjusts
6. Submit creates proposal

Uses `@assistant-ui/react-hook-form` pattern — AI calls `set_field` tool to update form values.

## State Transition Rules

```typescript
const allowedTransitions: Record<ProjectStatus, ProjectStatus[]> = {
  inquiry_new: ['ai_matching'],
  ai_matching: ['qualified'],
  qualified: ['proposal_drafting'],
  proposal_drafting: ['internal_review'],
  internal_review: ['proposal_sent', 'proposal_drafting'],
  proposal_sent: ['negotiating', 'committed'],
  negotiating: ['proposal_sent', 'committed'],
  committed: ['agreement_sent'],
  agreement_sent: ['agreement_signed'],
  agreement_signed: ['payment_pending'],
  payment_pending: ['payment_partial', 'payment_paid'],
  payment_partial: ['payment_paid', 'collecting_access'],
  payment_paid: ['collecting_access'],
  collecting_access: ['access_complete'],
  access_complete: ['dev_assigned'],
  dev_assigned: ['in_progress'],
  in_progress: ['blocked_client', 'blocked_internal', 'review_checkpoint'],
  blocked_client: ['in_progress'],
  blocked_internal: ['in_progress'],
  review_checkpoint: ['revisions', 'final_qa', 'in_progress'],
  revisions: ['in_progress', 'review_checkpoint'],
  final_qa: ['delivered'],
  delivered: ['acceptance_pending'],
  acceptance_pending: ['accepted', 'revisions'],
  accepted: ['completed'],
  // Terminal states
  completed: [],
  cancelled: [],
  on_hold: ['inquiry_new', 'proposal_drafting', 'in_progress'], // Resume points
}
```

## Auto-Timestamps

Set automatically on status change:

| Status | Field Updated |
|--------|---------------|
| `proposal_sent` | `proposal_sent_at` |
| `dev_assigned` | `started_at` |
| `delivered` | `delivered_at` |
| `completed` | `updated_at` |

## Proposal Stage Workflow (Phase 4.6+)

Inquiry-level proposal stages (ClickUp-style):

```
unopened → admin_reviewed → in_queue → working → on_hold → final_review → ready → sent
```

| Stage | Description | Trigger |
|-------|-------------|---------|
| `unopened` | Newly submitted | DFY submits inquiry |
| `admin_reviewed` | First admin view | Auto on admin page load |
| `in_queue` | In proposal queue | Manual stage change |
| `working` | Actively drafting | Manual stage change |
| `on_hold` | Paused | Manual stage change |
| `final_review` | Internal review | Manual stage change |
| `ready` | Ready to send | Manual stage change |
| `sent` | Submitted to DFY | Auto when proposal submitted |

**Stage History:** All transitions recorded with timestamp, user, and optional notes.

## Deliverables Negotiation (Phase 4.8)

Two-entry system for DFY partners and internal team.

### Entry A: Pre-Close (Suggest Changes)

```
Proposal sent → DFY clicks "Suggest Changes" → AI parses deliverables
→ DFY edits table → Submits → INT reviews → Accept/Reject/Counter → Loop until Approved
```

**Negotiation Status Flow:**
```
none → parsing → dfy_editing → dfy_submitted → int_reviewing → approved
                     ↑                              ↓
                     └──────── needs_revision ←─────┘
```

| Status | Description | Who Acts |
|--------|-------------|----------|
| `none` | No negotiation | - |
| `parsing` | AI parsing proposal | System |
| `dfy_editing` | DFY editing deliverables | DFY |
| `dfy_submitted` | Submitted for review | DFY → INT |
| `int_reviewing` | Under review | INT |
| `approved` | All approved | - |
| `needs_revision` | Sent back | INT → DFY |

**Deliverable Change Status:**
- `original` — From AI parse
- `edited` — DFY modified
- `added` — DFY added new
- `removed` — DFY marked for removal
- `approved` — INT approved
- `rejected` — INT rejected
- `countered` — INT proposed different price

### Entry B: Post-Close (Convert to Project)

```
DFY clicks "Mark as Closed" → Admin clicks "Convert to Project"
→ Opens full-page Project Initiation Wizard at /inquiries/[id]/initiate
→ Step 1: Select deliverables from proposal
→ Step 2: Build hierarchical requirements tree (with template library)
→ Step 3: Review project details + pricing → Create project
```

**Project Initiation Wizard Features:**
- Full-page wizard (replaces old modal-based conversion)
- Tree-structured requirements via `onboarding_requirements` table
- Requirement templates organized by category (platform_access, credentials, assets, setup, payments)
- Owner assignment per requirement (Hexona, DFY, Client)
- Blocker types (none, partial, absolute)
- File attachments support

**Hierarchical Templates:**
Templates support nested children via `parent_id`. Selecting a template adds entire tree:
```
GHL Setup (Hexona) → Add Billing to Hexona (DFY) → Add WAGHL (Hexona) → Add WAGHL Billing (Client)
```
Template tree building handled by `lib/api/requirement-templates.shared.ts` (client-safe).

**Tables Used:**
- `proposal_deliverables` → copied to `project_deliverables`
- `onboarding_requirements` → created with tree structure (parent_id for nesting)
- `requirement_templates` → library of reusable templates (with parent_id for hierarchy)

**Project Link:** New project gets `source_inquiry_id` linking back to original inquiry.

**Project Deletion:**
Admin can delete projects from Danger Zone in Project Info tab:
1. Unlinks inquiry first (preserves inquiry, resets status to 'closed')
2. Deletes activity_log entries (avoids FK constraint from trigger)
3. Cascades to deliverables, requirements, files
