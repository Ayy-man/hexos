---
phase: quick-002
plan: "01"
subsystem: mentions
tags: [mentions, notifications, autocomplete, cleanup]
dependency_graph:
  requires: []
  provides: [working-mention-autocomplete, mention-notifications]
  affects: [features/projects/actions/documentActions.ts, lib/api/mentionables.ts, app/api/projects/mentionables/route.ts, lib/api/notifications-utils.ts, components/ui/mention-node.tsx]
tech_stack:
  added: []
  patterns: [extractMentionUserIds recursive walker, fire-and-forget Promise.allSettled for notifications]
key_files:
  created: []
  modified:
    - app/api/projects/[id]/mentionables/route.ts
    - features/projects/actions/documentActions.ts
    - lib/api/mentionables.ts
    - lib/api/notifications-utils.ts
    - components/ui/mention-node.tsx
decisions:
  - "Use admin client in lib/api/mentionables.ts to bypass RLS for profiles query"
  - "Fire-and-forget mention notifications with Promise.allSettled to never block document save"
  - "Recursive node walker for Plate.js content — handles arbitrarily nested node trees"
  - "Diff old vs new mention IDs before save to detect only newly added mentions"
metrics:
  duration: "18 minutes"
  completed_date: "2026-02-22"
  tasks_completed: 3
  files_modified: 5
---

# Quick Task 2: Fix Broken Mentions — Connect Autocomplete Summary

**One-liner:** Expanded mentionables API to include client + all admin/internal profiles, wired mention notifications on save, and stripped 76-item Star Wars dead code array from mention-node.tsx.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Expand mentionables query to include all project-accessible users | 75f19f7 | app/api/projects/[id]/mentionables/route.ts, features/projects/actions/documentActions.ts, lib/api/mentionables.ts |
| 2 | Add mention detection and notifications on document save | b5b2b94 | features/projects/actions/documentActions.ts, lib/api/notifications-utils.ts |
| 3 | Remove dead Star Wars mention code | 99a05fe | components/ui/mention-node.tsx |

## What Was Built

### Task 1: Full User Scope for Mentionables

All three mentionables data sources now return the complete set of project-accessible users:

- `dfy_partner` — via `profiles!dfy_partner_id` join
- `assigned_dev` — via `profiles!assigned_dev_id` join
- `client` — via `profiles!projects_client_id_fkey` join (was missing)
- All `admin` and `internal` profiles — via separate `profiles.role IN ('admin', 'internal')` query

`lib/api/mentionables.ts` was also fixed to use `createAdminClient` instead of the regular server client. The previous version queried a non-existent `project_assignments` table which would silently fail or throw, leaving only the `dfy_partner` as a result.

### Task 2: Mention Notifications

Added `extractMentionUserIds(content)` helper in `documentActions.ts` that:
- Takes Plate.js content (array of node objects)
- Recursively walks the node tree
- Collects `key` from nodes where `type === 'mention'` AND `trigger === '@'`
- Returns deduplicated user ID array

`updateGameplanContentAction` now:
1. Fetches current doc content before overwriting
2. Diffs old mention IDs vs new mention IDs
3. Excludes the current user from the notification recipients
4. Fires `createNotification` for each newly added mention user (fire-and-forget, never blocks save)

Also fixed `getNotificationUrl` in `notifications-utils.ts`: `mention` type now routes to `?tab=gameplan` instead of `?tab=activity`.

### Task 3: Dead Code Removal

Removed from `components/ui/mention-node.tsx`:
- `MENTIONABLES` array (76 Star Wars character names — Aayla Secura through BT-1)
- `MentionInputElement` component (used the deleted array)
- `getMentionOnSelectItem` import and `onSelectItem` variable
- All `InlineCombobox*` imports (only used by deleted `MentionInputElement`)

Only `MentionElement` (the rendered chip component) remains. The gameplan editor uses `UserMentionInputElement` and `DeliverableMentionInputElement` from `gameplan-mention-kit.tsx` instead.

## Decisions Made

1. **Admin client in lib/api/mentionables.ts** — Regular server client would fail RLS on cross-user profile reads. Switching to admin client matches the pattern already used in the other two mentionables data sources.

2. **Fire-and-forget with Promise.allSettled** — Mention notification delivery must never block document save. Individual notification failures are logged but do not propagate. Uses `Promise.allSettled` (not `Promise.all`) so one failure doesn't cancel others.

3. **Recursive walker for Plate.js content** — Plate.js node trees can be arbitrarily nested. A simple flat map would miss mentions inside other block types (e.g., a mention inside a blockquote inside a paragraph).

4. **Diff before save** — Fetching current content before `updateProjectDocument` enables accurate detection of only newly added mentions. Without this, every save would re-notify all mentioned users.

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

1. `npx tsc --noEmit` — passed with no errors
2. No `project_assignments` in `lib/api/mentionables.ts` — confirmed removed
3. No Star Wars character names in codebase (TS/TSX files) — confirmed clean
4. `createNotification` in `updateGameplanContentAction` — confirmed present
5. Mention notification URL points to `?tab=gameplan` — confirmed
6. All three mentionables sources query for admin/internal profiles — confirmed

## Self-Check: PASSED

Files exist:
- FOUND: features/projects/actions/documentActions.ts
- FOUND: app/api/projects/[id]/mentionables/route.ts
- FOUND: lib/api/mentionables.ts
- FOUND: lib/api/notifications-utils.ts
- FOUND: components/ui/mention-node.tsx

Commits exist:
- FOUND: 75f19f7 (Task 1)
- FOUND: b5b2b94 (Task 2)
- FOUND: 99a05fe (Task 3)
