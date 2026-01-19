# In Progress

Currently active work items. Only ONE issue per agent should be in progress at a time.

---

## Hill Chart Progress Visualization (NEW FEATURE)

**Status:** CODE COMPLETE — Ready for testing with new data
**Priority:** Enhancement
**Started:** 2026-01-11

### What Was Built
A two-level hill chart visualization for tracking deliverable progress:
- **Level 1 (Parent View):** Read-only hill chart showing parent deliverables as averaged positions
- **Level 2 (Sub-Deliverable View):** Editable view with drag-to-update + quick buttons (-5%, 0%, +5%, +10%)
- **Light/Dark Mode:** Full theme support with Tailwind dark: variants

### Files Created
- `supabase/migrations/20260111000001_hill_chart.sql`
- `lib/api/hill-chart.ts`
- `features/projects/actions/hillChartActions.ts`
- `features/projects/components/hill-chart/` (8 components)
- `hooks/use-hill-chart-realtime.ts`
- `scripts/wipe-test-data.sql` (database cleanup script)
- `scripts/seed-test-data.sql` (creates proper hierarchical test data)

### Files Modified
- `features/projects/components/ProjectTabs.tsx` (added Progress tab)
- `lib/api/projects.ts` (extended deliverables type)

### Testing Results (Round 1 - 2026-01-11)

| Test | Status | Notes |
|------|--------|-------|
| Empty state | ✅ PASS | Shows correct message |
| Parent view (Level 1) | ✅ PASS | Header, chart, dots, stats, cards all render |
| Hover tooltips | ✅ PASS | Name + percentage shown |
| Back navigation | ✅ PASS | Returns to parent view correctly |
| Read-only for DFY | ✅ PASS | Cannot drag dots, badge shows |
| Drill-down (Level 2) | ⚠️ BLOCKED | No sub-deliverables in test data |
| Drag to update | ⚠️ BLOCKED | Needs sub-deliverables |
| Quick update buttons | ⚠️ BLOCKED | Needs sub-deliverables |
| Stats update on zone change | ⚠️ BLOCKED | Needs sub-deliverables |
| Deadline indicators | ⚠️ BLOCKED | No deliverables with past due dates |

### Test Data Reset Instructions

**Step 1:** Run wipe script in Supabase SQL Editor
```
scripts/wipe-test-data.sql
```

**Step 2:** Run seed script to create hierarchical test data
```
scripts/seed-test-data.sql
```

**Step 3:** Navigate to the new project → Progress tab

### Test Data Structure Created by Seed Script
```
Hill Chart Test Project
├── Design Phase (parent, avg ~38%)
│   ├── Wireframes (65%) ← has sparkline history
│   ├── High-Fidelity Mockups (35%) ← has sparkline history
│   └── Design System (15%)
├── Development Phase (parent, avg ~4%)
│   ├── Authentication System (10%)
│   ├── Dashboard (5%)
│   ├── API Integration (0%)
│   └── Data Export (0%)
└── Testing & QA (parent, avg 0%)
    ├── Unit Tests (0%)
    ├── Integration Tests (0%)
    └── User Acceptance Testing (0%)
```

### Pending Tests (Round 2)
- [ ] Click parent → drills down to sub-deliverables
- [ ] Drag sub-deliverable dot → position updates
- [ ] Quick buttons (-5%, 0%, +5%, +10%) work
- [ ] Stats update when items change zones
- [ ] Sparkline shows history (Wireframes, Mockups)
- [ ] Parent position recalculates after child update
- [x] Light mode compatibility (all 7 components updated)

---

## Phase 3A: Deliverables System Fix (CRITICAL)

**Status:** IN PROGRESS
**Priority:** CRITICAL — Blocks all project phase work
**Started:** 2026-01-10

### Problem
The "Initiate Project" wizard shows "No Deliverables Found" and provides no way forward. Root cause: the page reads from `proposal_deliverables` table, but AI extraction is never triggered in this flow.

### Solution
1. ✅ Add `parent_id` for hierarchy support (sub-deliverables)
2. ✅ Add tree structure API functions
3. ✅ Create server actions for DeliverablesStep (add/edit/delete)
4. ✅ Rewrite DeliverablesStep with:
   - Empty state with "Extract from Proposal" and "Add Manually" buttons
   - Full CRUD inline
   - Sub-deliverable support (hierarchy)
5. ✅ Wire up InitiateWizard with new props

### Files Changed
- `supabase/migrations/20260110000020_deliverable_hierarchy.sql` (NEW)
- `lib/api/proposal-deliverables.ts` (tree support)
- `features/project-initiation/actions/deliverableStepActions.ts` (NEW)
- `features/project-initiation/components/steps/DeliverablesStep.tsx` (REWRITE)
- `features/project-initiation/components/InitiateWizard.tsx` (updated props)
- `app/(dashboard)/inquiries/[id]/initiate/page.tsx` (use tree API)

### Testing Needed
- [ ] Navigate to `/inquiries/[id]/initiate` with no deliverables
- [ ] Click "Extract from Proposal" - should call AI and populate list
- [ ] Click "Add Manually" - should open form and create deliverable
- [ ] Edit existing deliverable
- [ ] Delete deliverable
- [ ] Add sub-deliverable
- [ ] Select/deselect deliverables
- [ ] Proceed through wizard to create project

---

## Agent 2 (UI/UX + Form Flow)

**Current:** None - All assigned tasks complete ✅

---

## Agent 3 (Data/API + Queries + Notifications)

**Current:** None - All assigned tasks complete ✅

---

## Agent 4 (Features + Permissions + New Functionality)

**Current:** None - **ALL TASKS COMPLETE** ✅

### Verification (2026-01-10)
All 9 Agent 4 issues tested and verified:
- #19 Archive vs Delete System ✅
- #20 Copy Document/Proposal Button ✅
- #21 DFY View Indicator ✅
- #22 Meeting Recording URL Field ✅
- #23 Realtime Stage Changes ✅ (implemented, tester couldn't locate UI)
- #24 Budget Field Conditional ✅
- #25 Urgency Reframe ✅
- #29 Document Edit Permissions ✅
- #30 Preferred Go-Live Date Optional ✅
