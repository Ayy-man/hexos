# Blocker Queue v2 — Bento Grid Redesign

**Goal:** Iterate on the Phase 21 blocker queue redesign. Replace the thin single-column card list with a bento grid (3 per row), thicker cards that preview the actual problem, fold stat cards into chip filters, add RoleAvatar to conversation, and add "Report Blocker" to the project More menu.

**Architecture:** Same component structure — `AdminBlockerQueue` orchestrator, `BlockerCard`, `BlockerSidebar`, `BlockerConversation`. Changes are layout + styling + data enrichment, not structural.

---

## Changes

### 1. Remove stat cards, replace with chip filter bar

**Files:** `app/(dashboard)/admin/blockers/page.tsx`, `features/admin/components/AdminBlockerQueue.tsx`

Remove the 4 `<Card>` stat components from `page.tsx`. Pass blocker counts to `AdminBlockerQueue` as props (or compute inline).

Replace the status `<Select>` dropdown with clickable chip/badge buttons showing counts:

```
[Active (3)] [New (1)] [Acknowledged (0)] [In Progress (1)] [Resolved (2)]
```

Active is selected by default. Clicking a chip filters to that status. Keep the project and priority `<Select>` dropdowns as-is.

Keep the critical alert banner — only shows when critical > 0.

### 2. Bento grid layout

**File:** `features/admin/components/AdminBlockerQueue.tsx`

Change the card container from `space-y-2` (vertical stack) to:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
```

### 3. Thicker bento cards

**File:** `features/admin/components/BlockerCard.tsx`

- Increase padding: `p-3` → `p-4`
- Title: `text-sm font-semibold`, allow wrap to 2 lines (`line-clamp-2`)
- Description: show 2-3 lines with `line-clamp-3` (currently single-line truncate)
- Priority: colored left border bar stays
- Row 1: Priority badge (colored) + project name
- Row 2: Title (wraps)
- Row 3: Description preview (2-3 lines)
- Row 4: Status badge + time + reporter + comment count

### 4. RoleAvatar in conversation

**Files:** `lib/api/blockers.ts`, `features/admin/components/BlockerConversation.tsx`

Expand comment query to include role + avatar:

```sql
user:profiles(id, name, role, avatar_url)
```

Update `BlockerComment` interface to include `role` and `avatar_url` on the user object.

Replace `Avatar`/`AvatarFallback` with `RoleAvatar` component in `BlockerConversation.tsx`.

### 5. Report Blocker from project More menu

**File:** `features/projects/components/ProjectTabs.tsx`

Add a "Report Blocker" `DropdownMenuItem` to the More dropdown. Show for dev + admin roles (during development phases, alongside Deliverables/Requirements).

Clicking opens the existing `BlockerReportDialog` with the current project pre-selected. The dialog component already supports a `projectId` prop for pre-selection.

---

## Non-goals

- No changes to BlockerSidebar (already working well)
- No changes to the blocker API mutations (create/update/delete)
- No responsive mobile changes beyond what the grid handles naturally
