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

---

## Inquiry Document Components

These components are built for the inquiry document editor:

### InquiryDocument

**File:** `features/inquiries/components/InquiryDocument.tsx`

**Purpose:** Plate.js rich text editor with auto-save and inline discussions.

**Features:**
- Debounced auto-save (1.5s after last change)
- Inline comments (highlight text to add comments)
- Suggestion/track-changes mode
- Block-level discussions with popovers
- Discussions persisted to database (`inline_discussions` JSONB column)

**Props:**
```typescript
interface InquiryDocumentProps {
  inquiryId: string
  initialContent: unknown
  generatedContent: unknown
  initialDiscussions?: TDiscussion[]  // Persisted inline discussions
  readOnly?: boolean
  currentUser?: DiscussionUser
  onSave?: (content: unknown, discussions: TDiscussion[]) => Promise<void>
  onFullscreen?: () => void
}
```

### FullscreenDocument

**File:** `features/inquiries/components/FullscreenDocument.tsx`

**Purpose:** Fullscreen modal overlay for reading and discussing proposals.

**Features:**
- Portal-based rendering at document root
- Side-by-side layout: 70% document + 30% comments
- Escape key to close
- Body scroll prevention when open
- All comment/suggestion functionality preserved
- Inline discussions persisted alongside document content

**Props:**
```typescript
interface FullscreenDocumentProps {
  inquiryId: string
  documentContent: unknown
  initialDiscussions?: TDiscussion[]  // Persisted inline discussions
  internalComments: InquiryComment[]
  dfyComments: InquiryComment[]
  readOnly: boolean
  canComment: boolean
  canEdit: boolean
  showInternalTab: boolean
  showDfyTab: boolean
  currentUser?: DiscussionUser
  onClose: () => void
  onSave?: (content: unknown, discussions: TDiscussion[]) => Promise<void>
  onAddComment?: (content: string, commentType: CommentType, parentId?: string) => Promise<void>
  onResolve?: (commentId: string, resolved: boolean) => Promise<void>
  onDelete?: (commentId: string) => Promise<void>
}
```

### CommentsSidebar

**File:** `features/inquiries/components/CommentsSidebar.tsx`

**Purpose:** Tabbed comment sidebar with Internal and DFY chat channels.

**Features:**
- Two tabs: Internal (admin/internal only) and DFY (visible to DFY partners)
- Badge counts for unresolved comments per tab
- Threaded replies (parent_id support)
- Resolve/unresolve comments
- Role-based visibility (admin/internal see both tabs, DFY sees DFY only)

**Props:**
```typescript
interface CommentsSidebarProps {
  inquiryId: string
  internalComments: InquiryComment[]
  dfyComments: InquiryComment[]
  canEdit: boolean
  showInternalTab: boolean
  showDfyTab: boolean
  onAddComment?: (content: string, commentType: CommentType, parentId?: string) => Promise<void>
  onResolve?: (commentId: string, resolved: boolean) => Promise<void>
  onDelete?: (commentId: string) => Promise<void>
}
```

---

## Inquiry Pipeline Components

These components provide ClickUp-style inquiry management:

### InquiryListView

**File:** `features/inquiries/components/InquiryListView.tsx`

**Purpose:** Wrapper component with view toggle between Table and Board views.

**Features:**
- Tab toggle (Table | Board)
- Optimistic updates using `useOptimistic` hook
- Toast notifications on success/error (via sonner)
- Shared stage change handler with error handling

**Props:**
```typescript
interface InquiryListViewProps {
  inquiries: Inquiry[]
  defaultView?: 'table' | 'board'
}
```

### InquiryTableView

**File:** `features/inquiries/components/InquiryTableView.tsx`

**Purpose:** Grouped table view with collapsible sections by proposal stage.

**Features:**
- Collapsible stage groups (click header to expand/collapse)
- Stage count badges in headers
- Columns: Name, DFY, Due Date, Priority, Value, Created
- Dropdown menu to move between stages
- Overdue date highlighting (red text)
- Click row to view inquiry detail

**Props:**
```typescript
interface InquiryTableViewProps {
  inquiries: Inquiry[]
  onStageChange?: (id: string, stage: ProposalStage) => void
}
```

### InquiryBoardView

**File:** `features/inquiries/components/InquiryBoardView.tsx`

**Purpose:** Kanban board with drag-and-drop between stage columns using @dnd-kit.

**Features:**
- Uses `@dnd-kit` for smooth, accessible drag-and-drop (replaces HTML5 drag-drop)
- Color-coded column headers (red→blue→yellow→orange→green)
- Cards showing: company name, priority, value, partner, due date
- Drag overlay shows card preview while dragging
- Visual feedback: opacity change + ring highlight on dragged card
- Grip handle for clear drag affordance
- Keyboard navigation support (accessibility)
- Click card to view inquiry detail
- Empty state placeholder per column

**Props:**
```typescript
interface InquiryBoardViewProps {
  inquiries: Inquiry[]
  onStageChange?: (id: string, stage: ProposalStage) => void
}
```

### StageBadge

**File:** `features/inquiries/components/StageBadge.tsx`

**Purpose:** Color-coded badge for proposal stages.

**Stages:**
- `pending` - Red
- `proposal_sent` - Blue
- `proposal_verify` - Yellow
- `on_hold` - Orange
- `agreed` - Green

**Exports:**
- `StageBadge` component
- `STAGE_ORDER` array (for consistent column ordering)
- `getStageName(stage)` helper function

**Props:**
```typescript
interface StageBadgeProps {
  stage: ProposalStage | null | undefined
  className?: string
}
```

### PriorityBadge

**File:** `features/inquiries/components/PriorityBadge.tsx`

**Purpose:** Priority indicator badge with flag icon.

**Priorities:**
- `urgent` - Red flag
- `high` - Yellow flag
- `normal` - Gray flag (default)
- `low` - Blue flag

**Props:**
```typescript
interface PriorityBadgeProps {
  priority: Priority | null | undefined
  showLabel?: boolean  // Show text label or just icon
  className?: string
}
```

### StageHistoryTimeline

**File:** `features/inquiries/components/StageHistoryTimeline.tsx`

**Purpose:** Shows proposal progress timeline in inquiry detail sidebar.

**Features:**
- Displays current stage with StageBadge
- Chronological timeline of all stage transitions
- Visual progress bar (Pending → Agreed)
- Shows creation date and stage change dates
- Stage icons for each transition
- Visible to all users including DFY partners

**Props:**
```typescript
interface StageHistoryTimelineProps {
  currentStage: ProposalStage | null
  stageHistory: Array<{
    from: ProposalStage | null
    to: ProposalStage
    changed_by: string
    changed_at: string
    notes?: string
  }>
  stageEnteredAt: string | null
  createdAt: string
  className?: string
}
```

---

## UI Components

### Timeline

**File:** `components/ui/timeline.tsx`

**Purpose:** Reusable timeline component for displaying chronological events.

**Features:**
- Vertical or horizontal orientation
- Status variants: completed, active, pending, error
- Custom icons per item
- Timestamp formatting (configurable position: top, bottom, inline)
- Custom content support per item
- Connector lines between items
- Horizontal scroll with ScrollArea

**Variants:**
- `default` - Standard gap between items
- `compact` - Minimal gap
- `spacious` - Large gap

**Props:**
```typescript
interface TimelineItem {
  id: string
  title: string
  description?: string
  timestamp?: string | Date
  status?: "default" | "completed" | "active" | "pending" | "error"
  icon?: React.ReactNode
  content?: React.ReactNode
  metadata?: Record<string, unknown>
}

interface TimelineProps {
  items: TimelineItem[]
  className?: string
  variant?: "default" | "compact" | "spacious"
  orientation?: "vertical" | "horizontal"
  showConnectors?: boolean
  showTimestamps?: boolean
  timestampPosition?: "top" | "bottom" | "inline"
}
```

**Usage:**
```tsx
import { Timeline } from "@/components/ui/timeline"

const items = [
  { id: "1", title: "Started", status: "completed", timestamp: new Date() },
  { id: "2", title: "In Progress", status: "active" },
  { id: "3", title: "Pending", status: "pending" },
]

<Timeline items={items} variant="compact" />
```

### Sortable / Kanban

**File:** `components/ui/sortable.tsx`

**Purpose:** Flexible drag-and-drop components using @dnd-kit for kanban boards and sortable lists.

**Dependencies:** `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `@radix-ui/react-slot`

**Exports:**

**Kanban Components (for multi-column boards):**
- `Kanban` - Root context provider for kanban boards
- `KanbanBoard` - Container for columns
- `KanbanColumn` - Individual column
- `KanbanColumnContent` - Sortable area within column
- `KanbanColumnHandle` - Drag handle for column reordering
- `KanbanItem` - Draggable item within column
- `KanbanItemHandle` - Drag handle for items
- `KanbanOverlay` - Visual preview of dragged item

**Sortable Components (for single-list reordering):**
- `Sortable` - Root context for sortable lists
- `SortableItem` - Draggable list item
- `SortableItemHandle` - Drag handle for items

**Usage (Kanban):**
```tsx
import {
  Kanban, KanbanBoard, KanbanColumn,
  KanbanColumnContent, KanbanItem, KanbanItemHandle
} from '@/components/ui/sortable'

<Kanban
  value={groupedData}
  onValueChange={setGroupedData}
  getItemValue={(item) => item.id}
  onMove={handleMove}
>
  <KanbanBoard>
    {columns.map((col) => (
      <KanbanColumn key={col.id} value={col.id}>
        <KanbanColumnContent value={col.id}>
          {col.items.map((item) => (
            <KanbanItem key={item.id} value={item.id}>
              <KanbanItemHandle>
                <GripVertical />
              </KanbanItemHandle>
              {item.name}
            </KanbanItem>
          ))}
        </KanbanColumnContent>
      </KanbanColumn>
    ))}
  </KanbanBoard>
</Kanban>
```

**Usage (Sortable List):**
```tsx
import { Sortable, SortableItem, SortableItemHandle } from '@/components/ui/sortable'

<Sortable
  value={items}
  onValueChange={setItems}
  getItemValue={(item) => item.id}
>
  {items.map((item) => (
    <SortableItem key={item.id} value={item.id}>
      <SortableItemHandle>
        <GripVertical />
      </SortableItemHandle>
      {item.name}
    </SortableItem>
  ))}
</Sortable>
```

---

## Blueprint Components

These components power the blueprints catalog:

### BlueprintEditor

**File:** `features/blueprints/components/BlueprintEditor.tsx`

**Purpose:** Plate.js rich text editor with fixed toolbar and auto-save.

**Features:**
- Fixed toolbar header (bold, italic, underline, strikethrough, code, links)
- Debounced auto-save (1.5s after last change)
- Code blocks with monospace styling
- Callout blocks (info, warning, error, tip variants)
- Fullscreen button to expand editor

**Props:**
```typescript
interface BlueprintEditorProps {
  blueprintId: string
  initialContent: unknown
  onFullscreen?: () => void
}
```

### FullscreenBlueprint

**File:** `features/blueprints/components/FullscreenBlueprint.tsx`

**Purpose:** Fullscreen modal overlay for viewing/editing blueprints.

**Features:**
- Portal-based rendering at document root
- Header with blueprint name, save status, and close button
- Fixed toolbar in edit mode
- Escape key to close
- Auto-save in fullscreen mode

**Props:**
```typescript
interface FullscreenBlueprintProps {
  blueprintId: string
  blueprintName: string
  blueprintIcon?: string | null
  content: unknown
  readOnly: boolean
  onClose: () => void
  onSave?: (content: unknown) => Promise<void>
}
```

### IconPicker

**File:** `features/blueprints/components/IconPicker.tsx`

**Purpose:** Full emoji picker for blueprint icons using Frimousse.

**Features:**
- Searchable emoji catalog
- Categories (smileys, objects, symbols, etc.)
- Popover trigger showing current selection
- Keyboard navigation

**Props:**
```typescript
interface IconPickerProps {
  value: string
  onChange: (emoji: string) => void
}
```

### BlueprintActions

**File:** `features/blueprints/components/BlueprintActions.tsx`

**Purpose:** Admin action dropdown for blueprint management.

**Features:**
- Edit/View mode toggle button
- Dropdown menu with:
  - Duplicate (creates copy as draft)
  - Delete (with confirmation dialog)
- Loading state during actions

**Props:**
```typescript
interface BlueprintActionsProps {
  blueprintId: string
  isEditMode: boolean
}
```

---

## Editor Block Components

These components render custom block types in Plate.js editors:

### CodeBlockElement

**File:** `components/ui/code-block-node.tsx`

**Purpose:** Renders code blocks with monospace styling.

**Usage:** Configured in `blueprint-editor-kit.ts` with `CodeBlockPlugin`.

### CalloutElement

**File:** `components/ui/callout-node.tsx`

**Purpose:** Renders callout/alert blocks with different variants.

**Variants:**
- `info` - Blue styling with Info icon
- `warning` - Yellow styling with AlertTriangle icon
- `error` - Red styling with AlertCircle icon
- `tip` - Green styling with Lightbulb icon
- `default` - Muted styling with Info icon

**Usage:** Configured in `blueprint-editor-kit.ts` with `CalloutPlugin`.

---

## Future Components (Not Yet Available)

These may be added later:

- **Timeline/Gantt** — For deliverables scheduling
- **Activity Feed** — For project activity log display
- **Payment Progress** — For milestone payment visualization
- **Scope Diff Viewer** — For scope change comparisons
- **AI Chat Panel** — For form copilot sidebar
