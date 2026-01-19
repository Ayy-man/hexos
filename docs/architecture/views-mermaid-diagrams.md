# hexOS Views Architecture - Mermaid Diagrams

This document contains Mermaid diagrams describing the 4 main views of hexOS and their interconnections.

---

## Overview Diagram - All Views Connected

```mermaid
flowchart TB
    subgraph Navigation["SIDEBAR NAVIGATION"]
        AdminNav["Admin/Internal: All 4 Views"]
        DevNav["Developer: Projects + Conversations"]
        DFYNav["DFY Partner: Inquiries + Projects + Conversations"]
        ClientNav["Client: Project Only"]
    end

    subgraph Views["MAIN VIEWS"]
        Projects["PROJECTS\n- Project List & Details\n- 8 Detail Tabs\n- Progress Tracking\n- Dev Assignment"]

        Inquiries["INQUIRIES\n- Submission Pipeline\n- Proposal Creation\n- Deliverables Negotiation\n- Convert to Project"]

        Conversations["CONVERSATIONS\n- Direct Messages\n- Project Threads\n- Inquiry Threads\n- Real-time Chat"]

        Pulse["PULSE\n- Daily Tasks\n- Time Tracking\n- Goals & Targets\n- Insights & Analytics"]
    end

    subgraph SharedFeatures["SHARED FEATURES"]
        Notifications["Notifications"]
        HeaderTimer["Header Timer"]
        CommandPalette["Command Palette"]
        DarkMode["Dark Mode"]
        Presence["Team Presence"]
    end

    %% Role-based access
    AdminNav --> Projects & Inquiries & Conversations & Pulse
    DevNav --> Projects & Conversations
    DFYNav --> Inquiries & Projects & Conversations
    ClientNav --> Projects

    %% Inter-view connections
    Inquiries -->|"Converts to"| Projects
    Projects <-->|"Has threads in"| Conversations
    Inquiries <-->|"Has threads in"| Conversations
    Pulse -->|"Tracks time for"| Projects

    %% Shared features
    SharedFeatures -.-> Projects & Inquiries & Conversations & Pulse
```

---

## 1. PROJECTS View

```mermaid
flowchart TB
    subgraph ProjectsView["PROJECTS VIEW"]
        direction TB

        subgraph ListFeatures["List View Features"]
            Search["Search Projects"]
            Filters["Status Filters:\nAll | Active | Completed | On Hold"]
            TableView["Table View - Desktop"]
            CardView["Card View - Mobile"]
        end

        subgraph ProjectDetails["Project Detail Page - 8 Tabs"]
            Overview["Overview Tab\n- Status timeline\n- Key metrics\n- Quick actions"]
            Scope["Scope Tab\n- Deliverables list\n- Scope monitoring\n- Change requests"]
            Requirements["Requirements Tab\n- Onboarding checklist\n- File attachments\n- Blocker tracking"]
            Files["Files Tab\n- Internal workspace\n- Client workspace\n- Documents & uploads"]
            Financials["Financials Tab\n- Invoices\n- Milestones\n- Expenses"]
            Activity["Activity Tab\n- Audit log\n- Status changes\n- Comments"]
            Deliverables["Deliverables Tab\n- Task breakdown\n- Time tracking\n- Dev queue"]
            ProjectInfo["Project Info Tab\n- Client details\n- Settings\n- Danger zone"]
        end

        subgraph DataDisplayed["Key Data"]
            ProjectName["Project Name"]
            ClientName["Client Name"]
            Status["Status Badge\n22 statuses across 7 phases"]
            Progress["Progress Bar"]
            AssignedDev["Assigned Developer"]
            TargetDate["Target Delivery Date"]
        end
    end

    ListFeatures --> ProjectDetails

    %% External connections
    ProjectsView -->|"Project conversations"| ConversationsView["CONVERSATIONS"]
    ProjectsView -->|"Created from"| InquiriesView["INQUIRIES"]
    ProjectsView -->|"Time tracked in"| PulseView["PULSE"]
    ProjectsView -->|"Invoices via"| Stripe["Stripe"]
```

### Project Status Flow

```mermaid
stateDiagram-v2
    [*] --> SignOff: Project Created

    state SignOff {
        deliverables_pending --> awaiting_signoff
        awaiting_signoff --> signed_off
    }

    state Agreement {
        agreement_sent --> agreement_signed
    }

    state Payment {
        payment_pending --> payment_partial
        payment_partial --> payment_paid
        payment_pending --> payment_paid
    }

    state Onboarding {
        collecting_access --> access_complete
        access_complete --> dev_assigned
    }

    state Development {
        in_progress --> blocked_client
        in_progress --> blocked_internal
        in_progress --> review_checkpoint
        blocked_client --> in_progress
        blocked_internal --> in_progress
        review_checkpoint --> revisions
        revisions --> in_progress
        review_checkpoint --> final_qa
    }

    state Delivery {
        delivered --> acceptance_pending
        acceptance_pending --> accepted
    }

    state Closed {
        completed
        cancelled
        on_hold
    }

    SignOff --> Agreement
    Agreement --> Payment
    Payment --> Onboarding
    Onboarding --> Development
    Development --> Delivery
    Delivery --> Closed

    SignOff --> Closed: Cancel
    Agreement --> Closed: Cancel
    Payment --> Closed: Cancel
    Onboarding --> Closed: Cancel
    Development --> Closed: Cancel/Hold
```

---

## 2. INQUIRIES View

```mermaid
flowchart TB
    subgraph InquiriesView["INQUIRIES VIEW"]
        direction TB

        subgraph ViewModes["View Modes"]
            ActiveTab["Active Inbox"]
            ArchivedTab["Archived"]
        end

        subgraph StatsCards["Real-time Stats"]
            TotalSubs["Total Submissions"]
            Unopened["Unopened"]
            InQueue["In Queue"]
            Working["Working"]
            Ready["Ready"]
        end

        subgraph InquiryFeatures["Core Features"]
            StageBadge["Stage Badges\n10 pipeline stages"]
            PriorityLevel["Priority Levels\nLow | Normal | High | Urgent"]
            SubmitterInfo["Submitter Details"]
            NewSubmission["New Submission Button"]
            AICopilot["AI Copilot\nForm filling assistant"]
        end

        subgraph InquiryDetail["Inquiry Detail Page"]
            DocumentTab["Document Tab\nInternal notes & context"]
            ProposalTab["Proposal Tab\nRich text editor\nSubmit to DFY"]
            MyVersionTab["My Version Tab\nDFY private workspace"]
            DeliverablesNeg["Deliverables Negotiation\nAI parsing\nMulti-round approval"]
        end

        subgraph Actions["Key Actions"]
            InitiateProcess["Initiate Project Wizard"]
            MarkClosed["Mark as Closed"]
            MarkLost["Mark as Lost"]
            Archive["Archive Inquiry"]
        end
    end

    ViewModes --> StatsCards
    StatsCards --> InquiryFeatures
    InquiryFeatures --> InquiryDetail
    InquiryDetail --> Actions

    %% External connections
    InquiriesView -->|"Inquiry threads"| ConversationsView["CONVERSATIONS"]
    InquiriesView -->|"Converts to"| ProjectsView["PROJECTS"]
    InquiriesView -->|"Uses blueprints from"| Blueprints["BLUEPRINTS"]
```

### Proposal Pipeline Flow

```mermaid
stateDiagram-v2
    [*] --> unopened: DFY Submits

    unopened --> admin_reviewed: Admin Views
    admin_reviewed --> in_queue: Add to Queue
    in_queue --> working: Start Working
    working --> on_hold: Pause
    on_hold --> working: Resume
    working --> final_review: Complete Draft
    final_review --> ready: Approve
    final_review --> working: Needs Changes
    ready --> sent: Send to DFY
    sent --> closed: DFY Marks Won
    sent --> lost: DFY Marks Lost

    closed --> [*]: Convert to Project
    lost --> [*]: End
```

### Deliverables Negotiation Flow

```mermaid
sequenceDiagram
    participant DFY as DFY Partner
    participant System as hexOS
    participant AI as Claude AI
    participant Admin as Admin/Internal

    DFY->>System: Click "Suggest Changes"
    System->>AI: Parse proposal content
    AI-->>System: Return deliverables with confidence scores
    System-->>DFY: Display parsed deliverables

    DFY->>System: Edit/Add/Remove items
    DFY->>System: Submit for Review

    Admin->>System: Review each item

    alt Approve
        Admin->>System: Mark Approved
    else Reject
        Admin->>System: Mark Rejected
    else Counter
        Admin->>System: Propose different terms
        System-->>DFY: Notify of counter
        DFY->>System: Accept or Reject Counter
    end

    Admin->>System: Final Approve (all resolved)
    System-->>DFY: Deliverables Locked
```

---

## 3. CONVERSATIONS View

```mermaid
flowchart TB
    subgraph ConversationsView["CONVERSATIONS VIEW"]
        direction TB

        subgraph TabTypes["Conversation Types"]
            InboxTab["Inbox\nDirect Messages"]
            ProjectsTab["Projects\nProject-related threads"]
            InquiriesTab["Inquiries\nInquiry discussion threads"]
        end

        subgraph Layout["Layout"]
            ListPanel["Conversation List\n- Search\n- Unread badges\n- Last message preview"]
            ChatPanel["Chat Panel\n- Message history\n- Input field\n- Attachments"]
            MobileView["Mobile: Full-screen chat\nBack navigation"]
        end

        subgraph MessageFeatures["Message Features"]
            SendMsg["Send Messages"]
            Attachments["File Attachments\nImages, PDFs, etc."]
            Reactions["Emoji Reactions"]
            Mentions["@mentions\nNotify specific users"]
            UnreadBadge["Unread Badges\nPer conversation"]
        end

        subgraph RealTime["Real-time Features"]
            SupabaseListener["Live Updates\nSupabase Realtime"]
            Presence["User Presence\nOnline indicators"]
            ReadReceipts["Read Status\nLast read tracking"]
        end
    end

    TabTypes --> Layout
    Layout --> MessageFeatures
    MessageFeatures --> RealTime

    %% External connections
    ConversationsView <-->|"Project threads"| ProjectsView["PROJECTS"]
    ConversationsView <-->|"Inquiry threads"| InquiriesView["INQUIRIES"]
```

### Message Flow

```mermaid
sequenceDiagram
    participant User as User A
    participant Client as Browser
    participant Server as Next.js Server
    participant DB as Supabase
    participant RT as Supabase Realtime
    participant Other as User B Browser

    User->>Client: Type & Send Message
    Client->>Server: POST message
    Server->>DB: Insert message
    DB-->>Server: Success
    Server-->>Client: Optimistic update

    DB->>RT: Trigger postgres_changes
    RT-->>Other: Push new message
    Other->>Other: Update UI instantly

    Note over Client,Other: Both users see message in real-time
```

---

## 4. PULSE View (Admin/Internal Only)

```mermaid
flowchart TB
    subgraph PulseView["PULSE VIEW"]
        direction TB

        subgraph TodayTab["Today Tab"]
            DailyScore["Daily Score Ring\nProgress toward 25 pts goal"]
            FocusTasks["Focus Tasks\nTop 3 must-do items\n10 pts each"]
            RegularTasks["Regular Tasks\n3 pts each"]
            ActiveTimer["Active Timer\nStart/Stop tracking"]
            QuickCapture["Quick Capture\nCmd+K to add tasks"]
        end

        subgraph WeekTab["Week Tab"]
            WeeklyHeatmap["12-Week Heatmap\nGitHub-style contribution graph"]
            DayColumns["Day-by-Day View\nMon-Sun task overview"]
            WeeklyProgress["Weekly Progress\nvs Last Week comparison"]
            WeeklyReview["Weekly Review\nMonday reflection prompt"]
        end

        subgraph GoalsTab["Goals Tab"]
            YearlyGoal["Yearly Goal\nCompany-wide target"]
            QuarterTargets["Quarter Targets\nQ1-Q4 breakdown"]
            Actions["Actions\nSteps to complete targets"]
            TargetHealth["Health Scores\nOn track | At risk | Blocked"]
        end

        subgraph InsightsTab["Insights Tab"]
            StreakStats["Streak Stats\nCurrent, longest, average"]
            PersonalRecords["Personal Records\nBest day, week, month"]
            TaskCompletion["Task Completion Chart\nSame day vs rolled vs abandoned"]
            WeeklySummary["Weekly Summary\nThis week vs last week"]
        end
    end

    TodayTab --> WeekTab
    WeekTab --> GoalsTab
    GoalsTab --> InsightsTab

    %% External connections
    PulseView -->|"Time entries for"| ProjectsView["PROJECTS"]
    PulseView -->|"Timer shown in"| GlobalHeader["Global Header"]
```

### Points System

```mermaid
flowchart LR
    subgraph Earn["Earn Points"]
        CompleteTask["Complete Task: 3 pts"]
        CompleteFocus["Complete Focus Task: 10 pts"]
        CompleteLinked["Complete Linked Task: 15 pts"]
        CompleteAction["Complete Action: 10 pts"]
        CompleteTarget["Complete Target: 25 pts"]
        AdvanceDeliverable["Advance Deliverable: 8 pts"]
        CompleteRequirement["Complete Requirement: 5 pts"]
    end

    subgraph Track["Track Progress"]
        DailyTotal["Daily Total"]
        WeeklyTotal["Weekly Total"]
        LifetimeXP["Lifetime XP"]
        CurrentStreak["Current Streak"]
    end

    subgraph Levels["Level Up"]
        L1["Level 1: Rookie\n0 XP"]
        L10["Level 10: Rising Star\n5,000 XP"]
        L25["Level 25: Expert\n12,500 XP"]
        L50["Level 50: Godlike\n25,000 XP"]
    end

    Earn --> Track
    Track --> Levels
```

### Streak Logic

```mermaid
flowchart TD
    Start["Check Streak"]
    CheckYesterday{"Did user earn\n>= 10 pts yesterday?"}
    CheckSunday{"Was yesterday\nSunday?"}

    Start --> CheckYesterday

    CheckYesterday -->|"Yes"| IncrementStreak["Increment Streak +1"]
    CheckYesterday -->|"No"| CheckSunday

    CheckSunday -->|"Yes"| MaintainStreak["Maintain Streak\nSunday is optional"]
    CheckSunday -->|"No"| ResetStreak["Reset Streak to 0"]

    IncrementStreak --> DisplayStreak["Display Streak Badge\nwith Fire Animation"]
    MaintainStreak --> DisplayStreak
    ResetStreak --> DisplayStreak
```

---

## Data Flow Between Views

```mermaid
flowchart TB
    subgraph DataSources["Data Sources"]
        Supabase[(Supabase\nPostgreSQL)]
        Storage[(Supabase\nStorage)]
        Stripe[(Stripe\nPayments)]
        OpenRouter[(OpenRouter\nClaude AI)]
    end

    subgraph ServerLayer["Server Layer"]
        ServerComponents["Server Components\nSSR Data Fetching"]
        ServerActions["Server Actions\nMutations"]
        APIRoutes["API Routes\n15 endpoints"]
    end

    subgraph ClientLayer["Client Layer"]
        Views["4 Main Views"]
        RealtimeHooks["6 Realtime Hooks"]
        IndexedDB["IndexedDB\nOffline Cache"]
    end

    Supabase <--> ServerComponents
    Supabase <--> ServerActions
    Supabase <--> APIRoutes
    Storage <--> APIRoutes
    Stripe <--> APIRoutes
    OpenRouter <--> APIRoutes

    ServerComponents --> Views
    ServerActions --> Views
    APIRoutes --> Views

    Supabase -.->|"Realtime"| RealtimeHooks
    RealtimeHooks --> Views

    Views <--> IndexedDB
```

---

## Role-Based View Access Matrix

```mermaid
flowchart LR
    subgraph Roles["User Roles"]
        Admin["Admin"]
        Internal["Internal"]
        Dev["Developer"]
        DFY["DFY Partner"]
        Client["Client"]
    end

    subgraph ViewAccess["View Access"]
        P["PROJECTS"]
        I["INQUIRIES"]
        C["CONVERSATIONS"]
        PL["PULSE"]
    end

    Admin --> P & I & C & PL
    Internal --> P & I & C & PL
    Dev --> P & C
    DFY --> P & I & C
    Client --> P
```

---

## Navigation Structure

```mermaid
flowchart TB
    subgraph Sidebar["App Sidebar"]
        direction TB
        Logo["hexOS Logo"]

        subgraph MainNav["Main Navigation"]
            Dashboard["Dashboard"]
            ProjectsNav["Projects"]
            InquiriesNav["Inquiries"]
            ConversationsNav["Conversations"]
            PulseNav["Pulse"]
        end

        subgraph SecondaryNav["Secondary"]
            Blueprints["Blueprints"]
            CaseStudies["Case Studies"]
            Finances["Finances"]
            Settings["Settings"]
        end

        subgraph UserSection["User Section"]
            TeamPresence["Team Presence\nOnline avatars"]
            UserMenu["User Menu\nProfile, Logout"]
            StreakBadge["Streak Badge\nFire animation"]
        end
    end

    subgraph Header["Global Header"]
        BreadcrumbNav["Dynamic Breadcrumb"]
        CommandPalette["Command Palette\nCmd+K"]
        TimerIndicator["Timer Indicator\nActive time tracking"]
        NotificationBell["Notifications\nUnread count"]
        ThemeToggle["Theme Toggle\nLight/Dark"]
    end

    Logo --> MainNav
    MainNav --> SecondaryNav
    SecondaryNav --> UserSection
```

---

## File Locations

| Component | Path |
|-----------|------|
| Projects View | `/app/(dashboard)/projects/page.tsx` |
| Project Detail | `/app/(dashboard)/projects/[id]/page.tsx` |
| Inquiries View | `/app/(dashboard)/inquiries/page.tsx` |
| Inquiry Detail | `/app/(dashboard)/inquiries/[id]/page.tsx` |
| Conversations View | `/app/(dashboard)/conversations/page.tsx` |
| Pulse View | `/app/(dashboard)/pulse/page.tsx` |
| App Sidebar | `/components/app-sidebar.tsx` |
| Realtime Hooks | `/hooks/use-*-realtime.ts` |

---

## Technology Stack Per View

| View | Key Technologies |
|------|------------------|
| **Projects** | Server Components, Tabs, Progress bars, Status badges, DataTable |
| **Inquiries** | Plate.js editor, AI Copilot, Pipeline stages, Form wizard |
| **Conversations** | Supabase Realtime, Message reactions, File attachments |
| **Pulse** | cal-heatmap, Recharts, Timer controls, Drag-and-drop |

---

*Generated: 2026-01-09*
*hexOS v1.0*
