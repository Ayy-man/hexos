# Blocker Queue v2 — Bento Grid Redesign

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Iterate on the Phase 21 blocker queue redesign. Replace the thin single-column card list with a bento grid (3 per row), thicker cards that preview the actual problem, fold stat cards into chip filters, add RoleAvatar to conversation, and add "Report Blocker" to the project More menu.

**Architecture:** Same component structure — `AdminBlockerQueue` orchestrator, `BlockerCard`, `BlockerSidebar`, `BlockerConversation`. Changes are layout + styling + data enrichment, not structural.

**Tech Stack:** React 19, Next.js, shadcn Badge/Select, Tailwind CSS 4, existing Supabase API layer, `RoleAvatar` component.

---

## Task 1: Expand BlockerComment type and API queries to include role + avatar_url

**Files:**
- Modify: `lib/api/blockers.ts:46-57` (BlockerComment interface)
- Modify: `lib/api/blockers.ts:367-370` (addBlockerComment query)
- Modify: `lib/api/blockers.ts:385-388` (getBlockerComments query)
- Modify: `lib/api/blockers.ts:405-409` (updateBlockerComment query)

**Step 1: Update BlockerComment interface**

In `lib/api/blockers.ts`, change the `user` field on `BlockerComment` from:

```ts
  user?: {
    id: string
    name: string
  }
```

to:

```ts
  user?: {
    id: string
    name: string
    role: string
    avatar_url: string | null
  }
```

**Step 2: Update all three comment queries**

In `addBlockerComment`, `getBlockerComments`, and `updateBlockerComment`, change:

```
user:profiles(id, name)
```

to:

```
user:profiles(id, name, role, avatar_url)
```

There are 3 occurrences — lines 369, 387, and 408.

**Step 3: Verify build**

Run: `npx next build 2>&1 | head -30`
Expected: No type errors.

**Step 4: Commit**

```bash
git add lib/api/blockers.ts
git commit -m "feat(blockers): include role + avatar_url in comment user profiles"
```

---

## Task 2: Replace Avatar with RoleAvatar in BlockerConversation

**Files:**
- Modify: `features/admin/components/BlockerConversation.tsx`

**Step 1: Swap imports**

Replace:

```tsx
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
```

with:

```tsx
import { RoleAvatar } from '@/components/ui/role-avatar'
import type { UserRole } from '@/lib/auth/types'
```

**Step 2: Replace Avatar usage in message rendering**

In the `comments.map()` block (around line 125-130), replace:

```tsx
<Avatar size="sm" className="mt-0.5 flex-shrink-0">
  <AvatarFallback className="text-[10px]">
    {getInitials(comment.user?.name)}
  </AvatarFallback>
</Avatar>
```

with:

```tsx
<RoleAvatar
  role={(comment.user?.role as UserRole) || 'dev'}
  name={comment.user?.name || 'Unknown'}
  avatarUrl={comment.user?.avatar_url}
  size="sm"
  className="mt-0.5 flex-shrink-0"
/>
```

**Step 3: Remove the `getInitials` helper function (lines 106-109)**

It's no longer used — `RoleAvatar` handles initials internally.

**Step 4: Verify build**

Run: `npx next build 2>&1 | head -30`

**Step 5: Commit**

```bash
git add features/admin/components/BlockerConversation.tsx
git commit -m "feat(blockers): use RoleAvatar with colored rings in conversation"
```

---

## Task 3: Redesign BlockerCard as a thicker bento card

**Files:**
- Modify: `features/admin/components/BlockerCard.tsx` (full rewrite of JSX)

**Step 1: Replace the full component JSX**

Rewrite `BlockerCard` with thicker layout: priority badge + project on row 1, wrapping title on row 2, 2-3 line description on row 3, meta row on row 4. Keep the same props interface and config objects.

Replace the `return (...)` block (lines 48-102) with:

```tsx
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-lg border bg-bg-card p-4 transition-colors hover:bg-bg-hover flex flex-col gap-2 ${
        isSelected
          ? 'ring-1 ring-accent-border border-accent-border'
          : 'border-border-hairline'
      }`}
    >
      {/* Row 1: priority badge + project name */}
      <div className="flex items-center gap-2">
        <div
          className={`h-2 w-2 flex-shrink-0 rounded-full ${priorityColors[blocker.priority]}`}
        />
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${status.className}`}>
          {status.label}
        </Badge>
        {projectName && (
          <span className="text-xs text-text-tertiary truncate ml-auto">{projectName}</span>
        )}
      </div>

      {/* Row 2: title (wraps up to 2 lines) */}
      <h3 className="font-semibold text-text-primary text-sm line-clamp-2 leading-snug">
        {blocker.title}
      </h3>

      {/* Row 3: description preview (2-3 lines) */}
      {blocker.description && (
        <p className="text-xs text-text-secondary line-clamp-3 leading-relaxed">
          {blocker.description}
        </p>
      )}

      {/* Row 4: time + reporter + comments */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-text-tertiary mt-auto pt-1">
        <span>{formatDistanceToNow(new Date(blocker.created_at), { addSuffix: false })}</span>
        {blocker.reporter?.name && (
          <>
            <span>&middot;</span>
            <span className="truncate max-w-[100px]">{blocker.reporter.name}</span>
          </>
        )}
        {(blocker.comments_count ?? 0) > 0 && (
          <>
            <span>&middot;</span>
            <span className="inline-flex items-center gap-0.5">
              <MessageCircle className="h-3 w-3" />
              {blocker.comments_count}
            </span>
          </>
        )}
      </div>
    </button>
  )
```

**Step 2: Verify build**

Run: `npx next build 2>&1 | head -30`

**Step 3: Commit**

```bash
git add features/admin/components/BlockerCard.tsx
git commit -m "feat(blockers): redesign BlockerCard as thicker bento card with description preview"
```

---

## Task 4: Replace stat cards with chip filters + bento grid layout in AdminBlockerQueue

**Files:**
- Modify: `features/admin/components/AdminBlockerQueue.tsx` (rewrite filter bar + grid)
- Modify: `app/(dashboard)/admin/blockers/page.tsx` (remove stat cards, simplify)

**Step 1: Rewrite AdminBlockerQueue with chip status filters + grid**

Replace the entire file content:

```tsx
'use client'

import { useState, useMemo } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Check, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BlockerCard } from './BlockerCard'
import { BlockerSidebar } from './BlockerSidebar'
import type { Blocker, BlockerPriority, BlockerStatus } from '@/lib/api/blockers'

interface Project {
  id: string
  project_name: string
  client_name: string
}

interface AdminBlockerQueueProps {
  blockers: Blocker[]
  projects: Project[]
}

const priorityOrder: Record<BlockerPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

type StatusFilter = 'active' | 'all' | BlockerStatus

interface StatusChip {
  key: StatusFilter
  label: string
  count: (blockers: Blocker[]) => number
}

const statusChips: StatusChip[] = [
  { key: 'active', label: 'Active', count: (b) => b.filter(x => !['resolved', 'closed'].includes(x.status)).length },
  { key: 'reported', label: 'New', count: (b) => b.filter(x => x.status === 'reported').length },
  { key: 'acknowledged', label: 'Acknowledged', count: (b) => b.filter(x => x.status === 'acknowledged').length },
  { key: 'in_progress', label: 'In Progress', count: (b) => b.filter(x => x.status === 'in_progress').length },
  { key: 'resolved', label: 'Resolved', count: (b) => b.filter(x => x.status === 'resolved').length },
  { key: 'all', label: 'All', count: (b) => b.length },
]

export function AdminBlockerQueue({ blockers, projects }: AdminBlockerQueueProps) {
  const [filterProject, setFilterProject] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('active')
  const [selectedBlocker, setSelectedBlocker] = useState<Blocker | null>(null)

  // Pre-filter by project/priority for chip counts
  const projectPriorityFiltered = useMemo(() => {
    let result = blockers
    if (filterProject !== 'all') {
      result = result.filter(b => b.project_id === filterProject)
    }
    if (filterPriority !== 'all') {
      result = result.filter(b => b.priority === filterPriority)
    }
    return result
  }, [blockers, filterProject, filterPriority])

  // Apply status filter
  const filtered = useMemo(() => {
    let result = projectPriorityFiltered
    if (filterStatus === 'active') {
      result = result.filter(b => !['resolved', 'closed'].includes(b.status))
    } else if (filterStatus !== 'all') {
      result = result.filter(b => b.status === filterStatus)
    }
    // Sort: priority first, then oldest first
    return [...result].sort((a, b) => {
      const pd = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (pd !== 0) return pd
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })
  }, [projectPriorityFiltered, filterStatus])

  // Keep selected blocker in sync with latest data after router.refresh()
  const selectedBlockerData = selectedBlocker
    ? blockers.find(b => b.id === selectedBlocker.id) ?? null
    : null

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 text-text-ghost" />
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="All projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="All priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Status chip filters */}
      <div className="flex flex-wrap gap-2">
        {statusChips.map((chip) => {
          const count = chip.count(projectPriorityFiltered)
          const isActive = filterStatus === chip.key
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => setFilterStatus(chip.key)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-bg-hover text-text-secondary hover:bg-bg-active'
              )}
            >
              {chip.label}
              <span className={cn(
                'rounded-full px-1.5 py-0 text-[10px] min-w-[18px] text-center',
                isActive ? 'bg-accent-foreground/20' : 'bg-bg-active'
              )}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Bento grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-text-tertiary">
          <Check className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm">No blockers matching your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((blocker) => {
            const project = projects.find(p => p.id === blocker.project_id)
            return (
              <BlockerCard
                key={blocker.id}
                blocker={blocker}
                projectName={project?.project_name}
                isSelected={selectedBlocker?.id === blocker.id}
                onClick={() => setSelectedBlocker(blocker)}
              />
            )
          })}
        </div>
      )}

      {/* Sidebar */}
      <BlockerSidebar
        blocker={selectedBlockerData}
        onClose={() => setSelectedBlocker(null)}
      />
    </div>
  )
}
```

**Step 2: Simplify the page — remove stat cards**

In `app/(dashboard)/admin/blockers/page.tsx`, replace the entire file with:

```tsx
import { requireRole } from '@/lib/auth/guards'
import { getAllBlockers } from '@/lib/api/blockers'
import { getProjects } from '@/lib/api/projects'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'
import { AdminBlockerQueue } from '@/features/admin/components/AdminBlockerQueue'

export default async function AdminBlockersPage() {
  await requireRole(['admin', 'internal', 'dev', 'dfy'])

  const [allBlockers, projects] = await Promise.all([
    getAllBlockers().catch(() => []),
    getProjects().catch(() => []),
  ])

  const critical = allBlockers.filter(
    b => b.priority === 'critical' && !['resolved', 'closed'].includes(b.status)
  ).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Blocker Queue</h1>
        <p className="text-muted-foreground">
          Manage blockers reported by developers across all projects
        </p>
      </div>

      {/* Critical Alert — only when critical blockers exist */}
      {critical > 0 && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-red-800 dark:text-red-200">
                {critical} Critical Blocker{critical !== 1 ? 's' : ''} Requires Immediate Attention
              </p>
              <p className="text-sm text-red-600 dark:text-red-400">
                These are causing complete work stoppages
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <AdminBlockerQueue blockers={allBlockers} projects={projects} />
    </div>
  )
}
```

**Step 3: Verify build**

Run: `npx next build 2>&1 | head -30`

**Step 4: Commit**

```bash
git add features/admin/components/AdminBlockerQueue.tsx "app/(dashboard)/admin/blockers/page.tsx"
git commit -m "feat(blockers): bento grid layout with chip status filters, remove stat cards"
```

---

## Task 5: Add "Report Blocker" to project More dropdown

**Files:**
- Modify: `features/projects/components/ProjectTabs.tsx`

**Step 1: Add import for BlockerReportDialog and AlertTriangle icon**

At the top of the file, add to the lucide import (line 12):

```tsx
import { ..., AlertTriangle, ... } from 'lucide-react'
```

Add a new import:

```tsx
import { BlockerReportDialog } from '@/features/dev/components/BlockerReportDialog'
```

**Step 2: Add state for the blocker dialog**

Inside the `ProjectTabs` component, after the existing state declarations (around line 109), add:

```tsx
const [blockerDialogOpen, setBlockerDialogOpen] = useState(false)
```

**Step 3: Add "Report Blocker" to the More dropdown**

In the `<DropdownMenuContent>` (around line 238-289), add a new item after the "Improvements" item (line 271) and before the admin-only section:

```tsx
{showDevelopmentTabs && (userRole === 'dev' || userRole === 'admin' || userRole === 'dfy') && (
  <>
    <DropdownMenuSeparator />
    <DropdownMenuItem
      onClick={() => setBlockerDialogOpen(true)}
      className="gap-2 text-signal-warn"
    >
      <AlertTriangle className="h-4 w-4" />
      Report Blocker
    </DropdownMenuItem>
  </>
)}
```

**Step 4: Add the BlockerReportDialog outside the Tabs component**

Just before the closing `</Tabs>` tag (line 440), but still inside the component's return, add:

Actually, we need to render the dialog outside the Tabs to avoid z-index issues. Add right after the closing `</Tabs>` tag, still inside the component return. Wrap the return in a fragment:

Change the return from `return (<Tabs ...>...</Tabs>)` to:

```tsx
return (
  <>
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      {/* ... existing content ... */}
    </Tabs>
    <BlockerReportDialog
      projectId={project.id}
      deliverables={project.deliverables?.map(d => ({ id: d.id, title: d.title, project_id: project.id })) || []}
      trigger={<span className="hidden" />}
    />
  </>
)
```

Wait — `BlockerReportDialog` manages its own open state internally via `DialogTrigger`. We need to control it externally. The simplest approach: use the dialog's `trigger` prop with a ref-based approach, OR just render it with a controlled open prop.

Looking at `BlockerReportDialog`, it uses internal `useState(false)` for `open`. The cleanest approach is to just conditionally render it with a visible trigger when needed. But actually, the dropdown menu item can just render the `BlockerReportDialog` inline with its own trigger.

**Revised approach — simpler:** Just add a `BlockerReportDialog` component as a direct child inside the dropdown, triggered by the menu item. Since `BlockerReportDialog` already uses `Dialog` + `DialogTrigger`, we can use it directly:

Actually, the cleanest approach: add a standalone `BlockerReportDialog` with a hidden trigger, and programmatically open it. But `BlockerReportDialog` doesn't expose a controlled `open` prop.

**Simplest approach:** Render the `BlockerReportDialog` at the bottom of the component with a `ref` trigger button, and click it programmatically. But that's hacky.

**Best approach:** Just add the `BlockerReportDialog` with a visible trigger button outside the dropdown. But the user wants it IN the dropdown.

**Final approach:** Add state + render a separate Dialog. The `BlockerReportDialog` accepts `trigger` and manages its own state. Render it with an invisible trigger, and control via state:

Actually the cleanest solution: add the DropdownMenuItem that opens the BlockerReportDialog by nesting it. DropdownMenu items close the dropdown on click, then the dialog opens. So we do this:

1. Add state `showBlockerDialog`
2. DropdownMenuItem sets it to true
3. Render `BlockerReportDialog` with controlled open state — but it doesn't support that

Let's just modify our approach: add a standalone hidden trigger that we click programmatically via ref:

```tsx
const blockerTriggerRef = useRef<HTMLButtonElement>(null)
```

In the dropdown:
```tsx
<DropdownMenuItem onClick={() => setTimeout(() => blockerTriggerRef.current?.click(), 0)} className="gap-2 text-signal-warn">
  <AlertTriangle className="h-4 w-4" />
  Report Blocker
</DropdownMenuItem>
```

After `</Tabs>`:
```tsx
<BlockerReportDialog
  projectId={project.id}
  deliverables={project.deliverables?.map(d => ({ id: d.id, title: d.title, project_id: project.id })) || []}
  trigger={<button ref={blockerTriggerRef} className="hidden" />}
/>
```

The `setTimeout` ensures the dropdown closes before the dialog opens (avoids focus conflicts).

**Step 5: Add the DropdownMenuSeparator import**

Add to the dropdown imports (line 8):

```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
```

**Step 6: Wrap return in fragment**

Change line 155:
```tsx
return (
  <Tabs ...>
```
to:
```tsx
return (
  <>
    <Tabs ...>
```

And after the closing `</Tabs>` (line 440):
```tsx
    </Tabs>
    <BlockerReportDialog
      projectId={project.id}
      deliverables={project.deliverables?.map((d: any) => ({ id: d.id, title: d.title, project_id: project.id })) || []}
      trigger={<button ref={blockerTriggerRef} className="hidden" />}
    />
  </>
)
```

**Step 7: Add ref import**

Change line 3 from:
```tsx
import { useState, useEffect } from 'react'
```
to:
```tsx
import { useState, useEffect, useRef } from 'react'
```

**Step 8: Verify build**

Run: `npx next build 2>&1 | head -30`

**Step 9: Commit**

```bash
git add features/projects/components/ProjectTabs.tsx
git commit -m "feat(blockers): add Report Blocker option to project More dropdown"
```

---

## Task 6: Visual smoke test

**Step 1: Run the dev server**

```bash
npm run dev
```

**Step 2: Navigate to /admin/blockers and verify:**

- [ ] Stat cards are GONE (replaced by chip filters)
- [ ] Chip filter bar shows: Active (n), New (n), Acknowledged (n), In Progress (n), Resolved (n), All (n)
- [ ] Clicking a chip filters the grid
- [ ] Bento grid shows 3 cards per row on desktop, 2 on medium, 1 on mobile
- [ ] Cards are thicker with: priority dot + status badge, wrapping title, 2-3 line description, meta row
- [ ] Clicking a card opens the sidebar sheet
- [ ] Critical alert banner still shows when there are critical blockers
- [ ] Project and priority dropdown filters still work

**Step 3: Check conversation RoleAvatar:**

- [ ] Click a blocker card to open sidebar
- [ ] Go to Conversation tab
- [ ] Messages show colored-ring avatars (teal for admin, sky for dev, amber for DFY)

**Step 4: Check Report Blocker in project view:**

- [ ] Navigate to a project in development phase
- [ ] Click the "More" dropdown in project tabs
- [ ] "Report Blocker" option appears with warning icon
- [ ] Clicking it opens the BlockerReportDialog with the project pre-selected

**Step 5: Fix any issues found and commit**

```bash
git add -A
git commit -m "fix(blockers): polish bento grid and conversation styling"
```

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Expand BlockerComment type + queries | `lib/api/blockers.ts` |
| 2 | RoleAvatar in conversation | `features/admin/components/BlockerConversation.tsx` |
| 3 | Thicker bento card design | `features/admin/components/BlockerCard.tsx` |
| 4 | Chip filters + bento grid layout | `AdminBlockerQueue.tsx`, `page.tsx` |
| 5 | Report Blocker in project More menu | `features/projects/components/ProjectTabs.tsx` |
| 6 | Visual smoke test | All of the above |
