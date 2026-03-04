---
phase: 25-blocker-queue-v2-bento-grid
status: not_started
created: 2026-03-04
---

# Phase 25: Blocker Queue v2 — Bento Grid Redesign

## Goal
Iterate on the Phase 21 blocker queue redesign. Replace the thin single-column card list with a bento grid (3 per row), thicker cards that preview the actual problem, fold stat cards into chip filters, add RoleAvatar to conversation, and add "Report Blocker" to the project More menu.

## Key Decisions
- **Bento grid:** 3 columns on desktop, 2 on tablet, 1 on mobile
- **Card design:** Description focus — title + 2-3 lines of description preview + meta row
- **Stat cards removed:** Folded into clickable chip filter bar with counts
- **Conversation avatars:** Use existing `RoleAvatar` component (colored rings per role)
- **Report Blocker entry point:** Added to project "More" dropdown menu for dev/admin/dfy roles
- **Critical alert banner:** Kept as-is (shows only when critical blockers exist)

## Dependencies
- Phase 21 (blocker queue redesign) — must be complete (it is)

## Design Doc
`docs/plans/2026-03-04-blocker-queue-v2-bento-design.md`

## Files to Touch
- `lib/api/blockers.ts` — expand BlockerComment user query
- `features/admin/components/BlockerConversation.tsx` — RoleAvatar
- `features/admin/components/BlockerCard.tsx` — thicker bento card
- `features/admin/components/AdminBlockerQueue.tsx` — chip filters + grid
- `app/(dashboard)/admin/blockers/page.tsx` — remove stat cards
- `features/projects/components/ProjectTabs.tsx` — Report Blocker dropdown item
