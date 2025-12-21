# Components

## Available Tools (MCPs)

Claude has access to these MCPs for component work. Use at your discretion:

| MCP | Purpose | When to Use |
|-----|---------|-------------|
| **shadcn MCP** | Add/modify shadcn/ui components | Base UI components (Button, Card, Dialog, etc.) |
| **Kibo UI** | Complex data views | Gantt, Kanban, Calendar, Table, Editor |
| **21st.dev Magic** | AI-generated components | Custom/novel UI patterns not in shadcn or Kibo |

**Decision flow:**
1. Need exists → Check if shadcn has it → `shadcn add <component>`
2. Complex data view → Check if Kibo has it → `npx kibo-ui add <component>`
3. Neither has it → Use 21st.dev to generate, or ask user for custom component

---

## 🐕 Dogfooding Note

**hexOS itself is the first project in hexOS.**

Once the Projects dashboard is functional, create "hexOS Development" as a project to:
- Track its own development progress
- Test Workspace/Portal sync
- Validate Gantt, Kanban, and other views with real data
- Catch UX issues by actually using the tool

---

## Primary: Kibo UI

For complex views (Gantt, Kanban, Calendar, etc.), use **Kibo UI** components.

**Install:** `npx kibo-ui add <component>`
**Docs:** https://kibo-ui.com
**Location:** `src/components/ui/kibo-ui/`

| Component | hexOS Use | Install |
|-----------|-----------|---------|
| **Gantt** | Deliverables timeline | `npx kibo-ui add gantt` |
| **Kanban** | Pipeline view, task board | `npx kibo-ui add kanban` |
| **Table** | Project list, data tables | `npx kibo-ui add table` |
| **Calendar** | Timeline view | `npx kibo-ui add calendar` |
| **Editor** | Rich text for proposals | `npx kibo-ui add editor` |
| **Dropzone** | File uploads | `npx kibo-ui add dropzone` |
| **List** | Simple list view | `npx kibo-ui add list` |

---

## View Switcher Pattern

Like ClickUp's List | Board | Gantt | Timeline tabs. Same data, different views.

```tsx
// src/features/projects/components/ProjectViews.tsx
'use client'

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { List, LayoutGrid, GanttChart, Calendar } from 'lucide-react'

// Kibo UI components
import { Gantt } from '@/components/ui/kibo-ui/gantt'
import { Kanban } from '@/components/ui/kibo-ui/kanban'
import { DataTable } from '@/components/ui/kibo-ui/table'
import { Calendar as CalendarView } from '@/components/ui/kibo-ui/calendar'

type ViewType = 'list' | 'board' | 'gantt' | 'calendar'

export function ProjectViews({ data }) {
  const [view, setView] = useState<ViewType>('list')

  return (
    <>
      <Tabs value={view} onValueChange={(v) => setView(v as ViewType)}>
        <TabsList>
          <TabsTrigger value="list"><List className="h-4 w-4 mr-2" />List</TabsTrigger>
          <TabsTrigger value="board"><LayoutGrid className="h-4 w-4 mr-2" />Board</TabsTrigger>
          <TabsTrigger value="gantt"><GanttChart className="h-4 w-4 mr-2" />Gantt</TabsTrigger>
          <TabsTrigger value="calendar"><Calendar className="h-4 w-4 mr-2" />Calendar</TabsTrigger>
        </TabsList>
      </Tabs>

      {view === 'list' && <DataTable data={data} />}
      {view === 'board' && <Kanban data={data} />}
      {view === 'gantt' && <Gantt data={data} />}
      {view === 'calendar' && <CalendarView data={data} />}
    </>
  )
}
```

**Where to use:**
- Projects list (admin/internal)
- Deliverables per project
- Dev task view

---

## Secondary: Custom Components

These custom components supplement Kibo UI for specific hexOS needs. They are NOT in the codebase yet. When you need one, ask the user for the component code.

## Component Catalog

### 1. Action Searchbar (Command Palette)

**File:** `action-searchbar.tsx`

**Use Cases:**
- Global command palette (⌘K)
- Quick project search
- Action shortcuts (create project, assign dev, etc.)

**Features:**
- Debounced search with animated results
- Keyboard shortcut display
- Icon + label + description + badge pattern
- Animated search/send icon toggle

**Dependencies:** `framer-motion`, `lucide-react`

**When to Use:**
- Admin/internal dashboards for quick navigation
- Project search across all projects
- Command actions (status changes, assignments)

---

### 2. File Tree

**File:** `file-tree.tsx`

**Use Cases:**
- Deliverables hierarchy view
- Project structure visualization
- Documentation tree

**Features:**
- Collapsible folders
- File type icons (by extension)
- Hover states with visual indicators
- Tree line connectors

**Dependencies:** None (just Tailwind + cn utility)

**When to Use:**
- Deliverables view with nested subtasks
- Project file browser
- Blueprint structure visualization

---

### 3. Kanban Board (Trello-style)

**File:** `trello-kanban-board.tsx`

**Use Cases:**
- Project pipeline view (Inquiry → Proposal → Dev → Done)
- Deliverables board per project
- Dev workload view

**Features:**
- Drag-and-drop between columns
- Task cards with labels, descriptions, assignees
- Add card inline
- Column color coding
- Drop target highlighting

**Dependencies:** None (native drag-and-drop)

**When to Use:**
- Admin pipeline dashboard
- Project deliverables board
- Dev task management

---

### 4. Location Tag

**File:** `location-tag.tsx`

**Use Cases:**
- User timezone display
- Client location indicator
- Dev availability status

**Features:**
- Live clock updates
- Hover to reveal time/timezone
- Pulse indicator for "live" status
- Smooth text transitions

**Dependencies:** None

**When to Use:**
- Profile cards showing timezone
- Project detail showing client location
- Dev assignment considering timezones

---

## How to Request Components

When building a feature that needs one of these components:

1. Identify which component fits the use case
2. Ask the user: "I need the [component name] component code to build [feature]. Can you provide it?"
3. User will paste the component code
4. Follow the integration guidelines in the component docs

## Integration Pattern

All custom components follow this pattern:

```typescript
// 1. Component goes in src/components/ui/
// 2. Export from component file
// 3. Import where needed

import { ActionSearchbar } from "@/components/ui/action-searchbar"
import { FileTree } from "@/components/ui/file-tree"
import { KanbanBoard } from "@/components/ui/trello-kanban-board"
import { LocationTag } from "@/components/ui/location-tag"
```

## Future Components (Not Yet Available)

These may be added later:

- **Timeline/Gantt** — For deliverables scheduling
- **Activity Feed** — For project activity log display
- **Payment Progress** — For milestone payment visualization
- **Scope Diff Viewer** — For scope change comparisons
- **AI Chat Panel** — For form copilot sidebar
