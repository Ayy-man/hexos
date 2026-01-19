# hexOS Final Polish Changelog

All changes made during the final polish phase are logged here.

---

## Format

```
## [Date] - Agent X - Issue #Y

**Status:** Started | In Progress | Completed | Blocked

**Files Changed:**
- path/to/file.ts (description of change)

**Notes:**
Any relevant notes about the change.
```

---

## Changes

<!-- Agents: Add new entries at the top -->

## [2026-01-16] - Issue #26 - Profile System

**Status:** Completed

**Database Migration:**
- `supabase/migrations/20260116000001_profile_system_enhancements.sql`
  - Added avatar_url, bio, phone, company_name columns to profiles
  - Added notification_preferences, ui_preferences JSONB columns
  - Added availability_status, availability_message columns
  - Created dev_availability table for detailed capacity tracking
  - Added RLS policies and indexes

**New Files Created:**
- `app/(dashboard)/settings/layout.tsx` - Settings layout with role-based sidebar
- `app/(dashboard)/settings/profile/page.tsx` - Profile settings page
- `app/(dashboard)/settings/notifications/page.tsx` - Notification preferences
- `app/(dashboard)/settings/account/page.tsx` - Account security settings
- `app/(dashboard)/settings/appearance/page.tsx` - Theme and UI preferences
- `app/(dashboard)/settings/partner/page.tsx` - DFY partner settings
- `features/settings/components/SettingsSidebar.tsx` - Role-based navigation
- `features/settings/components/AvatarUpload.tsx` - Profile picture upload
- `features/settings/components/ProfileSettingsForm.tsx` - Main profile form
- `features/settings/components/NotificationSettingsForm.tsx` - Notification toggles
- `features/settings/components/AppearanceSettingsForm.tsx` - Theme selection
- `features/settings/components/AvailabilityControl.tsx` - Dev availability controls

**Files Modified:**
- `app/(dashboard)/settings/page.tsx` - Now redirects to /settings/profile
- `app/(dashboard)/settings/developer/page.tsx` - Added availability tab with controls
- `lib/api/profiles.ts` - Added avatar, preferences, and availability functions
- `features/settings/actions/settingsActions.ts` - Added new server actions

**Route Structure:**
```
/settings → /settings/profile (redirect)
/settings/profile - Avatar, name, bio, phone, location (ALL ROLES)
/settings/notifications - Email/in-app toggles by category (ALL ROLES)
/settings/account - Security, sessions, 2FA placeholder (ALL ROLES)
/settings/appearance - Theme, compact mode, default views (ALL ROLES)
/settings/developer - Skills + Availability tabs (DEV ONLY)
/settings/partner - Logo, stats, commission tier (DFY ONLY)
```

**Notes:**
Complete Profile System implementation per profiles-system.md spec. Features:
- Avatar upload with drag-drop and preview
- Bio with character counter (250 max)
- Phone number for future WhatsApp integration
- Notification preferences by category and channel
- Theme selection (light/dark/system)
- Compact mode toggle
- Default view preferences (list/board)
- Developer availability with status, capacity, and auto-assign
- DFY partner logo upload and performance stats placeholder

---

## [2026-01-11] - Hill Chart Light Mode Support

**Status:** Completed

**Files Modified:**
- features/projects/components/hill-chart/HillChartTab.tsx
  - Added dark: variants for cards, buttons, text colors
- features/projects/components/hill-chart/HillChart.tsx
  - SVG background now uses className instead of inline style
  - Added dark: variants for curve stroke, tooltips, mode badges
- features/projects/components/hill-chart/StatCard.tsx
  - Added dark: variants for card border/background
- features/projects/components/hill-chart/ParentDeliverableCard.tsx
  - Added dark: variants for card, hover states, sparkline container
- features/projects/components/hill-chart/SubDeliverableCard.tsx
  - Added dark: variants for card, badges, quick update buttons
- features/projects/components/hill-chart/CompactSparkline.tsx
  - Added dark: variants for grid lines, labels
- features/projects/components/hill-chart/ExpandedSparkline.tsx
  - Added dark: variants for grid lines, labels, value text

**Notes:**
All Hill Chart components now render correctly in both light and dark mode using Tailwind's dark: variant pattern.

---

## [2026-01-11] - Hill Chart Progress Visualization

**Status:** Code Complete (awaiting test data with sub-deliverables)

**Files Created:**
- supabase/migrations/20260111000001_hill_chart.sql
  - Added hill_position (0-100) and hill_color columns to deliverables
  - Created deliverable_position_history table for sparkline data
  - RLS policies for project-scoped access
  - Helper function generate_hill_color() for auto-coloring
- lib/api/hill-chart.ts
  - Types: DeliverableWithHistory, PositionHistoryEntry, HillChartItem
  - Functions: getDeliverablesWithHistory, updateHillPosition, getZone
  - Helpers: toHillChartItem, toParentHillChartItem, getDeadlineStatus
- features/projects/actions/hillChartActions.ts
  - updatePositionAction() - drag updates with history logging
  - quickUpdatePositionAction() - button updates (+5%, +10%, etc.)
  - batchUpdatePositionsAction() - bulk updates
  - setDeliverableColorAction() - custom colors
- features/projects/components/hill-chart/
  - HillChart.tsx - SVG bell curve with draggable dots
  - ExpandedSparkline.tsx - Large chart with date axis
  - CompactSparkline.tsx - Mini chart for parent cards
  - SubDeliverableCard.tsx - Expanded card with quick buttons
  - ParentDeliverableCard.tsx - Clickable drill-down card
  - StatCard.tsx - Zone stats display
  - HillChartTab.tsx - Main orchestrator component
  - types.ts, utils.ts, index.ts - Supporting files
- hooks/use-hill-chart-realtime.ts
  - Supabase realtime subscription for live updates

**Files Modified:**
- features/projects/components/ProjectTabs.tsx
  - Added "Progress" tab with TrendingUp icon
  - Integrated HillChartTab component
- lib/api/projects.ts
  - Extended deliverables type with parent_id, hill_position, hill_color
  - Updated getProject query to fetch new fields

**Testing:**
- Parent view (Level 1): ✅ All passing
- Sub-deliverable view (Level 2): ⚠️ Blocked by missing test data
- Requires projects with hierarchical deliverables (parent_id set)

---

## [2026-01-10] - Phase 3A - Deliverables System Fix

**Status:** Completed (pending testing)

**Files Changed:**
- supabase/migrations/20260110000020_deliverable_hierarchy.sql (NEW)
  - Added parent_id column to proposal_deliverables and deliverables tables
  - Added indexes for hierarchy queries
- lib/api/proposal-deliverables.ts
  - Added parent_id to ProposalDeliverable interface
  - Added ProposalDeliverableWithChildren type for tree structure
  - Added buildDeliverableTree() utility function
  - Added getProposalDeliverablesTree() function
  - Added flattenDeliverableTree() function
  - Updated createProposalDeliverable to accept parent_id
  - Updated updateProposalDeliverable to handle parent_id
- features/project-initiation/actions/deliverableStepActions.ts (NEW)
  - extractDeliverablesFromProposalAction() - triggers AI extraction
  - addDeliverableAction() - creates new deliverable
  - updateDeliverableAction() - updates deliverable
  - deleteDeliverableAction() - deletes deliverable
- features/project-initiation/components/steps/DeliverablesStep.tsx (REWRITE)
  - Empty state with "Extract from Proposal" and "Add Manually" buttons
  - Full CRUD (add/edit/delete) via modals
  - Sub-deliverable support (hierarchy with indentation)
  - Selection management (select all/none, toggle)
  - Source badges (AI Parsed, Blueprint, Manual)
- features/project-initiation/components/InitiateWizard.tsx
  - Updated to use ProposalDeliverableWithChildren type
  - Added state management for deliverables tree
  - Pass inquiryId and onDeliverablesChange props
  - Updated price calculation to flatten tree
  - Validation allows empty deliverables (can add manually)
- app/(dashboard)/inquiries/[id]/initiate/page.tsx
  - Use getProposalDeliverablesTree instead of getProposalDeliverables
  - Added recursive filter for removed/rejected items

**Notes:**
CRITICAL fix for blocked project initiation. Users were stuck at Step 1 with "No Deliverables Found" and no way to proceed. Now:
1. Empty state shows actionable buttons (Extract from Proposal OR Add Manually)
2. AI extraction calls existing triggerParseDeliverablesAction
3. Manual CRUD allows adding/editing/deleting without AI
4. Hierarchy support enables sub-deliverables
5. Validation allows proceeding even with no deliverables (can skip step)

## [2026-01-10] - Agent 4 - Issue #19

**Status:** Completed

**Files Changed:**
- features/projects/components/tabs/ProjectInfoTab.tsx
  - Added Archive/Unarchive buttons with confirmation dialogs
  - Added archived project banner with restore option
  - Import archiveProjectAction, unarchiveProjectAction
- app/(dashboard)/projects/page.tsx
  - Added view toggle (Active/Archived) to filter projects
  - Updated getProjects call to pass filter param
  - Updated empty state and results count for archived view
- lib/api/projects.ts
  - Added archived_at, archived_by, deleted_at, deleted_by to Project interface

**Notes:**
Completed the Archive vs Delete system UI. Backend was already implemented by Agent 3 (#11). Users can now:
- Archive projects (less destructive than delete)
- View archived projects via toggle in list page
- Restore archived projects from project detail page
- Still delete projects permanently if needed

## [2026-01-10] - Agent 4 - Issue #23

**Status:** Completed

**Files Changed:**
- hooks/use-inquiries-realtime.ts (new - realtime subscription hook for inquiries)
- features/inquiries/components/InquiryListView.tsx (integrated realtime hook, removed router.refresh)

**Notes:**
Implemented Supabase Realtime subscriptions for inquiries. When any user updates an inquiry (stage change, priority, etc.), all connected clients see the update instantly. Removed dependency on router.refresh() for syncing data.

## [2026-01-10] - Agent 4 - Issue #24

**Status:** Completed

**Files Changed:**
- features/inquiries/components/steps/CustomProposal.tsx (added conditional number input for budget)

**Notes:**
When "Specific $" is selected for budget indication, a number input field now appears for entering the exact budget amount.

## [2026-01-10] - Agent 4 - Issue #25

**Status:** Completed

**Files Changed:**
- features/inquiries/components/steps/CustomProposal.tsx (reframed urgency field)

**Notes:**
Changed "Urgency" label to "Is there a hard deadline?" and updated options: "< 7 days" → "Yes, < 7 days", "< 30 days" → "Yes, < 30 days", "No rush" → "No deadline".

## [2026-01-10] - Agent 4 - Issue #30

**Status:** Completed

**Files Changed:**
- features/inquiries/components/steps/CustomProposal.tsx (removed required asterisk from go_live_date)

**Notes:**
Made "Preferred Go-Live Date" optional by removing the required asterisk indicator.

## [2026-01-10] - Agent 4 - Issue #22

**Status:** Completed

**Files Changed:**
- features/inquiries/components/steps/CustomProposal.tsx (added meeting_recording_url field)
- features/inquiries/components/steps/ClosedCustom.tsx (added meeting_recording_url field)
- features/inquiries/components/steps/VariationProposal.tsx (added meeting_recording_url field)
- features/inquiries/components/steps/ClosedBlueprint.tsx (added meeting_recording_url field)

**Notes:**
Added optional Meeting Recording URL field to all intake forms. Includes Video icon label, URL input, and helper text mentioning Fathom/Fireflies support.

## [2026-01-10] - Agent 3 - Issues #1, #3, #4, #11, #12, #13, #14, #18, #28

**Status:** Completed

**Files Changed:**
- lib/api/inquiries.ts
  - Added createNotification import and calls to submitProposalToDfy, updateInquiryStage, assignInquiry (#1, #14)
  - Notifications sent for proposal_ready, stage_changed, assigned types
- lib/api/invoices.ts
  - Fixed FK alias issues: projects:project_id → projects!project_id (#3)
  - All getInvoices, getInvoice, getInvoiceByNumber, getInvoiceByPublicToken updated
- lib/api/organizations.ts
  - Fixed ambiguous join: profile:profiles → profile:profiles!user_id (#4)
- supabase/migrations/20260110000011_projects_soft_delete.sql (new)
  - Added archived_at, archived_by, deleted_at, deleted_by columns to projects (#11)
  - Added indexes for performance
- features/projects/actions/projectActions.ts
  - Replaced hard delete with soft delete (#11)
  - Added archiveProjectAction, unarchiveProjectAction, restoreProjectAction
- lib/api/projects.ts
  - Added ProjectFilter type and filtering for soft deleted projects (#11)
  - getProjects now filters by active/archived/deleted
- lib/api/scope-monitoring.ts
  - Added createNotification calls to approveScopeChange, rejectScopeChange (#12)
- lib/api/requirement-notifications.ts
  - Replaced console.log with createNotification call (#13)
- supabase/migrations/20260110000012_fix_conversation_read_status_rls.sql (new)
  - Recreated RLS policies to fix 406 errors on upsert (#18)
  - Added DELETE policy for completeness
- lib/api/notifications.ts
  - Integrated sendPushNotification into createNotification (#28)
  - Push notifications now fire on every in-app notification

**Notes:**
- P0 #2 was a false positive - 'closed' is valid proposal_stage enum value
- All notification changes are backward compatible
- Push notifications fire-and-forget (don't block the main operation)

## [2026-01-10] - Agent 2 - Issues #16, #17

**Status:** Completed

**Files Changed:**
- features/inquiries/components/IntakeForm.tsx
  - Clear closed_deal_type and proposal_type when going back to initial step (#16)
  - Pass onNext to step components for auto-advance (#17)
- features/inquiries/components/steps/InitialStep.tsx
  - Added onNext prop with 150ms delay auto-advance on selection (#17)
- features/inquiries/components/steps/ClosedDealType.tsx
  - Added onNext prop with 150ms delay auto-advance on selection (#17)
- features/inquiries/components/steps/ProposalType.tsx
  - Added onNext prop with auto-advance for variation/custom only (B1 shows info, no advance) (#17)

**Notes:**
- #16: Back button now clears deal type selections to prevent stale state when changing submission type
- #17: Selecting an option auto-advances to next step after brief delay (except B1 blueprint proposal)

## [2026-01-10] - Agent 4 - Issue #21

**Status:** Completed

**Files Changed:**
- supabase/migrations/20260110000012_admin_viewed_at.sql (new - adds admin_viewed_at column)
- lib/api/inquiries.ts (added markInquiryAsViewed function)
- app/(dashboard)/inquiries/[id]/page.tsx (calls markInquiryAsViewed when admin views)
- features/inquiries/components/InquiryTableView.tsx (added eye icon for viewed inquiries)
- features/inquiries/components/InquiryBoardView.tsx (added eye icon for viewed inquiries)

**Notes:**
DFY partners can now see a green eye icon next to inquiries that have been viewed by admin. The admin_viewed_at timestamp is set on first admin view and the icon appears in both table and board views.

## [2026-01-10] - Agent 2 - Issues #5, #15

**Status:** Completed

**Files Changed:**
- features/inquiries/components/IntakeForm.tsx
  - Improved handleSetField with shouldValidate: true and requestAnimationFrame for better sync (#5)
  - Increased form width from max-w-2xl to max-w-3xl for less cramped layout (#15)
- features/inquiries/components/AICopilotSidebar.tsx
  - Better formatted field confirmation messages (#5)
- features/inquiries/components/steps/ClosedDealType.tsx
  - Updated styling to match InitialStep (p-5, rounded-xl, border-2, checked state highlighting) (#15)
- features/inquiries/components/steps/ProposalType.tsx
  - Updated styling to match InitialStep (p-5, rounded-xl, border-2, checked state highlighting) (#15)

**Notes:**
- #5: AI Copilot now properly syncs with form state using shouldValidate and visual feedback
- #15: Consistent card styling across all selection steps, wider form container

## [2026-01-10] - Agent 4 - Issue #20

**Status:** Completed

**Files Changed:**
- features/inquiries/utils/editorToMarkdown.ts (new file - converts Plate editor content to markdown)
- features/inquiries/components/InquiryDocument.tsx (added copy button with markdown export)
- features/inquiries/components/ProposalTab.tsx (added copy button with markdown export)

**Notes:**
Added "Copy as Markdown" button to both Document tab and Proposal tab headers. Uses a custom serializer that converts Plate/Slate nodes to markdown format. Supports headings, paragraphs, lists, links, bold, italic, code blocks, blockquotes, and tables.

## [2026-01-10] - Agent 4 - Issue #29

**Status:** Completed

**Files Changed:**
- app/(dashboard)/inquiries/[id]/page.tsx (changed canEditDocument to admin-only, DFY can only comment)

**Notes:**
Simple fix - removed `|| canEditAsOwner` from canEditDocument calculation. Now only admin/internal can edit the Document tab, while DFY partners can only comment.

## [2026-01-10] - Agent 2 - Issues #7, #8, #9, #6, #10, #27

**Status:** Completed

**Files Changed:**
- features/inquiries/utils/generateDocumentFromInquiry.ts
  - Fixed [object Object] display by properly handling object types
  - Added enum-to-label mapping for urgency, budget_indication, engagement_level, etc.
  - Removed emojis from PDF generation (📋, 👤, 📝)
- app/(dashboard)/inquiries/[id]/page.tsx
  - Added enum-to-label mapping for form data display
- features/inquiries/components/MyVersionTab.tsx
  - Changed "Copy from Proposal" to "Import from Proposal" with Download icon (#27)
  - Replaced page reload with editor.tf.setValue() update (#6)
- lib/api/inquiries.ts
  - Added proposal_content and proposal_submitted_at to getInquiryByPublicToken (#10)
- features/inquiries/components/PublicProposalView.tsx
  - Now shows proposal_content when submitted, falls back to document_content (#10)

**Notes:**
- #7: Objects are now skipped instead of converting to "[object Object]"
- #8: Enum values like "thirty_days" now display as "< 30 days"
- #9: Emojis removed from all headings for clean PDF export
- #6: No more page reload when importing from proposal
- #10: Public share link now shows actual proposal content when submitted
- #27: Clearer "Import from Proposal" label with download icon
