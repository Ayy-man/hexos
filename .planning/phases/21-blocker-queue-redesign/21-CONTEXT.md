# Phase 21: Blocker Queue Redesign - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning
**Source:** PRD Express Path (docs/plans/2026-03-03-blocker-queue-redesign.md)

<domain>
## Phase Boundary

Replace the dense, dialog-heavy admin blocker queue (`/admin/blockers`) with a scannable card list + slide-over sidebar. The current UX dumps all info into fat cards, uses disconnected dialogs for resolve/comment, and has no detail view. The redesign introduces minimal cards for scanning, a Sheet sidebar for deep-dive, and a chat-like conversation thread.

**In scope:** AdminBlockerQueue rebuild, new BlockerCard/BlockerSidebar/BlockerConversation components, server action for client-side comment fetching, getAllBlockers API function for resolved/closed filter support.

**Out of scope:** Database schema changes, notification changes, dev dashboard blocker list, DFY dashboard blocker list, mobile-specific layouts.

</domain>

<decisions>
## Implementation Decisions

### Card Design
- Minimal compact cards with 3 rows: priority bar + title, description preview (1 line truncated), status badge + project + time + comment count + reporter
- Priority indicated by left-edge color bar (red=critical, orange=high, amber=medium, stone=low)
- Selected card gets `ring-1 ring-accent-border` highlight
- Cards are clickable `<button>` elements, not links

### Sidebar
- Sheet component, slides from right, ~40% viewport width (`sm:max-w-[40vw] sm:min-w-[400px]`)
- Two tabs: Overview and Conversation (using shadcn Tabs with `variant="line"`)
- Sheet overlay style (not split-panel), uses existing Vaul/Sheet primitives

### Overview Tab
- Full blocker detail: header with priority + status badges, meta section (reporter avatar, project, deliverable, ack time), full description
- Status transition buttons contextual: Acknowledge → Start Working → Resolve
- Resolve is inline textarea (no dialog) — click "Resolve" shows textarea + "Confirm Resolve" button
- Delete is inline confirmation (no dialog) — red warning box with confirm/cancel
- Escalate to DFY button (or "Escalated" badge if already escalated)
- Resolution section visible when status is resolved/closed

### Conversation Tab
- Chat-like thread, messages top-to-bottom, newest at bottom
- Each message: small avatar + name + timestamp + content
- Hover reveals edit/delete icons on own messages
- Composer at bottom: textarea + send button, Enter to send, Shift+Enter for newline
- Auto-scroll to newest on open
- Comments fetched lazily via server action when blocker is selected

### Role Access
- Same experience for all roles (admin, dev, DFY) — trust-based, no role gating on actions

### Filter Bar
- Simplified horizontal layout with Filter icon + 3 Select dropdowns (project, priority, status)
- Smaller selects: `h-8 text-xs w-[130-160px]`
- Default status filter: "Active" (excludes resolved/closed)

### Data Fetching
- New `getAllBlockers()` API function that includes resolved/closed (current `getAllActiveBlockers()` only returns active)
- New `getBlockerCommentsAction()` server action wrapper for client-side comment fetching
- Comments fetched lazily in useEffect when blockerId changes

### Claude's Discretion
- Exact animation timing for Sheet open/close (use shadcn defaults)
- Textarea auto-resize behavior in composer
- Optimistic updates for comment sending (optional)
- Keyboard shortcuts beyond Enter-to-send

</decisions>

<specifics>
## Specific Ideas

### Component Files
- `features/admin/components/BlockerCard.tsx` — new, minimal list card
- `features/admin/components/BlockerConversation.tsx` — new, chat thread + composer
- `features/admin/components/BlockerSidebar.tsx` — new, Sheet with Overview + Conversation tabs
- `features/admin/components/AdminBlockerQueue.tsx` — rewrite as thin orchestrator

### API Changes
- Add `getAllBlockers()` to `lib/api/blockers.ts`
- Add `getBlockerCommentsAction()` to `features/dev/actions/blockerActions.ts`
- Update `app/(dashboard)/admin/blockers/page.tsx` to pass all blockers

### Design Tokens (from globals.css)
- Backgrounds: `bg-bg-card`, `bg-bg-hover`, `bg-bg-elevated`
- Borders: `border-border-hairline`, `ring-accent-border`
- Text: `text-text-primary`, `text-text-secondary`, `text-text-tertiary`, `text-text-ghost`
- Signals: `signal-bad` (critical), `signal-warn` (medium), `signal-good` (resolved), `accent` (acknowledged/in-progress)
- Shadow: `shadow-float` for Sheet

### Existing Primitives
- `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription` from `@/components/ui/sheet`
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` from `@/components/ui/tabs`
- `Avatar`, `AvatarFallback` from `@/components/ui/avatar`
- `ScrollArea` from `@/components/ui/scroll-area`
- `Badge`, `Button`, `Textarea`, `Select`, `Separator` already in use

### Existing Server Actions (all exist, no changes needed)
- `updateBlockerStatusAction`, `escalateBlockerAction`, `deleteBlockerAction`
- `addBlockerCommentAction`, `updateBlockerCommentAction`, `deleteBlockerCommentAction`

</specifics>

<deferred>
## Deferred Ideas

- Real-time comment updates via Supabase subscriptions
- @mentions in conversation thread
- File attachments on blocker comments
- Blocker detail page (standalone route vs sidebar-only)
- Mobile-specific sheet behavior (full-screen on small screens)

</deferred>

---

*Phase: 21-blocker-queue-redesign*
*Context gathered: 2026-03-03 via PRD Express Path*
