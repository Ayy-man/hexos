# Navigation & Views

## Role Dashboards Overview

Each role has a dedicated dashboard with role-specific content. Navigation adapts based on role.

---

## HEXONA INTERNAL (Admin)

Full access to everything. Can edit all content.

```
├── Dashboard
│   ├── Pipeline (Kanban of all projects by status)
│   ├── Project Progress (active projects overview)
│   └── Tasks (my assigned tasks across projects)
│
├── Reports
│   └── Detailed metrics (revenue, conversion, utilization)
│
├── Inquiries
│   ├── Pending proposals
│   └── Sent proposals
│
├── Projects ← Dashboard within dashboard
│   └── [See Project Detail below]
│
├── Team
│   ├── Devs
│   ├── DFY Partners
│   └── Internal
│
├── Knowledge Base
│   ├── Case Studies
│   ├── Demos
│   ├── Blueprints
│   └── Example Proposals
│
├── Conversations ← NEW
│   ├── All chats
│   └── Group chats
│
├── Suggestions ← NEW (Feed of all suggestions)
│
└── Settings
```

---

## ARBITRAGE (DFY Partner)

Can submit inquiries, view their deals, view-only knowledge base.

```
├── Dashboard
│   ├── My Deals overview
│   ├── Commission summary
│   └── Recent activity
│
├── Reports
│   └── My performance metrics
│
├── Inquiries
│   └── Submit new inquiry
│
├── Projects (My Deals only)
│   └── [External view only - see below]
│
├── Clients
│   └── Clients they've invited
│
├── Knowledge Base (VIEW ONLY)
│   ├── Case Studies
│   ├── Demos
│   ├── Blueprints
│   └── Example Proposals
│
├── Conversations ← NEW
│   └── Project-related chats
│
├── Suggestions ← NEW (Submit feedback)
│
└── Settings
```

---

## DEVELOPER

Sees assigned projects, SOPs, courses.

```
├── Dashboard
│   ├── My Tasks (across all assigned projects)
│   ├── Deadlines
│   └── Payment status (Cleared/Pending, no amounts)
│
├── Reports
│   └── My utilization / hours
│
├── Inquiries (hidden or N/A)
│
├── Projects (Assigned only)
│   └── [Internal view - see below]
│
├── Clients
│   └── Client context for assigned projects
│
├── Knowledge Base
│   ├── SOPs (how we work)
│   └── Courses (training materials)
│
├── Conversations ← NEW
│   └── Project-related chats with Hexona
│
├── Suggestions ← NEW (Submit feedback)
│
└── Settings
```

---

## CLIENT

Minimal view. Only their project.

```
├── Dashboard
│   ├── Project status
│   ├── Timeline
│   └── Payment status
│
├── Reports (hidden or N/A)
│
├── Inquiries (hidden or N/A)
│
├── Projects (Their project only)
│   └── [External view - see below]
│
├── Team (hidden)
│
├── Blueprints (hidden)
│
├── Conversations ← NEW
│   └── Project chat with Hexona/DFY
│
├── Suggestions ← NEW (Submit feedback)
│
└── Settings
```

---

## Project Detail View (Dashboard within Dashboard)

When you click into a project, it opens a sub-dashboard with its own navigation.

### Project Sub-Navigation

```
PROJECT: [Client Name] - [Project Name]
─────────────────────────────────────────
Tabs: Gantt | Timeline | Conversations | Files
─────────────────────────────────────────

Left Sidebar:
├── 🔒 Workspace (Internal)     ← Hexona + Dev only
│   ├── Conversations
│   ├── Files
│   ├── Deliverables
│   └── Notes
│
└── 🌐 Portal (External)        ← Synced to DFY + Client
    ├── Conversations
    ├── Files
    ├── Deliverables (synced)
    └── Updates
```

### Internal vs External Naming Options

| Option | Internal | External | Vibe |
|--------|----------|----------|------|
| **Workspace / Portal** | Workspace | Portal | Professional |
| **Backstage / Stage** | Backstage | Stage | Theatre metaphor |
| **Build / Share** | Build | Share | Action-oriented |
| **Team / Client** | Team | Client | Clear but generic |
| **Dev / Delivery** | Dev | Delivery | Technical |

**Recommendation: Workspace / Portal**
- Workspace = where work happens (internal)
- Portal = what's shared/visible (external)

### Sync Behavior

```
WORKSPACE (Internal)              PORTAL (External)
─────────────────────            ─────────────────────
Deliverables                     Deliverables (synced)
├── Task 1 ✓                     ├── Task 1 ✓
├── Task 2 (in progress)    →    ├── Task 2 (in progress)
├── Task 3 (blocked)        ✗    │   [not synced - internal issue]
└── Task 4 (not started)         └── Task 4 (not started)

Files                            Files (synced)
├── dev-notes.md            ✗    │   [not synced]
├── client-assets.zip       →    ├── client-assets.zip
└── final-delivery.zip      →    └── final-delivery.zip

Conversations                    Conversations
├── Dev thread              ✗    │   [separate threads]
└── Internal notes          ✗    └── Client updates only
```

### Who Sees What

| Content | INT | DEV | DFY | CLIENT |
|---------|-----|-----|-----|--------|
| Workspace | ✅ Full | ✅ Full | ❌ | ❌ |
| Portal | ✅ Full | ❌ | ✅ View | ✅ View |
| Sync controls | ✅ | ❌ | ❌ | ❌ |

---

## Conversations Feature

### Structure

```sql
-- conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  title TEXT,
  type TEXT, -- 'direct', 'group', 'project'
  scope TEXT, -- 'workspace', 'portal'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- conversation_participants
CREATE TABLE conversation_participants (
  conversation_id UUID REFERENCES conversations(id),
  user_id UUID REFERENCES profiles(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

-- messages
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id),
  sender_id UUID REFERENCES profiles(id),
  content TEXT,
  attachments JSONB, -- [{file_id, file_name, file_type}]
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Group Chat Types

| Type | Participants | Auto-created |
|------|--------------|--------------|
| Project Workspace | INT + assigned DEVs | On project creation |
| Project Portal | INT + DFY + CLIENT | On project creation |
| Direct Message | Any 2 users | Manual |
| Custom Group | Any combination | Manual |

### Real-time

Use Supabase Realtime for live updates:
```typescript
supabase
  .channel('messages')
  .on('postgres_changes', { 
    event: 'INSERT', 
    schema: 'public', 
    table: 'messages',
    filter: `conversation_id=eq.${conversationId}`
  }, handleNewMessage)
  .subscribe()
```

---

## Suggestion Box Feature

### For All Roles

Available in sidebar for every role. Can be anonymous or identified.

```sql
CREATE TABLE suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id), -- NULL if anonymous
  is_anonymous BOOLEAN DEFAULT false,
  message TEXT NOT NULL,
  screenshots TEXT[], -- array of storage paths
  status TEXT DEFAULT 'new', -- new, reviewed, implemented, declined
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### UI Components

```
┌─────────────────────────────────────┐
│ 💡 Submit Suggestion                │
├─────────────────────────────────────┤
│                                     │
│ Message:                            │
│ ┌─────────────────────────────────┐ │
│ │                                 │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Screenshots: [+ Add]                │
│ ┌─────┐ ┌─────┐                     │
│ │ img │ │ img │                     │
│ └─────┘ └─────┘                     │
│                                     │
│ ☐ Submit anonymously                │
│                                     │
│ [Submit Suggestion]                 │
└─────────────────────────────────────┘
```

### Admin View (Suggestions Feed)

```
┌─────────────────────────────────────┐
│ Suggestions                    [New]│
├─────────────────────────────────────┤
│ 🔵 Anonymous · 2h ago               │
│ "Would be great to have..."         │
│ [📷 2 screenshots]                   │
│ Status: New ▼                       │
├─────────────────────────────────────┤
│ 🟢 @dev_name · 1d ago               │
│ "The gantt chart could..."          │
│ Status: Reviewed ▼                  │
├─────────────────────────────────────┤
│ ...                                 │
└─────────────────────────────────────┘
```

---

## Knowledge Base Structure

Notion-like property system where items can be linked.

```sql
CREATE TABLE knowledge_items (
  id UUID PRIMARY KEY,
  type TEXT, -- 'case_study', 'demo', 'blueprint', 'proposal', 'sop', 'course'
  title TEXT NOT NULL,
  content TEXT, -- rich text / markdown
  metadata JSONB, -- flexible properties
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link knowledge items to projects
CREATE TABLE project_knowledge_links (
  project_id UUID REFERENCES projects(id),
  knowledge_item_id UUID REFERENCES knowledge_items(id),
  PRIMARY KEY (project_id, knowledge_item_id)
);
```

### Linking Example

```
Project: "Restaurant AI Chatbot"
├── Linked Case Study: "How we built X restaurant's chatbot"
├── Linked Demo: "Restaurant chatbot demo video"
├── Linked Blueprint: "AI Chatbot Blueprint"
└── Linked Proposal: "Template proposal for chatbots"
```

**Benefits:**
- Viewing a case study → see related demos, blueprints
- Creating a proposal → pull from linked blueprints
- DFY partner → browse case studies to understand offerings

---

## Navigation Visibility Matrix

| Section | INT | DFY | DEV | CLIENT |
|---------|-----|-----|-----|--------|
| Dashboard | ✅ Full | ✅ Own | ✅ Own | ✅ Own |
| Reports | ✅ All | ✅ Own | ✅ Own | ❌ |
| Inquiries | ✅ All | ✅ Submit | ❌ | ❌ |
| Projects | ✅ All | ✅ Own | ✅ Assigned | ✅ Own |
| Team | ✅ Edit | ❌ | ❌ | ❌ |
| Knowledge Base | ✅ Edit | ✅ View | ✅ SOPs only | ❌ |
| Conversations | ✅ All | ✅ Own | ✅ Own | ✅ Own |
| Suggestions | ✅ Feed | ✅ Submit | ✅ Submit | ✅ Submit |
| Settings | ✅ | ✅ | ✅ | ✅ |
