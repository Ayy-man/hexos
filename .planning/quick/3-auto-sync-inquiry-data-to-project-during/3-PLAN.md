---
phase: quick-3
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/api/inquiries.ts
  - features/project-initiation/actions/initiationActions.ts
autonomous: true
requirements: [QUICK-3]

must_haves:
  truths:
    - "Converting inquiry to project via ConvertToProjectWizard auto-populates date_inquiry, date_proposal_sent, date_closed, price_hexona, price_dev on the new project"
    - "Converting inquiry to project via InitiateWizard auto-populates the same 5 fields on the new project"
    - "Null inquiry fields produce null project fields (no crashes on missing data)"
  artifacts:
    - path: "lib/api/inquiries.ts"
      provides: "convertInquiryToProjectFull with date/price sync"
      contains: "date_inquiry"
    - path: "features/project-initiation/actions/initiationActions.ts"
      provides: "completeInitiationAction with date/price sync"
      contains: "date_inquiry"
  key_links:
    - from: "inquiries.created_at"
      to: "projects.date_inquiry"
      via: "insert in convertInquiryToProjectFull"
      pattern: "date_inquiry.*inquiry\\.created_at"
    - from: "inquiries.proposal_submitted_at"
      to: "projects.date_proposal_sent"
      via: "insert in convertInquiryToProjectFull"
      pattern: "date_proposal_sent.*inquiry\\.proposal_submitted_at"
---

<objective>
Auto-sync inquiry data fields to the project during inquiry-to-project conversion.

Purpose: When converting an inquiry to a project, 5 fields that exist on both sides are never connected. The project's Info tab shows empty date_inquiry, date_proposal_sent, date_closed, price_hexona, and price_dev even though the source inquiry has this data. This plan wires the mapping in both conversion paths.

Output: Both conversion functions (`convertInquiryToProjectFull` and `completeInitiationAction`) populate the 5 project fields from the source inquiry automatically.
</objective>

<execution_context>
@/Users/aymanbaig/.claude/get-shit-done/workflows/execute-plan.md
@/Users/aymanbaig/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@lib/api/inquiries.ts (convertInquiryToProjectFull at ~line 833, inquiry select at ~line 859-863, project insert at ~line 868-885)
@features/project-initiation/actions/initiationActions.ts (completeInitiationAction at ~line 49, inquiry select at ~line 82-86, project insert at ~line 95-114)

<interfaces>
<!-- Field mapping (inquiry column -> project column): -->
<!-- inquiries.created_at         -> projects.date_inquiry -->
<!-- inquiries.proposal_submitted_at -> projects.date_proposal_sent -->
<!-- inquiries.closed_at          -> projects.date_closed -->
<!-- inquiries.price_hexona       -> projects.price_hexona -->
<!-- inquiries.price_dev          -> projects.price_dev -->

From lib/api/projects.ts (project type, lines 43-45):
```typescript
date_inquiry: string | null
date_proposal_sent: string | null
date_closed: string | null
price_hexona: number | null
price_dev: number | null
```

From agent_docs/database.md (inquiries table):
```sql
price_hexona DECIMAL(10,2),           -- What Hexona charges DFY partner
price_dev DECIMAL(10,2),              -- What Hexona pays developer
proposal_submitted_at TIMESTAMPTZ,
closed_at TIMESTAMPTZ,               -- When DFY marked deal as closed
created_at TIMESTAMPTZ DEFAULT NOW()
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add inquiry field sync to convertInquiryToProjectFull</name>
  <files>lib/api/inquiries.ts</files>
  <action>
In `convertInquiryToProjectFull` (around line 833):

1. Expand the inquiry select query (line 861) from:
   `.select('submitted_by, blueprint_id')`
   to:
   `.select('submitted_by, blueprint_id, created_at, proposal_submitted_at, closed_at, price_hexona, price_dev')`

2. Add the 5 fields to the project insert object (lines 870-884), after `source_inquiry_id: inquiryId`:
   ```
   date_inquiry: inquiry.created_at || null,
   date_proposal_sent: inquiry.proposal_submitted_at || null,
   date_closed: inquiry.closed_at || null,
   price_hexona: inquiry.price_hexona || null,
   price_dev: inquiry.price_dev || null,
   ```

Do NOT change the ConvertToProjectInput type or any other part of the function. The sync is purely server-side from the inquiry row, not from user input.
  </action>
  <verify>
    <automated>cd "/Users/aymanbaig/Desktop/Manual Library/hexos-main" && grep -A2 "date_inquiry" lib/api/inquiries.ts | head -10 && grep "proposal_submitted_at" lib/api/inquiries.ts | head -5</automated>
  </verify>
  <done>convertInquiryToProjectFull fetches the 5 inquiry fields and maps them into the project insert. The select includes created_at, proposal_submitted_at, closed_at, price_hexona, price_dev. The insert includes date_inquiry, date_proposal_sent, date_closed, price_hexona, price_dev.</done>
</task>

<task type="auto">
  <name>Task 2: Add inquiry field sync to completeInitiationAction</name>
  <files>features/project-initiation/actions/initiationActions.ts</files>
  <action>
In `completeInitiationAction` (around line 49):

1. Expand the inquiry select query (line 83) from:
   `.select('submitted_by, blueprint_id, status')`
   to:
   `.select('submitted_by, blueprint_id, status, created_at, proposal_submitted_at, closed_at, price_hexona, price_dev')`

2. Add the 5 fields to the project insert object (lines 97-113), after `source_inquiry_id: inquiryId`:
   ```
   date_inquiry: inquiry.created_at || null,
   date_proposal_sent: inquiry.proposal_submitted_at || null,
   date_closed: inquiry.closed_at || null,
   price_hexona: projectData.price_hexona || inquiry.price_hexona || null,
   price_dev: projectData.price_dev || inquiry.price_dev || null,
   ```

Note for price_hexona and price_dev: The InitiateProjectInput type already accepts these fields (lines 26-27) and the insert already writes them (lines 106-107). Update those existing lines to ALSO fall back to the inquiry values if the user didn't provide them:
   - Change `price_hexona: projectData.price_hexona || null` to `price_hexona: projectData.price_hexona ?? inquiry.price_hexona ?? null`
   - Change `price_dev: projectData.price_dev || null` to `price_dev: projectData.price_dev ?? inquiry.price_dev ?? null`
   - Use `??` (nullish coalescing) not `||` so that explicit 0 values are preserved.

Add the 3 date fields as new lines in the insert:
   ```
   date_inquiry: inquiry.created_at || null,
   date_proposal_sent: inquiry.proposal_submitted_at || null,
   date_closed: inquiry.closed_at || null,
   ```
  </action>
  <verify>
    <automated>cd "/Users/aymanbaig/Desktop/Manual Library/hexos-main" && grep -A2 "date_inquiry" features/project-initiation/actions/initiationActions.ts | head -10 && grep "proposal_submitted_at" features/project-initiation/actions/initiationActions.ts | head -5 && pnpm typecheck 2>&1 | tail -5</automated>
  </verify>
  <done>completeInitiationAction fetches the 5 inquiry fields and maps them into the project insert. price_hexona and price_dev use nullish coalescing to prefer user input but fall back to inquiry values. The 3 date fields are always synced from the inquiry.</done>
</task>

</tasks>

<verification>
1. `pnpm typecheck` passes with no errors (both functions use valid column names)
2. `grep -n "date_inquiry\|date_proposal_sent\|date_closed" lib/api/inquiries.ts features/project-initiation/actions/initiationActions.ts` shows the mappings in both files
3. Both inquiry selects include: created_at, proposal_submitted_at, closed_at, price_hexona, price_dev
</verification>

<success_criteria>
- Both conversion paths (ConvertToProjectWizard and InitiateWizard) auto-populate the 5 fields on the new project from the source inquiry
- TypeScript compiles cleanly
- No changes to UI components or types needed (fields already exist on both sides)
</success_criteria>

<output>
After completion, create `.planning/quick/3-auto-sync-inquiry-data-to-project-during/3-SUMMARY.md`
</output>
