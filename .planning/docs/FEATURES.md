# hexOS Features Documentation

> Comprehensive documentation of all 19 feature modules in the hexOS project management portal.
> Each feature lives under `features/<name>/` with its own actions, components, and utilities.

---

## Table of Contents

1. [Inquiries](#1-inquiries)
2. [Projects](#2-projects)
3. [Opportunities](#3-opportunities)
4. [Conversations](#4-conversations)
5. [Finances](#5-finances)
6. [Payments](#6-payments)
7. [Notifications](#7-notifications)
8. [Blueprints](#8-blueprints)
9. [Case Studies](#9-case-studies)
10. [Suggestions](#10-suggestions)
11. [Organizations](#11-organizations)
12. [Onboarding](#12-onboarding)
13. [Dev](#13-dev)
14. [Dev Logging](#14-dev-logging)
15. [Developer](#15-developer)
16. [Admin](#16-admin)
17. [Settings](#17-settings)
18. [Project Initiation](#18-project-initiation)
19. [Testing](#19-testing)

---

## 1. Inquiries

**Purpose:** The full sales pipeline system. DFY partners submit inquiries (leads), admins write proposals, deliverables are negotiated, and deals are closed and converted to projects.

### Key Components

| Component | Description |
|-----------|-------------|
| `IntakeForm.tsx` | Multi-step inquiry submission form (DFY partners fill this out) |
| `FormStepIndicator.tsx` | Visual step progress for the intake wizard |
| `InquiryBoardView.tsx` | Kanban-style board grouped by proposal stage |
| `InquiryListView.tsx` | Card-based list view of inquiries |
| `InquiryTableView.tsx` | Sortable/filterable table view |
| `InquiryDocument.tsx` | Rich-text document (Plate.js editor) for notes |
| `InquiryDocumentTab.tsx` | Tab container for the document editor |
| `ProposalTab.tsx` | Tab where admin writes the proposal with Plate.js editor |
| `MyVersionTab.tsx` | DFY partner's private copy of the proposal |
| `AICopilotSidebar.tsx` | AI-powered sidebar for proposal assistance |
| `BlueprintDetailsSidebar.tsx` | Shows linked blueprint details in sidebar |
| `CommentsSidebar.tsx` | Threaded comments on inquiry documents |
| `StageBadge.tsx` | Color-coded badge for proposal stage |
| `PriorityBadge.tsx` | Priority level indicator |
| `StageHistoryTimeline.tsx` | Visual timeline of stage transitions |
| `StaleProposalsBanner.tsx` | Banner alerting about proposals needing attention |
| `ProposalStatusDialog.tsx` | Dialog for managing proposal status transitions |
| `QuickPricingEditor.tsx` | Inline editor for price_dfy, price_hexona, price_dev |
| `ShareLinkButton.tsx` | Generate public shareable link for proposals |
| `PublicProposalView.tsx` | Public-facing proposal page (no auth required) |
| `ExportPDFButton.tsx` | Export proposal to PDF using @react-pdf |
| `ProposalPDF.tsx` | PDF template for proposal export |
| `CreateOpportunityButton.tsx` | Create a dev opportunity from an inquiry |
| `MarkAsClosedButton.tsx` | DFY marks a deal as won/closed |
| `ReopenInquiryButton.tsx` | Admin-only: reopen a closed inquiry |
| `SuggestChangesButton.tsx` | DFY suggests changes to a proposal |
| `FullscreenDocument.tsx` | Fullscreen editor view |

**Deliverables Sub-Components (features/inquiries/components/deliverables/):**

| Component | Description |
|-----------|-------------|
| `DeliverablesTab.tsx` | Main tab for managing proposal deliverables |
| `DeliverablesTable.tsx` | Table of all deliverables with inline actions |
| `DeliverableRow.tsx` | Single deliverable row with status, price, actions |
| `AddDeliverableModal.tsx` | Modal to manually add a deliverable |
| `BlueprintTierSelector.tsx` | Import deliverables from a blueprint tier |
| `DeliverableStatusBadge.tsx` | Badge showing deliverable review status |
| `DeliverableDiff.tsx` | Shows before/after when counter-offer is made |
| `DeliverableHistory.tsx` | Full audit trail of a deliverable |
| `CounterOfferDialog.tsx` | INT user counters a DFY deliverable |
| `CounterResponseCard.tsx` | DFY responds to counter-offer (accept/reject) |

**Conversion Sub-Components (features/inquiries/components/conversion/):**

| Component | Description |
|-----------|-------------|
| `ConvertToProjectButton.tsx` | Triggers the conversion wizard |
| `ConvertToProjectWizard.tsx` | Multi-step wizard to set up the project |
| `RequirementsBuilder.tsx` | Build onboarding requirements during conversion |

**Intake Form Steps (features/inquiries/components/steps/):**

| Component | Description |
|-----------|-------------|
| `InitialStep.tsx` | Entry point: new or existing prospect |
| `ProposalType.tsx` | Choose: blueprint, custom, or variation |
| `BlueprintInfo.tsx` | Blueprint selection and tier details |
| `CustomProposal.tsx` | Free-form custom project description |
| `VariationProposal.tsx` | Blueprint variation with modifications |
| `ClosedDealType.tsx` | Choose type for already-closed deals |
| `ClosedBlueprint.tsx` | Closed deal with a blueprint |
| `ClosedCustom.tsx` | Closed deal with custom scope |
| `ForwardForm.tsx` | Forward inquiry to hexOS from email |
| `ConfirmationScreen.tsx` | Summary and submit confirmation |

### Server Actions

**inquiryActions.ts:**
- `archiveInquiryAction` / `unarchiveInquiryAction` - Soft archive/restore
- `deleteInquiryAction` - Hard delete with redirect
- `restoreInquiryAction` - Restore deleted inquiry
- `updateInquiryStatusAction` - Change status (open/closed/etc.)
- `updateStageAction` - Move through proposal pipeline stages (with notes)
- `updatePriorityAction` - Set priority (low/medium/high/urgent)
- `updateDueDateAction` - Set/clear due date
- `assignInquiryAction` - Assign to a user
- `updatePriceDfyAction` - Update DFY price
- `bulkUpdateStageAction` - Bulk stage transition (multiple inquiries)
- `updatePricingAction` - Update all three price fields + notes

**conversionActions.ts:**
- `markAsClosedAction` - DFY marks deal as won (with optional client email)
- `unmarkAsClosedAction` - Undo close
- `convertToProjectAction` - Convert inquiry to project (returns projectId)
- `convertAndRedirectAction` - Convert and redirect to new project
- `reopenInquiryAction` - Admin reopens a closed/converted inquiry

**deliverableActions.ts:**
- `triggerParseDeliverablesAction` - AI extracts deliverables from proposal text using OpenRouter (Claude 3.5 Haiku via tool-use)
- `createDeliverableAction` / `updateDeliverableAction` / `deleteDeliverableAction` - CRUD
- `markDeliverableRemovedAction` / `revertDeliverableAction` - Soft remove/revert
- `addFromBlueprintTierAction` - Bulk import from a blueprint pricing tier
- `submitDeliverablesForReviewAction` - DFY submits deliverables for INT review
- `withdrawDeliverablesSubmissionAction` - DFY withdraws submission
- `startReviewAction` - INT begins review
- `reviewDeliverableAction` - INT approves/rejects/counters individual deliverable
- `bulkApproveDeliverablesAction` - Bulk approve
- `finalApproveDeliverablesAction` - Final approval (status -> approved)
- `sendBackForRevisionAction` - INT sends back (status -> needs_revision)
- `addDeliverableCommentAction` / `deleteDeliverableCommentAction` - Comments
- `acceptCounterAction` / `rejectCounterAction` - DFY responds to counter-offer
- `getDeliverableHistoryAction` - Full history audit

**proposalActions.ts:**
- `saveProposalContentAction` - Auto-save proposal content (no revalidation)
- `submitProposalAction` - Submit proposal to DFY
- `unsubmitProposalAction` - Undo submit (admin only)
- `submitForReviewAction` - Move to final_review stage
- `approveProposalAction` - Approve (move to ready stage)
- `saveDfyVersionAction` - DFY saves their private version
- `copyProposalToDfyVersionAction` - Copy admin proposal to DFY version
- `addProposalComment` / `resolveProposalCommentAction` / `deleteProposalCommentAction` - Comments

**documentActions.ts:**
- `saveInquiryDocument` / `saveInquiryDocumentWithDiscussions` - Auto-save document
- `addInquiryComment` / `resolveInquiryCommentAction` / `deleteInquiryCommentAction` - Comments

**reminderActions.ts:**
- `snoozeReminderAction` - DFY snoozes a stale proposal reminder
- `markLostAction` - DFY marks proposal as lost (with reason)
- `markWonAction` - DFY marks as won
- `requestAdminHelpAction` - DFY escalates to admin
- `clearEscalationAction` - Admin clears escalation
- `trackDfyViewAction` - Track when DFY views proposal
- `requestUpdatesAction` - Admin requests updates for multiple proposals

**submitInquiry.ts:**
- `submitInquiry` - Create new inquiry from intake form

### API Functions Used

- `lib/api/inquiries.ts` - Core CRUD, stage management, pricing, conversion
- `lib/api/inquiry-comments.ts` - Threaded comments (internal/proposal types)
- `lib/api/proposal-deliverables.ts` - Deliverable CRUD, review, counter-offers
- `lib/api/proposal-reminders.ts` - Stale proposal tracking, escalation
- `lib/api/blueprints.ts` - Blueprint lookup for tier import

### Database Tables

- `inquiries` - Main table (status, proposal_stage, stage_history, pricing fields, document_content, proposal_content, dfy_version_content)
- `inquiry_comments` - Threaded comments with type (internal/proposal)
- `proposal_deliverables` - Deliverables with negotiation workflow (change_status, counter fields, review_status)
- `proposal_reminders` - Stale proposal tracking
- `profiles` - User info for assignment

### Special Patterns

- **AI Integration:** Uses OpenRouter API with Claude 3.5 Haiku for extracting deliverables from proposal text via tool-use/function-calling
- **Plate.js Editor:** Rich text editor for proposals and documents with discussion threads
- **Deliverable Negotiation Flow:** Multi-step workflow: DFY edits -> submits -> INT reviews -> approves/counters/rejects -> DFY responds to counters -> final approval
- **Deliverable Status Machine:** none -> parsing -> dfy_editing -> dfy_submitted -> int_reviewing -> needs_revision -> approved
- **Deliverable Change Status Machine:** 9 states with enforced transition validation:
  - `original` → edited, approved, rejected, countered, removed
  - `added` → edited, approved, rejected, countered, removed
  - `edited` → approved, rejected, countered, removed, original, added (via revert)
  - `removed` → original, added (via revert)
  - `approved` → edited (DFY re-edits)
  - `rejected` → edited (DFY re-edits)
  - `countered` → counter_accepted, counter_rejected
  - `counter_accepted` → (terminal)
  - `counter_rejected` → countered, approved, rejected
  - Invalid transitions throw `Error("Invalid status transition: X → Y")`
- **Revert Behavior:** Source-aware revert — `ai_parsed` deliverables revert to `original`, `custom`/`blueprint_tier` deliverables revert to `added` (prevents DFY-added items from escaping review)
- **History Audit Trail:** All state changes logged to `proposal_deliverable_history` including counter fields. Bulk approve also logs per-deliverable history. History insert failures propagate to parent operations. Version numbers use retry logic (max 3 attempts) to handle concurrent writes.
- **Proposal Stages:** intake -> scoping -> proposal_writing -> final_review -> ready -> sent -> follow_up -> closed/lost
- **Public Proposal Sharing:** Shareable links with token-based access (no auth required)
- **PDF Export:** React-PDF for generating downloadable proposal documents
- **Intake Form Paths:** 5 form paths (A1, A2, A3, B2, B3) based on submission_type and deal_type

---

## 2. Projects

**Purpose:** Full project lifecycle management from deliverables sign-off through to completion. Supports 22 statuses across 7 phases, with hill charts, scope monitoring, delay tracking, file management, and requirement dependencies.

### Key Components

| Component | Description |
|-----------|-------------|
| `ProjectPageClient.tsx` | Main project page client component |
| `ProjectHeader.tsx` | Project name, status badge, actions dropdown |
| `ProjectProgressBar.tsx` | Visual progress based on deliverable completion |
| `ProjectStatusControl.tsx` | Status transition controls with role-based visibility |
| `ProjectTabs.tsx` | Tab navigation (Overview, Deliverables, Hill Chart, etc.) |
| `ProjectTimeline.tsx` | Timeline view of project milestones |

**Tab Components (features/projects/components/tabs/):**

| Component | Description |
|-----------|-------------|
| `OverviewTab.tsx` | Project summary, key metrics, recent activity |
| `DeliverablesTab.tsx` | Deliverable list with status management |
| `FilesTab.tsx` | File browser with two workspaces (Internal/Client) |
| `ChatTab.tsx` | Project chat (conversations integration) |
| `RequirementsTab.tsx` | Project requirements with dependency tracking |
| `FinancialsTab.tsx` | Project financial breakdown and milestones |
| `ScopeTab.tsx` | Scope change monitoring and approval |
| `ActivityTab.tsx` | Activity log timeline |
| `OnboardingTab.tsx` | Onboarding requirements checklist |
| `TestingTab.tsx` | Testing queue for deliverables |
| `GameplanTabWrapper.tsx` | Gameplan document editor |
| `ProjectInfoTab.tsx` | Project metadata and settings |

**Hill Chart (features/projects/components/hill-chart/):**

| Component | Description |
|-----------|-------------|
| `HillChartTab.tsx` | Container for the hill chart view |
| `HillChart.tsx` | SVG-based hill chart visualization (0-100 scale) |
| `ParentDeliverableCard.tsx` | Deliverable card on the chart |
| `SubDeliverableCard.tsx` | Sub-deliverable nested card |
| `StatCard.tsx` | Summary statistics card |
| `CompactSparkline.tsx` / `ExpandedSparkline.tsx` | Position history sparklines |

**Scope Monitoring (features/projects/components/scope/):**

| Component | Description |
|-----------|-------------|
| `ScopeChangeCard.tsx` | Individual scope change display |
| `ScopeChangeDialog.tsx` | Flag new scope change dialog |
| `ScopeChangeStatusBadge.tsx` | Status badge (pending/approved/rejected) |
| `ScopeChangeTypeBadge.tsx` | Type badge (deliverable_added/removed/modified, hours_increased, timeline_extended) |
| `ScopeMetricsSummary.tsx` | Summary of scope drift vs baseline |

**Delays & Extensions (features/projects/components/delays/):**

| Component | Description |
|-----------|-------------|
| `DelayListCard.tsx` | List of marked delays |
| `DelayMarkerDialog.tsx` | Dialog to mark a new delay |
| `DelaySummaryWidget.tsx` | Summary of client vs dev delay days |
| `DelayTypeBadge.tsx` | Badge for delay type |
| `ExtensionRequestDialog.tsx` | Request deadline extension |
| `ExtensionApprovalCard.tsx` | Approve/reject extension (DFY action) |
| `PendingExtensionsList.tsx` | List of pending extensions |

**File Management (features/projects/components/files/ and files-tab/):**

| Component | Description |
|-----------|-------------|
| `FilesTabContainer.tsx` | Main files tab with two-workspace layout |
| `FileSidebar.tsx` | File tree sidebar navigation |
| `FileViewerModal.tsx` | Modal for viewing files (images, PDFs, code, audio, video) |
| `DocumentEditor.tsx` | Plate.js rich text editor for documents |
| `DocumentEditorFullscreen.tsx` | Fullscreen document editor |
| `NewItemDropdown.tsx` | Dropdown to create new file/folder/document |
| `AudioViewer.tsx` / `CodeViewer.tsx` / `ImageViewer.tsx` / `PdfViewer.tsx` / `VideoViewer.tsx` / `UnsupportedViewer.tsx` | Specialized file viewers |

**Gameplan (features/projects/components/gameplan/):**

| Component | Description |
|-----------|-------------|
| `GameplanTab.tsx` | Main gameplan container |
| `GameplanEditor.tsx` | Plate.js editor for gameplan documents |
| `DocumentTabs.tsx` | Multiple documents within gameplan |
| `NewDocumentDialog.tsx` | Create new gameplan document |
| `VersionHistoryPanel.tsx` | Version history sidebar |

### Server Actions

**projectActions.ts:**
- `updateProjectStatusAction` - Status transition with activity logging and dev notifications
- `confirmDeliverablesAction` - Confirm deliverables (status -> deliverables_pending)
- `sendForSignoffAction` - Send for client sign-off (status -> awaiting_signoff)
- `signOffDeliverablesAction` - Client signs off (status -> signed_off), captures scope baseline
- `updateRequirementStatusAction` - Update requirement with dependency checking (canCompleteRequirement)
- `updateRequirementDependenciesAction` - Set dependency graph between requirements
- `assignDevAction` - Assign developer to project with notification
- `archiveProjectAction` / `unarchiveProjectAction` - Soft archive/restore
- `deleteProjectAction` / `restoreProjectAction` - Soft delete/restore
- `markRequirementCompleteAction` - Complete onboarding requirement
- `addRequirementAction` / `updateRequirementAction` / `deleteRequirementAction` - Onboarding requirements CRUD
- `updateDeliveryOverrideAction` - Override calculated delivery date

**deliverableActions.ts:**
- `addDeliverableAction` - Add with auto scope change flagging
- `updateDeliverableAction` - Update with scope change detection (hours increase, timeline extension, baseline diff)
- `updateDeliverableStatusAction` - Change status (pending/in_progress/blocked/done)
- `deleteDeliverableAction` - Delete with scope change flagging if in baseline

**fileActions.ts:**
- `getProjectFilesAction` - Fetch file tree (role-based visibility)
- `uploadProjectFileAction` - Upload to Supabase Storage (50MB max, general-purpose bucket)
- `updateProjectFileAction` - Update visibility/description
- `deleteProjectFileAction` - Delete from storage + DB
- `createFolderAction` / `createDocumentAction` - Create folder or Plate.js document
- `updateDocumentContentAction` - Auto-save document content
- `renameItemAction` / `moveItemAction` / `reorderItemsAction` / `deleteItemAction` - File tree operations
- `getFileSignedUrlAction` - Get signed download URL
- `shareItemAction` / `unshareItemAction` / `moveItemToViewAction` - Two-workspace sharing (Internal <-> Client visibility)

**hillChartActions.ts:**
- `updatePositionAction` - Set deliverable's hill position (0-100), one history entry per day, auto-creates test session at 90%+
- `quickUpdatePositionAction` - Delta-based quick update (+5%, -5%, +10%)
- `batchUpdatePositionsAction` - Batch update for drag-and-drop
- `setDeliverableColorAction` - Custom color per deliverable on chart

**delayActions.ts:**
- `createDelayAction` - Mark a delay (client_delay/dev_delay/external)
- `updateDelayAction` / `deleteDelayAction` - Manage delays
- `getDelaySummaryAction` - Get summary (client_delay_days, dev_delay_days, total_delay_days)
- `markBlockerDelayAction` - Mark delay from a blocker

**extensionActions.ts:**
- `requestExtensionAction` - Request deadline extension (notifies DFY partner)
- `approveExtensionAction` - DFY approves (notifies requester)
- `rejectExtensionAction` - DFY rejects (notifies requester)

**scopeActions.ts:**
- `flagScopeChangeAction` - Flag scope change (notifies admins)
- `approveScopeChangeAction` / `rejectScopeChangeAction` - Admin approves/rejects
- `addScopeChangeCommentAction` - Threaded comments on scope changes
- `captureBaselineAction` - Capture scope baseline
- `getScopeChangesAction` / `getScopeMetricsAction` / `compareToBaselineAction` - Data queries

**financialActions.ts:**
- `updateProjectFinancialsAction` - Admin-only: update project financial fields

**checkinActions.ts:** (used by dev-logging feature)
- Developer daily check-in submission

### API Functions Used

- `lib/api/projects.ts` - Core CRUD, status management, financial updates
- `lib/api/deliverables.ts` - Deliverable data types
- `lib/api/project-requirements.ts` - Requirements with dependency graph
- `lib/api/project-files.ts` / `project-files.shared.ts` - File tree management with visibility
- `lib/api/project-delays.ts` - Delay tracking
- `lib/api/project-extensions.ts` - Extension request/approve/reject
- `lib/api/scope-monitoring.ts` - Baseline capture, scope change detection, auto-flagging
- `lib/api/hill-chart.ts` - Hill chart position history
- `lib/api/project-documents.ts` - Gameplan documents
- `lib/api/requirement-notifications.ts` - Requirement unblock notifications
- `lib/api/notifications.ts` - General notifications
- `lib/api/testing.ts` - Auto-create test sessions at 90% hill position

### Database Tables

- `projects` - Main table (status, pricing, assigned_dev_id, dfy_partner_id, delivery dates, sign-off tracking)
- `deliverables` - Project deliverables (status, hill_position, hill_color, estimated_hours, due_date)
- `deliverable_position_history` - Daily hill chart position snapshots
- `project_requirements` - Requirements with dependency DAG (depends_on)
- `onboarding_requirements` - Client onboarding checklist (owner_type, blocker_type, parent_id tree)
- `project_files` - File tree (parent_id, visibility, content_type: file/folder/document)
- `project_delays` - Delay markers (delay_type, days_count, blocker_id link)
- `project_extensions` - Extension requests (original_deadline, requested_deadline, client_delay_days)
- `scope_baselines` - Snapshot of deliverables at sign-off
- `scope_changes` - Flagged scope changes (trigger_type, request_type, status)
- `scope_change_comments` - Comments on scope changes
- `activity_log` - All project activity audit trail
- `payment_milestones` - Payment schedule per project

### Special Patterns

- **22 Project Statuses / 7 Phases:** From `deliverables_pending` through to `completed`, with sign-off, onboarding, dev_ready, in_development, testing, launch phases
- **Hill Chart (0-100):** 0-50 = figuring out, 50-100 = making it happen. Position 90%+ auto-creates test session
- **Scope Baseline:** Captured at sign-off. All subsequent deliverable changes are auto-compared to baseline and flagged
- **Auto Scope Flagging:** Adding/removing/modifying deliverables, increasing hours, or extending timelines automatically creates scope change records
- **Two-Workspace Files:** Internal workspace (admin/int/dev) and Client workspace (client visible), with share/unshare between them
- **Requirement Dependencies:** DAG-based dependency graph; requirements check `canCompleteRequirement` before completing
- **One History Entry Per Day:** Hill chart position history deduplicated to one entry per deliverable per day

---

## 3. Opportunities

**Purpose:** Developer opportunity marketplace. Admins create opportunities from inquiries/projects, generate AI-redacted briefs, and developers bid on them or express commitment.

### Key Components

| Component | Description |
|-----------|-------------|
| `BidForm.tsx` | Form for devs to submit a bid (weeks, price, cover message) |
| `BidCard.tsx` | Display a single bid |
| `BidList.tsx` | List of all bids on an opportunity |
| `RedactedBriefCard.tsx` | Shows AI-generated redacted brief (no client-identifying info) |
| `PreCommitmentTab.tsx` | Pre-commitment status management (interested/committed/declined) |
| `CommitmentStatusBadge.tsx` | Badge showing commitment level |

### Server Actions

**bidActions.ts:**
- `submitBidAction` - Dev submits bid (proposedWeeks, proposedPrice, coverMessage)
- `withdrawBidAction` - Dev withdraws bid
- `updateBidStatusAction` - Admin reviews bid (accepted/rejected/shortlisted)
- `getBidsForOpportunityAction` - Query bids

**briefActions.ts:**
- `generateBriefAction` - Generate AI brief with caching (input hash comparison)
- `regenerateBriefAction` - Force regenerate (invalidates cache first)
- `getBriefForOpportunityAction` - Get/generate brief for opportunity, compiles source data from opportunity + linked project

**preCommitmentActions.ts:**
- `setCommitmentStatusAction` - Set interested/committed/declined
- `removeCommitmentAction` - Remove commitment
- `toggleInterestAction` - Quick toggle: null/declined -> interested, interested -> remove, committed -> no-op
- `getCommittedDevsAction` - Admin query: who committed

### API Functions Used

- `lib/api/bids.ts` - Bid CRUD and status management
- `lib/api/brief-extractions.ts` - AI brief generation, caching, hash comparison
- `lib/api/project-invitations.ts` - Opportunity CRUD, commitment status, dev preferences

### Database Tables

- `dev_opportunity_bids` - Bids (proposed_weeks, proposed_price, cover_message, status)
- `brief_extractions` - Cached AI-generated briefs (input_hash, brief_content, redacted_brief)
- `dev_opportunity_preferences` - Dev commitment status per opportunity
- `project_invitations` - Direct invitations to devs

### Special Patterns

- **AI Brief Generation:** Calls `/api/generate-brief` endpoint, generates privacy-safe redacted briefs that hide client identity
- **Cache-First:** Briefs are cached with input hashing; regeneration only if source data changed
- **Three-Layer Commitment:** interested -> committed -> bid submitted (progressive engagement)
- **Pre-Commitment vs Bidding:** Pre-commitment is lightweight interest; bidding is formal with price/timeline

---

## 4. Conversations

**Purpose:** Real-time messaging system for project communication. Supports threaded conversations, message reactions, file attachments, @mentions, and unread tracking.

### Key Components

| Component | Description |
|-----------|-------------|
| `ChatPanel.tsx` | Main chat panel (message list + input) |
| `ConversationList.tsx` | List of conversations with unread badges |
| `ConversationItem.tsx` | Single conversation in the list |
| `ConversationTabs.tsx` | Tab navigation between conversations |
| `MessageInput.tsx` | Message composer with attachment support |
| `MessageItem.tsx` | Individual message display |
| `MessageList.tsx` | Scrollable message list |
| `MessageReactions.tsx` | Emoji reactions on messages |
| `UnreadBadge.tsx` | Unread message count badge |

### Server Actions

**conversationActions.ts:**
- `sendMessageAction` - Send text message (with optional @mentions)
- `sendMessageWithAttachmentsAction` - Send message + file attachments (FormData)
- `editMessageAction` - Edit own message
- `deleteMessageAction` - Delete own message
- `toggleReactionAction` - Toggle emoji reaction (returns {added: boolean})
- `markReadAction` - Mark conversation read (updates unread counts)
- `uploadAttachmentAction` - Upload attachment to existing message
- `getAttachmentSignedUrlAction` - Get signed URL for attachment download
- `getProjectConversationsAction` - Load all conversations for a project with messages and participants

### API Functions Used

- `lib/api/conversations.ts` - Conversation CRUD, messaging, read tracking
- `lib/api/conversations.shared.ts` - Shared types (Conversation, Message)
- `lib/api/message-attachments.ts` - File attachment upload and signed URLs
- `lib/api/mentionables.ts` - @mention user lookup

### Database Tables

- `conversations` - Conversations linked to projects
- `messages` - Messages with content, sender, timestamps
- `message_reactions` - Emoji reactions per message per user
- `conversation_participants` - Who can see which conversation
- `conversation_read_status` - Last read message per user per conversation
- `message_attachments` - File attachments on messages

### Special Patterns

- **Project-Scoped:** Each conversation is linked to a project_id
- **@Mentions:** Users can be @mentioned, tracked via `mentionedUserIds`
- **Reactions:** Toggle-based emoji reactions (add/remove)
- **Unread Tracking:** Per-user read cursor based on last_message_id

---

## 5. Finances

**Purpose:** Financial management dashboard with payout processing and retainer management. Tracks payouts from devs, retainer billing cycles, and generates invoices.

### Key Components

| Component | Description |
|-----------|-------------|
| `FinancesOverview.tsx` | Main finances dashboard overview |
| `RetainerManagement.tsx` | Retainer CRUD and billing management |
| `payouts/PayoutManagement.tsx` | Admin view of all payouts with approve/reject/mark-paid |

### Server Actions

**payoutActions.ts (Admin):**
- `approvePayoutAction` - Approve a dev payout request
- `rejectPayoutAction` - Reject with reason
- `markPayoutPaidAction` - Mark as paid (method: wire_transfer/paypal/crypto, reference, notes)

**payoutActions.ts (Dev):**
- `submitPayoutAction` - Dev submits payout (FormData with invoice file upload, wire transfer details, amount, project_id)
- `getAssignedProjectsAction` - Get projects assigned to current dev

**retainerActions.ts:**
- `createRetainer` - Create recurring retainer (client_name, amount, billing_day, billing_frequency)
- `updateRetainer` - Update retainer settings
- `pauseRetainer` / `resumeRetainer` / `cancelRetainer` / `deleteRetainer` - Lifecycle management
- `generateRetainerInvoice` - Auto-generate invoice from retainer (uses `generate_invoice_number` RPC, creates invoice + line items, advances next_invoice_date)

### API Functions Used

- `lib/api/payouts.ts` - Payout CRUD, approval workflow
- `lib/api/payouts.shared.ts` - Shared payout types
- `lib/api/payout-attachments.ts` - Invoice file upload (PDF/JPG/PNG/WebP, size validation)
- `lib/api/financial-metrics.ts` - Financial dashboard metrics
- `lib/api/invoices.ts` - Invoice management

### Database Tables

- `payouts` - Dev payout requests (amount, status, invoice_file_url, wire_details, payment_preference)
- `retainers` - Recurring billing (client_name, amount, billing_day, billing_frequency, next_invoice_date, status)
- `invoices` - Generated invoices
- `invoice_line_items` - Line items per invoice

### Special Patterns

- **Wire Transfer Details:** Payout form collects SWIFT/BIC, IBAN, bank name, recipient info
- **Invoice File Required:** Wire transfer payouts require uploaded invoice file
- **Retainer Auto-Billing:** `generateRetainerInvoice` creates invoice, advances next_invoice_date based on billing_frequency
- **Invoice Number Generation:** Uses Supabase RPC `generate_invoice_number` for sequential numbering

---

## 6. Payments

**Purpose:** Stripe-powered payment processing for client invoices. Provides a public invoice payment page.

### Key Components

| Component | Description |
|-----------|-------------|
| `PublicInvoiceView.tsx` | Public-facing invoice page with Stripe checkout integration |

### Server Actions

None (uses API route `/api/invoices/[id]/checkout` for Stripe Checkout session creation).

### API Functions Used

- Stripe API via `/api/invoices/[id]/checkout` route
- `lib/types/invoices.ts` - Invoice types

### Database Tables

- `invoices` - Invoice records with Stripe integration
- `invoice_line_items` - Line items

### Special Patterns

- **Public Payment Page:** No auth required; invoice accessed by ID
- **Stripe Checkout:** Creates Stripe Checkout session with success/cancel URLs
- **Currency Formatting:** Amounts stored in cents, displayed with Intl.NumberFormat

---

## 7. Notifications

**Purpose:** In-app notification system with bell icon, popover, and full-page views. Supports various notification types across all features.

### Key Components

The notification UI components live in the shared layout, not in this feature directory.

### Server Actions

**notificationActions.ts:**
- `fetchNotificationsAction` - Fetch notifications + unread count (limit parameter)
- `markNotificationReadAction` - Mark single notification as read
- `markAllNotificationsReadAction` - Mark all as read (returns count)

### API Functions Used

- `lib/api/notifications.ts` - Notification CRUD (getMyNotifications, getUnreadCount, markAsRead, markAllAsRead, createNotification)
- `lib/api/notifications-utils.ts` - Notification utility functions

### Database Tables

- `notifications` - Notifications (user_id, type, title, body, link, data, read_at)

### Special Patterns

- **Event-Driven Creation:** Notifications are created by other features (project status changes, blocker updates, extension requests, test results, etc.)
- **Type System:** Many notification types: status_change, project_assigned, blocker_acknowledged, blocker_resolved, extension_requested/approved/rejected, scope_change_flagged/approved/rejected, testing notifications
- **Layout Revalidation:** Uses `revalidatePath('/', 'layout')` to update notification counts globally

---

## 8. Blueprints

**Purpose:** Service catalog system. Admins create "blueprints" (service packages) with rich content, Loom video embeds, and tiered pricing. DFY partners use blueprints when submitting inquiries.

### Key Components

| Component | Description |
|-----------|-------------|
| `BlueprintCard.tsx` | Card display with icon, title, description, tags |
| `BlueprintViewer.tsx` | Full blueprint view with content and pricing |
| `BlueprintEditor.tsx` | Plate.js rich text editor for blueprint content |
| `BlueprintForm.tsx` | Create/edit form (title, description, tags, icon, Loom URL) |
| `BlueprintContentSection.tsx` | Rendered content section |
| `BlueprintActions.tsx` | Publish/unpublish/duplicate/delete actions |
| `FullscreenBlueprint.tsx` | Fullscreen viewing mode |
| `IconPicker.tsx` | Lucide icon picker for blueprint icon |
| `LoomVideoEmbed.tsx` | Loom video embed component |
| `PricingTiersEditor.tsx` | Editor for pricing tiers (features + price per tier) |
| `PricingTiersDisplay.tsx` | Display pricing tiers |
| `PricingTiersSection.tsx` | Section combining display and editor |
| `RelatedCaseStudies.tsx` | Shows linked case studies |
| `TagInput.tsx` | Tag input with autocomplete |

### Server Actions

**blueprintActions.ts:**
- `createBlueprintAction` - Create and redirect to new blueprint
- `updateBlueprintAction` - Update metadata
- `updateBlueprintContentAction` - Auto-save content (no revalidation)
- `deleteBlueprintAction` - Delete and redirect to list
- `publishBlueprintAction` / `unpublishBlueprintAction` - Toggle draft/published status
- `duplicateBlueprintAction` - Clone blueprint, redirect to edit

### API Functions Used

- `lib/api/blueprints.ts` - Full CRUD, duplicate, status management

### Database Tables

- `blueprints` - Blueprints (title, description, content, icon, tags, loom_url, pricing_tiers, status)

### Special Patterns

- **Pricing Tiers:** JSON structure with tier name, price, and feature list
- **Loom Integration:** Embedded Loom videos for blueprint explanation
- **Draft/Published:** Two-state publishing workflow
- **Blueprint -> Inquiry Flow:** DFY partners reference blueprints when creating inquiries; deliverables can be bulk-imported from blueprint tiers

---

## 9. Case Studies

**Purpose:** Case study catalog linked to blueprints. Shows completed work examples to DFY partners as sales collateral.

### Key Components

| Component | Description |
|-----------|-------------|
| `CaseStudyCard.tsx` | Card display |
| `CaseStudyViewer.tsx` | Full case study view |
| `CaseStudyEditor.tsx` | Plate.js content editor |
| `CaseStudyForm.tsx` | Create/edit form |
| `CaseStudyContentSection.tsx` | Rendered content |
| `CaseStudyActions.tsx` | Publish/duplicate/delete actions |
| `FullscreenCaseStudy.tsx` | Fullscreen view |

### Server Actions

**caseStudyActions.ts:**
- `uploadCaseStudyImageAction` - Upload cover image
- `createCaseStudyAction` / `updateCaseStudyAction` / `deleteCaseStudyAction` - CRUD
- `updateCaseStudyContentAction` - Auto-save content
- `publishCaseStudyAction` / `unpublishCaseStudyAction` - Draft/published toggle
- `duplicateCaseStudyAction` - Clone

### API Functions Used

- `lib/api/case-studies.ts` - Full CRUD, image upload, duplicate

### Database Tables

- `case_studies` - Case studies (title, content, cover_image_url, linked blueprint IDs, status)

### Special Patterns

- **Blueprint Linkage:** Case studies reference blueprints via `RelatedCaseStudies` in the blueprint viewer
- **Same Pattern as Blueprints:** Nearly identical architecture (Plate.js editor, draft/published, duplicate)

---

## 10. Suggestions

**Purpose:** Internal suggestion box where any user can submit improvement ideas with screenshots. Admins review and discuss.

### Key Components

| Component | Description |
|-----------|-------------|
| `SuggestionsList.tsx` | Admin view of all suggestions |
| `MySuggestionsList.tsx` | User's own suggestions |
| `SuggestionDetailSheet.tsx` | Detail sheet with conversation thread |

### Server Actions

**suggestionActions.ts:**
- `getSuggestionConversationAction` - Get conversation linked to suggestion
- `getConversationMessagesAction` - Get messages for discussion
- `getConversationParticipantsAction` - Get participants (suggestion author + all admins/internal)

### API Functions Used

- `lib/api/suggestions.ts` - Suggestion CRUD, conversation linking
- `lib/api/conversations.ts` - Reuses conversation system for discussion

### Database Tables

- `suggestions` - Suggestions (user_id, title, description, screenshot_url, status, conversation_id)
- `conversations` / `messages` - Reuses conversation system

### Special Patterns

- **Conversation Integration:** Each suggestion creates a linked conversation for threaded discussion
- **Participant Auto-Population:** All admin/internal users automatically participate in suggestion discussions

---

## 11. Organizations

**Purpose:** Multi-tenant organization management. Supports DFY agencies (with seats) and dev agencies. Handles creation, member management, seat limits, and role assignment.

### Key Components

| Component | Description |
|-----------|-------------|
| `TeamSettings.tsx` | Organization settings and member management |

### Server Actions

**organizationActions.ts:**
- `createOrganizationAction` - Create org (dfy_first or dev_agency type)
- `updateOrganizationAction` - Update settings
- `deactivateOrganizationAction` - Soft deactivate
- `updateMemberRoleAction` - Change member role (owner/admin/member)
- `deactivateMemberAction` / `reactivateMemberAction` - Member lifecycle (checks seat availability)
- `getOrganizationSeatsAction` - Get seat info (max_seats, used_seats, pending_invites, available_seats)
- `checkAvailableSeatsAction` - Boolean seat check
- `createDevAgencyAction` - Solo dev converts to agency owner

**invitationActions.ts:**
- `inviteAdminUserAction` - Admin invites admin/internal user (sends email)
- `inviteDfyAgencyAction` - Admin invites first DFY partner to create agency (sends email)
- `inviteDevAction` - Admin directly invites developer (bypasses application, sends email)
- `inviteTeamMemberAction` - Org owner invites team member (checks seats, sends email)
- `submitDevApplicationAction` - Public dev application (no auth, sends confirmation email)
- `approveDevApplicationAction` / `rejectDevApplicationAction` - Admin reviews applications (sends approval/rejection email)
- `validateInvitationAction` - Validate invitation token
- `acceptInvitationAction` - Accept invitation (assigns role, org membership)
- `revokeInvitationAction` - Revoke pending invitation
- `resendInvitationAction` - Regenerate token, extend expiry, resend email

### API Functions Used

- `lib/api/organizations.ts` - Org CRUD, member management, seat tracking
- `lib/api/invitations.ts` - Invitation CRUD (admin, dfy_first, team, dev, dev_application types)
- `lib/api/email.ts` - Email sending (invitation, application received/approved/rejected)

### Database Tables

- `organizations` - Orgs (name, type: dfy_agency/dev_agency, max_seats, status)
- `organization_members` - Members (user_id, organization_id, role: owner/admin/member, status)
- `invitations` - All invitation types (token, type, email, organization_id, metadata, status, expires_at)
- `profiles` - User profiles (role assignment on invitation acceptance)

### Special Patterns

- **Seat Management:** Organizations have max_seats; invitations and reactivations check seat availability
- **6 Invitation Types:** admin, internal, dfy_first, dfy_team, dev, dev_team, dev_application
- **Email Integration:** All invitations send emails via `lib/api/email.ts`
- **Token-Based Acceptance:** Invitations use unique tokens with expiry dates
- **Dev Application Flow:** Public application -> admin review -> approve (sends invite) or reject (sends rejection)
- **Agency Conversion:** Solo devs can convert to agency owners with `createDevAgencyAction`

---

## 12. Onboarding

**Purpose:** Guided product tour system using the Onborda library. Role-specific welcome tours for admin, client, dev, and DFY users.

### Key Components

| Component | Description |
|-----------|-------------|
| `OnboardingWrapper.tsx` | Provider wrapping the app with tour functionality |
| `TourCard.tsx` | Custom tour step card component |
| `TutorialSettings.tsx` | Settings page to replay/reset tutorials |

### Server Actions

**onboardingActions.ts:**
- `updateOnboardingStatus` - Mark tour as completed (stores in profile.onboarding_status JSON)
- `resetOnboardingStatus` - Reset all completed tours

### API Functions Used

- Direct Supabase queries on `profiles.onboarding_status`

### Database Tables

- `profiles` - `onboarding_status` JSONB column (`{ completed_tours: string[] }`)

### Special Patterns

- **Tour Library:** Uses `onborda` library with custom `TourCard` component
- **4 Role-Based Tours:** admin-welcome (4 steps), client-welcome (4 steps), dev-welcome (3 steps), dfy-welcome (3 steps)
- **Selector-Based:** Tours target DOM elements by CSS selector (e.g., `#nav-pipeline`, `#sidebar-trigger`)
- **Persistent State:** Completed tours stored in profile, survives sessions

### Tour Definitions (features/onboarding/lib/tours.ts)

- **admin-welcome:** Command Center, Pipeline Management, Financial Intelligence, Project Oversight
- **client-welcome:** Project Portal, Project Requirements, Transparent Billing, Direct Communication
- **dev-welcome:** Developer Workspace, Maintenance Pulse, Accurate Reporting
- **dfy-welcome:** Agency HQ, Service Catalog, Revenue & Earnings

---

## 13. Dev

**Purpose:** Developer dashboard with project cards, opportunity browsing, blocker reporting, task queue management, and payout submission.

### Key Components

| Component | Description |
|-----------|-------------|
| `HorizontalProjectCard.tsx` | Compact project card for dev dashboard |
| `DevOpportunitiesContent.tsx` | Opportunities browser for devs |
| `OpportunityCard.tsx` | Single opportunity card |
| `OpportunityList.tsx` | List of available opportunities |
| `OpportunityDetailModal.tsx` | Detailed opportunity view with brief and bid form |
| `ApplicationList.tsx` | Dev's own applications list |
| `InvitationList.tsx` | Dev's received invitations |
| `BlockerReportDialog.tsx` | Dialog to report a blocker |
| `BlockersList.tsx` | List of dev's reported blockers |
| `payouts/DevPayoutList.tsx` | Dev's payout history |
| `payouts/SubmitPayoutForm.tsx` | Form to submit new payout request |

### Server Actions

**blockerActions.ts:**
- `reportBlockerAction` - Report blocker (title, description, priority, project, deliverable)
- `updateBlockerStatusAction` - Update status (open/acknowledged/resolved) with notifications
- `updateBlockerAction` - Edit blocker details
- `deleteBlockerAction` - Delete blocker
- `addBlockerCommentAction` / `updateBlockerCommentAction` / `deleteBlockerCommentAction` - Threaded comments

**taskQueueActions.ts:**
- `reorderTasksAction` - Reorder task priority
- `setWorkingOnAction` - Mark deliverable as "working on"
- `toggleStarredAction` - Star/unstar deliverable
- `addToQueueAction` / `removeFromQueueAction` - Manage personal task queue

**invitationActions.ts:**
- Dev-specific invitation handling

**notesActions.ts:**
- Deliverable notes management

**notificationActions.ts:**
- Dev-specific notification handling

**opportunityPrefsActions.ts:**
- Opportunity preference management

### API Functions Used

- `lib/api/blockers.ts` - Blocker CRUD, comments, status
- `lib/api/dev-task-queue.ts` - Personal task queue (reorder, star, working_on)
- `lib/api/project-invitations.ts` - Opportunity browsing
- `lib/api/payouts.ts` - Payout submission

### Database Tables

- `blockers` - Blockers (project_id, deliverable_id, title, description, priority, status, reported_by)
- `blocker_comments` - Threaded comments on blockers
- `dev_task_queue` - Personal dev task queue (deliverable_id, position, is_starred, is_working_on)
- `dev_opportunity_preferences` - Opportunity interest/commitment

### Special Patterns

- **Task Queue:** Personal queue separate from project deliverables; devs can star, reorder, and mark "working on"
- **Blocker Notifications:** When admin acknowledges/resolves a blocker, the reporter gets notified
- **Opportunity Browsing:** Devs see available opportunities with redacted briefs (no client info)

---

## 14. Dev Logging

**Purpose:** Daily developer check-in system. Devs report progress on assigned deliverables with position updates and notes.

### Key Components

| Component | Description |
|-----------|-------------|
| `CheckinPromptProvider.tsx` | Context provider that prompts for overdue check-ins |
| `CheckinModal.tsx` | Multi-project check-in dialog (per-project tabs) |
| `CheckinTypeSelector.tsx` | Choose check-in type (progress/blocked/skip) |
| `DeliverableCheckinCard.tsx` | Per-deliverable update within check-in |
| `CheckinHistoryList.tsx` | History of past check-ins |
| `PositionQuickButtons.tsx` | Quick hill position adjustment buttons |

### Server Actions

Uses `features/projects/actions/checkinActions.ts` (not in this feature directory):
- `submitCheckinAction` - Submit daily check-in
- `snoozeCheckinAction` - Snooze check-in for later

### API Functions Used

- `lib/api/dev-logging.ts` - Check-in CRUD, history

### Database Tables

- `dev_checkins` - Daily check-in records (project_id, dev_id, checkin_type, summary)
- `dev_checkin_deliverables` - Per-deliverable updates within check-in (note, position_delta)
- `deliverables` - Hill position updated by check-ins

### Special Patterns

- **Prompt System:** `CheckinPromptProvider` detects overdue projects and auto-opens the check-in modal
- **Per-Deliverable Updates:** Each check-in includes notes and optional hill position deltas per deliverable
- **Check-in Types:** progress (normal update), blocked (dev is blocked), skip (no work today)
- **Hill Chart Integration:** Position deltas from check-ins update deliverable hill positions

---

## 15. Developer

**Purpose:** Developer skills, XP, and badges gamification system. Devs self-report skills, admins verify them, and peers endorse each other.

### Key Components

| Component | Description |
|-----------|-------------|
| `SkillsMatrix.tsx` | Visual skills matrix with categories and proficiency levels |

### Server Actions

**skillActions.ts:**
- `upsertSkillAction` - Create/update skill (category, skill_name, proficiency_level, portfolio_examples)
- `updateProficiencyAction` - Update proficiency level
- `deleteSkillAction` - Remove skill
- `verifySkillAction` - Admin verifies dev's claimed skill (can adjust level)
- `endorseSkillAction` - Peer endorsement (awards 15 XP to endorsed dev)
- `removeEndorsementAction` - Remove endorsement
- `awardBadgeAction` - Admin awards badge (100 XP bonus)
- `awardXPAction` - Admin awards arbitrary XP

### API Functions Used

- `lib/api/dev-skills.ts` - Skill CRUD, verification, endorsements, badges, XP

### Database Tables

- `dev_skills` - Developer skills (category, skill_name, proficiency_level, verified_by, portfolio_examples)
- `dev_skill_endorsements` - Peer endorsements (endorser_id, comment)
- `dev_badges` - Earned badges (badge_type, badge_name, criteria)
- `profiles` - XP tracking

### Special Patterns

- **Skill Categories:** Categorized skills (SkillCategory type)
- **Verification Flow:** Dev self-reports -> admin verifies (can adjust proficiency level)
- **Endorsement XP:** Endorsing a peer awards them 15 XP
- **Badge XP:** Earning a badge awards 100 XP
- **Anti-Self-Endorsement:** Users cannot endorse their own skills

---

## 16. Admin

**Purpose:** Admin dashboard with comprehensive metrics, partner management, team management, blocker queue, opportunity creation, and financial oversight.

### Key Components

| Component | Description |
|-----------|-------------|
| `ComprehensiveMetricsDashboard.tsx` | All-in-one metrics dashboard |
| `AdminOpportunitiesContent.tsx` | Manage opportunities (create, publish, close) |
| `AdminApplicationsList.tsx` | Review dev applications |
| `AdminBlockerQueue.tsx` | Queue of all reported blockers |
| `AdminDevDirectory.tsx` | Developer directory |
| `AdminPartnersList.tsx` | DFY partner organizations list |
| `AdminTeamList.tsx` | Internal team member management |

**Metrics Sub-Components (features/admin/components/metrics/):**

| Component | Description |
|-----------|-------------|
| `MetricsDashboard.tsx` | Main metrics container with tabs |
| `HeroMetrics.tsx` | Top-level KPI cards |
| `InvoiceManagement.tsx` | Invoice CRUD interface |
| `ExpenseLedger.tsx` | Expense tracking table |
| `tabs/OverviewTab.tsx` | Overview metrics |
| `tabs/PipelineTab.tsx` | Inquiry pipeline analytics |
| `tabs/ProjectsTab.tsx` | Project health metrics |
| `tabs/FinancialsTab.tsx` | Financial analytics |
| `tabs/TeamTab.tsx` | Team performance metrics |

**Activity Log (features/admin/activity-log/):**

| Component | Description |
|-----------|-------------|
| `ActivityLogContent.tsx` | Searchable activity log viewer |
| `ExportDialog.tsx` | Export activity log to CSV/JSON |

### Server Actions

**opportunityActions.ts:**
- `createOpportunityAction` - Create opportunity (title, description, estimatedHours/Weeks, complexity, expiresAt)
- `sendInvitationAction` - Send direct invitation to a dev
- `publishOpportunityAction` - Publish opportunity to all devs
- `closeOpportunityAction` - Close opportunity (filled or unfilled)
- `createOpportunityFromInquiryAction` - Create opportunity from inquiry context

**metricsActions.ts:**
- `fetchInquiryPipelineBreakdown` / `fetchInquiryConversionRates` / `fetchInquiriesBySource` / `fetchInquiryTimeline` - Inquiry analytics
- `fetchProjectStatusDistribution` / `fetchProjectHealthIndicators` / `fetchProjectTimelineMetrics` - Project analytics
- `fetchDeveloperUtilization` / `fetchTimeTrackingSummary` - Dev performance
- `fetchDFYPartnerPerformance` - Partner analytics
- `fetchDeliverablesOverview` / `fetchBlockersOverview` - Deliverable/blocker stats
- `fetchActivityOverview` / `fetchCommentStatistics` - Engagement metrics
- `fetchOpportunityMetrics` - Opportunity analytics
- `fetchComprehensiveDashboardMetrics` - All metrics in one call

**financialActions.ts:**
- `fetchFinancialHeroMetrics` / `fetchPaymentTimeline` / `fetchRevenueTrend` - Financial KPIs
- `fetchOverduePayments` / `fetchSalesCycleStats` / `fetchProjectedRevenueTimeline` - Financial analytics
- `createProjectPaymentMilestones` - Create payment schedule (100_upfront/50_50/40_30_30/custom)
- `markPaymentMilestoneAsPaid` - Mark milestone paid (with optional Stripe payment ID)
- `updatePaymentMilestoneDueDate` - Adjust due date
- `fetchProjectPaymentMilestones` - Query milestones
- `addExpense` / `editExpense` / `removeExpense` - Expense CRUD
- `fetchExpenses` / `fetchExpenseSummary` / `fetchPaymentSources` - Expense queries
- `addInvoice` / `editInvoice` / `sendInvoiceToClient` / `voidExistingInvoice` / `removeInvoice` - Invoice lifecycle
- `fetchInvoices` / `fetchInvoiceStats` - Invoice queries

### API Functions Used

- `lib/api/admin-metrics.ts` - Comprehensive metrics queries
- `lib/api/admin-metrics-utils.ts` - Metric calculation utilities
- `lib/api/admin-reports.ts` - Report generation
- `lib/api/project-invitations.ts` - Opportunity CRUD
- `lib/api/financial-metrics.ts` - Financial metric queries
- `lib/api/invoices.ts` - Invoice management
- `lib/api/activity-logs.ts` - Activity log queries

### Database Tables

- `activity_log` - All platform activity
- `invoices` / `invoice_line_items` - Invoice system
- `expenses` - Expense tracking (category, amount, payment_source_id)
- `payment_milestones` - Per-project payment schedule
- `payment_sources` - Payment method records

### Special Patterns

- **Comprehensive Dashboard:** `fetchComprehensiveDashboardMetrics` loads all metrics in a single call for performance
- **Payment Structures:** Supports 100% upfront, 50/50, 40/30/30, and custom milestone splits
- **Invoice -> Stripe:** `sendInvoiceToClient` sends invoice via Stripe
- **Activity Log Export:** CSV and JSON export with date range filtering

---

## 17. Settings

**Purpose:** User settings for profile, appearance, notifications, location, avatar, and developer-specific availability settings.

### Key Components

| Component | Description |
|-----------|-------------|
| `ProfileSettingsForm.tsx` | Edit name, email, bio |
| `AvatarUpload.tsx` | Upload/remove avatar image |
| `LogoUpload.tsx` | Upload organization logo |
| `AppearanceSettingsForm.tsx` | Theme and UI preferences |
| `NotificationSettingsForm.tsx` | Notification preference toggles |
| `LocationSettings.tsx` | City, country, timezone settings |
| `AvailabilityControl.tsx` | Dev availability settings |
| `SettingsSidebar.tsx` | Settings page navigation |

### Server Actions

**settingsActions.ts:**
- `updateLocationAction` - Update city/country/timezone
- `updateProfileAction` - Update profile fields
- `uploadAvatarAction` - Upload avatar (FormData)
- `removeAvatarAction` - Remove avatar
- `updateNotificationPreferencesAction` - Update notification toggles
- `updateUiPreferencesAction` - Update theme/appearance
- `updateDevAvailabilityAction` - Dev-specific: is_available, hours_per_week, max_concurrent_projects, available_from/until, status_message, auto_assign

**profileActions.ts:**
- Additional profile-related actions

### API Functions Used

- `lib/api/profiles.ts` - Profile CRUD, avatar management, preferences

### Database Tables

- `profiles` - User profile (name, email, bio, avatar_url, location, notification_preferences, ui_preferences, dev_availability fields)

### Special Patterns

- **Dev Availability:** Separate availability settings including hours/week, max projects, date range, and auto-assign toggle
- **UI Preferences:** Theme settings stored in `ui_preferences` JSONB

---

## 18. Project Initiation

**Purpose:** Multi-step wizard to convert a closed inquiry into a full project. Handles project creation, deliverable copying, onboarding requirement building, and payment milestone setup.

### Key Components

| Component | Description |
|-----------|-------------|
| `InitiateWizard.tsx` | Main wizard container with step navigation |
| `RequirementDetailPanel.tsx` | Side panel for editing requirement details |
| `steps/DeliverablesStep.tsx` | Select which deliverables to carry over from inquiry |
| `steps/RequirementsStep.tsx` | Build onboarding requirements tree |
| `steps/ReviewStep.tsx` | Review all settings before creation |

### Server Actions

**initiationActions.ts:**
- `completeInitiationAction` - Main action that:
  1. Creates project from inquiry data (duplicate check via source_inquiry_id)
  2. Creates payment milestones based on payment_structure
  3. Copies approved deliverables from proposal_deliverables to project deliverables
  4. Creates onboarding requirements tree (root first, then children level-by-level with temp_id mapping)
  5. Updates inquiry status to "converted" with stage_history entry

**deliverableStepActions.ts:**
- Deliverable selection step actions

**requirementActions.ts:**
- Requirement building step actions

### Utilities

**utils/treeHelpers.ts:**
- Tree structure helpers for requirement hierarchy

### API Functions Used

- `lib/api/onboarding-requirements.ts` - Bulk create requirements
- Direct Supabase queries for project creation, deliverable copying, inquiry status update

### Database Tables

- `projects` - New project record
- `inquiries` - Updated with converted status
- `proposal_deliverables` - Source for deliverable copying
- `deliverables` - Destination for copied deliverables
- `onboarding_requirements` - Created requirements tree
- `payment_milestones` - Created payment schedule

### Special Patterns

- **Duplicate Prevention:** Checks `source_inquiry_id` before creating project
- **Transactional Rollback:** Steps 1b-4 (milestones, deliverables, requirements, inquiry update) are wrapped in try/catch — on any failure, the created project is deleted to prevent orphaned records and allow clean retry
- **Counter Price Handling:** Only uses `counter_price` when deliverable `change_status === 'counter_accepted'`; pending/rejected counters use the original price
- **Tree Structure:** Requirements support parent-child hierarchy via temp_id -> real_id mapping
- **Level-By-Level Creation:** Children created in waves to ensure parent IDs exist (max 10 iterations)
- **Payment Structure Options:** 100_upfront, 50_50, 40_30_30, custom (with percentage-based milestones)

---

## 19. Testing

**Purpose:** QA testing system for deliverables. Three-stage testing pipeline (dev -> admin/int -> client) with auto-generated checklists, pass/fail tracking, and auto-blocker creation.

### Key Components

| Component | Description |
|-----------|-------------|
| `TestingQueue.tsx` | Queue of deliverables ready for testing |
| `TestingModal.tsx` | Testing interface with checklist, pass/fail, and submission |

### Server Actions

**testingActions.ts:**
- `getTestingQueueAction` - Get deliverables in testing queue
- `getProjectTestingInfoAction` - Get testing info for all deliverables in a project
- `startTestingAction` - Start a test session (creates or gets existing)
- `generateChecklistAction` - Auto-generate checklist based on deliverable context (voice/email/webhook/dashboard templates)
- `updateChecklistItemAction` - Mark checklist item pass/fail (with optional failure reason and screenshot)
- `submitTestAction` - Submit test results (creates blockers for failed items)
- `addChecklistItemAction` - Add custom checklist item
- `deleteChecklistItemAction` - Delete checklist item
- `escalateClientTestAction` - Admin/INT escalates to client testing
- `getTestSessionAction` / `getOrCreateTestSessionAction` / `startTestingSessionAction` - Session management
- `submitTestResultsAction` - Alternative submit with auto hill position progression:
  - Dev test passes -> stays at 90%
  - Admin/INT test passes -> auto to 95%
  - Client test passes -> auto to 100%

### API Functions Used

- `lib/api/testing.ts` - Test session CRUD, checklist management, result submission
- `lib/api/testing-notifications.ts` - Stage-specific notifications (notifyDevTestingReady, notifyAdminIntTestingReady, notifyClientTestingReady, notifyTestingPassed, notifyTestingFailed, notifyTestingEscalated)
- `lib/api/projects.ts` - Project lookup for deliverable context

### Database Tables

- `test_sessions` - Test session records (deliverable_id, stage, status, started_at, completed_at, notes)
- `test_checklist_items` - Individual checklist items (category, description, passed, failure_reason, screenshot_url, is_auto_generated)
- `blockers` - Auto-created from failed test items

### Special Patterns

- **Three-Stage Pipeline:** dev -> admin_int -> client (progressive quality gates)
- **Auto-Generated Checklists:** Context-based templates for voice, email, webhook, dashboard, and default deliverables
- **Checklist Categories:** functional, edge_cases, integration, security, ui_responsive
- **Auto-Blocker Creation:** Failed checklist items can auto-create blockers in the blocker system
- **Hill Chart Integration:** Test results auto-progress hill chart position (90% -> 95% -> 100%)
- **Hill Chart Trigger:** Deliverables reaching 90% hill position auto-create a test session via `ensureTestSessionForDeliverable`
- **Notification Pipeline:** Each stage transition sends targeted notifications to the next tester role

---

## Cross-Feature Integration Map

| Feature A | Feature B | Integration |
|-----------|-----------|-------------|
| Inquiries | Projects | Inquiry conversion creates project |
| Inquiries | Blueprints | Inquiries reference blueprints, import tiers |
| Inquiries | Opportunities | Create opportunity from inquiry |
| Projects | Conversations | Project-scoped conversations |
| Projects | Testing | Hill chart 90%+ triggers test sessions |
| Projects | Dev Logging | Daily check-ins update hill positions |
| Projects | Finances | Payment milestones per project |
| Opportunities | Dev | Dev browses and bids on opportunities |
| Opportunities | Admin | Admin creates and manages opportunities |
| Organizations | Onboarding | Invitation flow leads to org membership |
| Blueprints | Case Studies | Case studies linked to blueprints |
| Suggestions | Conversations | Suggestions use conversation system |
| Testing | Projects | Test results update hill chart, create blockers |
| Dev | Projects | Task queue references project deliverables |
| Settings | All | Profile/preferences affect all features |
| Notifications | All | Created by project, blocker, testing, extension events |

---

## Database Table Summary

| Table | Primary Feature | Also Used By |
|-------|----------------|--------------|
| `inquiries` | Inquiries | Project Initiation |
| `inquiry_comments` | Inquiries | - |
| `proposal_deliverables` | Inquiries | Project Initiation |
| `projects` | Projects | All |
| `deliverables` | Projects | Testing, Dev, Hill Chart |
| `deliverable_position_history` | Projects | Dev Logging |
| `project_requirements` | Projects | - |
| `onboarding_requirements` | Projects, Project Initiation | - |
| `project_files` | Projects | - |
| `project_delays` | Projects | - |
| `project_extensions` | Projects | - |
| `scope_baselines` | Projects | - |
| `scope_changes` | Projects | - |
| `activity_log` | Projects, Admin | - |
| `conversations` | Conversations | Suggestions |
| `messages` | Conversations | - |
| `message_attachments` | Conversations | - |
| `notifications` | Notifications | All features |
| `blueprints` | Blueprints | Inquiries |
| `case_studies` | Case Studies | Blueprints |
| `suggestions` | Suggestions | - |
| `organizations` | Organizations | - |
| `organization_members` | Organizations | - |
| `invitations` | Organizations | - |
| `profiles` | Settings, Auth | All features |
| `blockers` | Dev | Testing |
| `dev_task_queue` | Dev | - |
| `dev_skills` | Developer | - |
| `dev_checkins` | Dev Logging | - |
| `test_sessions` | Testing | Projects |
| `test_checklist_items` | Testing | - |
| `invoices` | Admin, Finances | Payments |
| `payouts` | Finances | - |
| `retainers` | Finances | - |
| `expenses` | Admin | - |
| `payment_milestones` | Admin, Project Initiation | Projects |
| `dev_opportunity_bids` | Opportunities | - |
| `brief_extractions` | Opportunities | - |
