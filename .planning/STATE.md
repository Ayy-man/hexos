# Project State

**Milestone:** v1.0 Polish
**Repository:** hexos-main
**Last Updated:** 2026-02-22

---

## Current Position

Phase: 16 of 16 (notification-coverage-overhaul)
Plan: 02 of 5
Status: In progress
Last activity: 2026-02-22 - Completed 16-02: Inquiry/proposal lifecycle notifications + @mention DB trigger

Progress: [========================================] 100%
         Phase 01: 01, 02 complete
         Phase 02: 01 complete
         Phase 03: 01, 02 complete (verified)
         Phase 04: 01 complete (verified)
         Phase 05: 01, 02, 03 complete
         Phase 06: 01, 02, 03 complete (PHASE COMPLETE)
         Phase 07: 01, 02 complete (PHASE COMPLETE)
         Phase 08: 01 complete (verified)
         Phase 09: 01, 02, 03 complete (PHASE COMPLETE)
         Phase 10: 01, 02, 03, 04, 05 complete (PHASE COMPLETE)
         Phase 11: 01, 02 complete (PHASE COMPLETE)
         Phase 12: design complete (PHASE COMPLETE)
         Phase 13: 01, 02 complete (PHASE COMPLETE)
         Phase 14: 01, 02, 03, 04, 05 complete (PHASE COMPLETE)
         Phase 15: 01, 02, 03, 04, 05, 06, 07 complete (PHASE COMPLETE)
         Phase 16: 01, 02 complete

## Completed Work

| Phase | Plan | Summary | Commit |
|-------|------|---------|--------|
| 01-critical-bugs | 01 | Storage RLS policies for general-purpose bucket | 84f6613 |
| 01-critical-bugs | 02 | DFY error handling - structured results for triggerParseDeliverablesAction | 951c17f, 9060c9b, 80f45ab |
| 02-code-cleanup | 01 | Remove unused placeholder features (team, time reports) | 139abb8 |
| 03-form-input-fixes | 01 | Blueprint form input fixes (pricing tiers, base price) | 4eff661 |
| 03-form-input-fixes | 02 | Apply currency input pattern to all HIGH priority files | 829d929, 484e7b7 |
| 04-branding-pdf-polish | 01 | Remove hexOS branding from PDF/web, verify button/pricing | 3a29adc |
| 05-sidebar-dashboard | 01 | Reorder sidebar navigation (Blockers first) | 042c80d |
| 05-sidebar-dashboard | 02 | Sync DFY dashboard to hill chart progress | 32ed350 |
| 05-sidebar-dashboard | 03 | Inquiry status tooltips for sidebar | bb65488 |
| 06-blueprints-case-studies | 01 | Database & API foundation for Loom video support | 4f56c84, d21d847, 2ac867e |
| 06-blueprints-case-studies | 02 | LoomVideoEmbed component and form integration | 5278d09, 0d6a1aa, fb4ede3 |
| 06-blueprints-case-studies | 03 | RelatedCaseStudies component and blueprint detail page enhancements | 4b31039, b77400e |
| 07-finance-tab-redesign | 01 | Finance tab 3-section layout with compact cards | 044497d, 2d479a5 |
| 07-finance-tab-redesign | 02 | Polish color coding & visual verification | N/A (verification only) |
| 08-testing-tab-polish | 01 | Testing tab reorder, project-scoped queue, error UI | b3157c5, 9fac606 |
| 09-suggestion-box-expansion | 01 | Suggestion conversation infrastructure (trigger, RLS, types) | 91f1d4a, 7e9eac0 |
| 09-suggestion-box-expansion | 02 | Suggestion conversation API functions and status notifications | f5d8678, adf98f3 |
| 09-suggestion-box-expansion | 03 | My Suggestions page and sidebar link | 2260e0f |
| 10-opportunities-overhaul | 01 | Bidding system tables, brief cache, API modules | 66d71a7, d81ee92, b929b4b |
| 10-opportunities-overhaul | 02 | Bidding UI & actions (BidForm, BidCard, BidList) | 37d7376, 6579d73, 4fac77d |
| 10-opportunities-overhaul | 03 | AI brief generation endpoint, actions, RedactedBriefCard | 1e75c29, 791fc0a, 34821cb |
| 10-opportunities-overhaul | 04 | Pre-commitment API, actions, and UI components | 5588d45, 1789395, 66ce2c1 |
| 10-opportunities-overhaul | 05 | Dashboard integration (weeks display, bid counts, admin tabs) | 7590abe, 3b5fbd0, 34a711e, 628bf5c |
| 11-notification-system-audit | 01 | Toast notification deduplication infrastructure | b683ebc, aca4655 |
| 11-notification-system-audit | 02 | Toast deduplication fix and trigger documentation | 44c7bb0, 336e509 |
| 13-email-delivery-resend | 01 | Resend SDK integration with working sendEmail | a23f855, aab07b9, 1c285b5 |
| 13-email-delivery-resend | 02 | React Email templates and action wiring | a614973, 86308ae, 1149992 |
| 15-meeting-assistant | 01 | Meeting assistant database schema and Recall.ai client | 45c50d3, 44a0dbc |
| 15-meeting-assistant | 02 | Meeting CRUD API with bot dispatch and meeting links | 6f97469, 8190513 |
| 15-meeting-assistant | 03 | Webhook handler & AI transcript processing pipeline | 00a1c28 |
| 15-meeting-assistant | 04 | Meeting task CRUD API with CSV import/export and task-to-deliverable conversion | 20473cb, ddbbf90 |
| 15-meeting-assistant | 06 | Tabbed meeting detail interface with AI summary, searchable transcript, video playback, and link management | 4e8a10b |
| 15-meeting-assistant | 05 | Meetings list page with status filters, create dialog, and sidebar navigation | 305ca33, 851b8b1 |
| 15-meeting-assistant | 07 | Task management UI with CSV import/export, realtime updates, project/meeting integration | c524138, 8ad7bf8, a955099, 45b1a1c, 0100c22, 38f52be, 906d312, fefa96c |
| 14-offboarding-retainer-system | 01 | Database foundation with retainer tables, extended project_status enum, TypeScript types for retainer phase | 3461e62, 3d8d648 |
| 14-offboarding-retainer-system | 02 | Projects page with Active/Retainer/Completed tabs, CloseProjectDialog, completion ceremony | 7a1cc8a, 075a7ef |
| 14-offboarding-retainer-system | 03 | Complete API layer with check-ins, tasks, and retainer config with cascading dev updates | 3da9b22, 28adbd0 |
| 14-offboarding-retainer-system | 04 | Complete retainer UI with check-ins timeline, grouped task management, admin config, and dashboard cards | e6186b7, 5495da3 |
| 14-offboarding-retainer-system | 05 | Future Improvements backlog with multi-select bundling, available on all projects regardless of status | 0a0a2f2, 24639e9 |
| 16-notification-coverage-overhaul | 01 | DB enum sync (38 idempotent ADD VALUE blocks), notifyAdmins/notifyProjectStakeholders/notifyUsers helpers, eliminated as-never casts and raw inserts | 8d9dcb6, b7bf380 |
| 16-notification-coverage-overhaul | 02 | notifyAdmins() in 5 inquiry/proposal lifecycle functions (createInquiry, submitProposalToDfy, markInquiryAsClosed, markProposalLost, escalateToAdmin); @mention DB trigger on message_mentions | 065af01, e0310f0 |

## Accumulated Decisions

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 03-01 | Use type="text" + inputMode="decimal" for currency inputs | Prevents leading zero issue (typing "250" shows "0250" with type="number") |
| 03-01 | Keep estimatedHours as type="number" | Small integers have less leading zero problems |
| 03-01 | Use regex replace(/[^0-9.]/g, '') for sanitization | Only allows numbers and decimal point |
| 03-02 | Keep qty input as type="number" | Small integers don't have leading zero issues |
| 05-01 | Blockers first in Admin group | High-priority items should be visible first |
| 05-02 | Import calculateHillChartProgress from projects feature | Reuse existing hill chart calculation logic |
| 06-01 | Manual type definitions in API layer | Project pattern - no generated Supabase types |
| 06-01 | Empty string valid for isValidLoomUrl | Optional field handling |
| 06-02 | LoomVideoEmbed returns null for invalid URLs | Graceful degradation, no broken iframes |
| 06-02 | 16:10 aspect ratio (paddingBottom 62.5%) | Matches Loom default video dimensions |
| 06-02 | Live preview only when URL is non-empty AND valid | Clear feedback for user |
| 06-03 | RelatedCaseStudies returns null when empty | No placeholder card, clean UI when no linked content |
| 06-03 | Loom video in main content, related case studies in sidebar | Follows existing blueprint detail page layout patterns |
| 07-01 | 5-column grid for Revenue, 4-column for Costs/Timeline | Match card count to grid columns |
| 07-01 | Conditional color coding: green positive, red negative, orange warning | Clear financial status at a glance |
| 07-01 | Compact card py-3 pattern | Consistent with admin page design system |
| 02-01 | Combined 3 tasks into single commit | Tasks form cohesive dead code removal |
| 02-01 | Kept getAllDevs in admin-reports.ts | Function used by /admin/devs page |
| 05-03 | Combined stages for tooltip: working = working + in_queue + admin_reviewed | Show active work in single "Working" count |
| 05-03 | Total excludes closed and lost | Active pipeline only for quick status check |
| 08-01 | Server-side filtering over client-side | More efficient, reduces data transfer, prevents stale data |
| 08-01 | Optional parameter for project-scoped queries | Maintains backward compatibility while enabling scoping |
| 01-02 | Return { data?, error? } instead of throwing in server actions | Next.js production builds scrub error details from thrown exceptions |
| 01-02 | Log full error details server-side before returning | Preserve stack traces for debugging while giving users clean messages |
| 01-02 | Empty results are not errors | Return { deliverables: [] } and let UI show info toast |
| 04-01 | Remove all hexOS branding (not conditional) | User preference: fully white-labeled exports regardless of partner logo |
| 11-01 | Database-backed toast tracking over client-side storage | Ensures deduplication works across tabs and page refreshes |
| 11-01 | Partial index with dual NULL filter | Optimal query performance for unread + unshown filtering |
| 11-01 | 5-minute default window for initial toast display | Prevents showing old notifications as urgent toasts |
| 11-02 | Client-side Supabase update for toast marking | Server functions can't be called from client components |
| 11-02 | void keyword for fire-and-forget promises | TypeScript compatible pattern for PromiseLike types |
| 11-02 | Triple filter for toast eligibility | !read_at && !shown_as_toast_at && recent ensures no duplicates |
| 09-01 | Follow inquiry conversation pattern exactly | Ensures consistency with existing codebase patterns |
| 09-01 | Place suggestion RLS check before project logic | Suggestion conversations have null project_id |
| 09-01 | Route suggestion notifications to /my-suggestions | Dedicated URL for suggestion notifications |
| 10-01 | DECIMAL(3,1) for weeks estimates | Allows half-week precision (e.g., 2.5 weeks) |
| 10-01 | SHA256 input hash for brief cache | Detect when source data changes to invalidate stale cache |
| 10-01 | 7-day default TTL for AI briefs | Balance cache freshness with AI cost savings |
| 10-01 | Keep estimated_hours alongside weeks | Backward compatibility with existing opportunities |
| 09-02 | Follow getInquiryConversations pattern for getSuggestionConversations | Consistency with codebase patterns |
| 09-02 | Trigger notification only when status field is in update input | Prevents duplicate notifications on admin_notes-only updates |
| 10-04 | CommitmentStatus type includes null as explicit value | Explicit null vs undefined for DB compatibility |
| 10-04 | committed_at only set when status is 'committed' | Tracks when actual commitment happened |
| 10-04 | toggleInterestAction prevents toggling committed status | Prevents accidental uncommit via quick toggle |
| 10-04 | Note field only shown for interested/committed states | No need to explain why not interested |
| 10-02 | Dropdown menu for admin bid actions | Compact UI, clear action hierarchy |
| 10-02 | Color-coded weeks difference | Quick visual feedback on timeline proposals |
| 10-02 | Optimistic updates with rollback | Better UX, immediate feedback |
| 10-03 | Redact client names, prices, URLs, addresses | Protect sensitive client info from developers |
| 10-03 | Keep industry, problem type, tech stack | Developers need this info to evaluate opportunity fit |
| 10-03 | Hash comparison for cache validity | Detect source data changes without regenerating every time |
| 10-03 | Return null on error in getBriefForOpportunityAction | Graceful degradation, UI can show fallback |
| 10-05 | Extended existing OpportunityCard instead of creating new DevOpportunityCard | Kept codebase DRY since card structure was already good |
| 10-05 | Lazy loading for admin tabs | Prevents loading bids/briefs/committed devs until user clicks tab |
| 10-05 | formatDuration priority: weeks > hour range > single hours > TBD | Clear fallback chain for duration display |
| 13-01 | Used pnpm for installation due to npm cache permission issues | npm arborist errors required alternative package manager |
| 13-01 | Temporary HTML templates as placeholders for React Email | Plan 02 will replace with React Email components |
| 13-01 | EMAIL_FROM uses RESEND_FROM_EMAIL env or falls back to hexOS address | Configurable sender with sensible default |
| 13-02 | Async renderEmailTemplate for React Email render() | render() returns Promise, must await |
| 13-02 | Handle Supabase join results as array or object | Join queries may return different shapes depending on cardinality |
| 15-01 | Admin-only RLS policies for V1 - all meeting tables restricted to admin role | Simplifies initial implementation, can be expanded when dev/DFY partner visibility needed |
| 15-01 | Polymorphic meeting_links table without FK constraints on linkable_id | Prevents invalid cascades for project/inquiry/conversation polymorphic references |
| 15-01 | Fetch-based Recall.ai client (no official SDK) following resend.ts singleton pattern | Lightweight wrapper around fetch with Token authentication |
| 15-01 | JSONB storage for transcript segments and key decisions | Structured queries while maintaining flexibility for AI extraction results |
| 15-02 | Graceful bot dispatch failure in createMeeting | Returns meeting with 'pending' status if Recall.ai bot dispatch fails, doesn't fail the whole operation |
| 15-02 | Platform detection returns 'other' for unrecognized URLs | Accept any URL instead of null - supports arbitrary meeting tools |
| 15-02 | getMeetingsForEntity enables project/inquiry tabs | Dedicated function for fetching meetings linked to specific entity without complex joins |
| 15-04 | CSV export returns Content-Disposition header | Ensures browser treats response as downloadable file |
| 15-04 | Import uses best-effort ILIKE matching | Matches assigned_to names to profiles via display_name/email search |
| 15-04 | Task-to-deliverable conversion rolls back on failure | Creates deliverable first, deletes if link fails |
| 15-04 | Auto-manage completed_at on status change | Set timestamp when status becomes 'done', clear when status changes from 'done' |
| 15-03 | Inline processing in webhook handler (not async queue) | Accept timeout risk - Recall.ai will retry. V1 optimization for simplicity |
| 15-03 | Best-effort profile matching via ILIKE on name | Don't fail task creation if no match - store assigned_to_name as fallback |
| 15-03 | Transform Recall.ai transcript format to normalized TranscriptSegment[] | Handle multiple possible formats (word-level vs segment-level) from Recall.ai |
| 15-03 | Use Claude 3.5 Haiku for extraction (not Opus) | Fast, cheap, sufficient for structured extraction - following generate-brief pattern |
| 15-03 | Store summary as markdown bullets (joined array) | TEXT column more compatible than JSONB for summary bullets, easier to display |
| 15-03 | Create meeting_participants from unique speakers automatically | Provides participant list even without email matching, can be manually enhanced later |
| 15-03 | meeting_ready notification routes to /meetings list page | V1 simplification - no meeting detail page yet, message includes title for findability |
| 15-04 | Import accepts context query params | meeting_id/project_id/inquiry_id can be applied to all imported tasks |
| 15-05 | Client-side status filtering for meetings | Small dataset, no need for server-side filtering in V1 |
| 15-05 | Pulse animation for recording status | Visual indicator for active meetings, draws attention to live recordings |
| 15-05 | Platform text labels (not icons) | Simpler than platform-specific icons for V1, clear and accessible |
| 15-05 | Admin-only meetings navigation | V1 scope - dev/DFY/client visibility can be added later as needed |
| 15-06 | Client-side transcript search | Meeting transcripts <500 segments typically, client filtering fast and simple |
| 15-06 | Link picker fetches all projects/inquiries | Small datasets (<100 items), client-side search sufficient |
| 15-06 | HTML5 video element for recordings | Recall.ai URLs are standard video, native element provides controls |
| 15-06 | Participant profile links to /admin/devs | No individual profile pages in V1, list page sufficient |
| 14-01 | TEXT CHECK constraint for check_in_cadence | Simpler than new enum for 3 fixed values (weekly/biweekly/monthly) |
| 14-01 | Role-based check_in_assignees array | Store role strings not user IDs - roles expand to current team |
| 14-01 | Allow retainer_tasks on completed projects | Support post-completion work tracking beyond retainer phase |
| 14-01 | Retainer phase between delivery and closed | Represents ongoing maintenance state before final closure |
| 14-01 | JSONB completion_summary | Flexible structure for completion ceremony without rigid schema |
| 14-02 | Three main tabs (Active/Retainer/Completed) replace Active/Archived toggle | Lifecycle stages are mutually exclusive categories, better as tabs |
| 14-02 | Client-side filtering by status category | All three tabs fetch active projects, filter by getStatusCategory - simpler than three queries |
| 14-02 | Retainer color matches in_progress (cyan) | Retainer is ongoing work, not a terminal state like completed |
| 14-02 | JSONB completion_summary instead of rigid schema | Flexible structure allows adding fields without migrations |
| 14-02 | Check-in assignees as role strings | Roles expand to current team - more flexible than user IDs |
| 14-02 | Team members snapshot in completion summary | Preserves who worked on project even if assignments change later |
| 14-03 | Calculate due date from last check-in + cadence, fallback to retainer_started_at | Ensures due date always calculable |
| 14-03 | Notify all admins for any non-green health status | Simplified health warning logic - no per-admin config needed for V1 |
| 14-03 | Auto-manage completed_at in updateRetainerTask | When status changes to/from 'done', timestamp set/cleared automatically |
| 15-07 | TaskList client-side filtering for status/priority | Small dataset (<100 tasks/meeting), no server-side filtering needed |
| 15-07 | TaskRow inline editing with form replacement | Edit button expands row into form with save/cancel - explicit user intent |
| 15-07 | Single-meeting realtime hook for detail page | Simpler API than multi-meeting subscription, follows use-notifications-realtime pattern |
| 15-07 | Meetings tab in admin-only More dropdown | Consistent with sidebar navigation and V1 admin-only scope |
| 14-03 | Task ordering priority: status → priority → created_at | Ensures active todos surface first |
| 14-03 | Unassign removed dev tasks | When dev removed from retainer_dev_ids, automatically unassign their tasks |
| 14-04 | Lazy loading for tab data | CheckInsTab/RetainerTasksTab only fetch data when tab is activated to avoid unnecessary API calls |
| 14-04 | Done tasks collapsed by default | Keep UI clean for active work items, user can expand to see completed tasks |
| 14-04 | Health dots use colored circles | Simple 12px colored circles (green/yellow/red) instead of icons for quick visual scanning |
| 14-04 | Development tabs hidden for retainer/completed | Progress, Testing, Deliverables, Requirements, Scope tabs completely hidden (not just disabled) to simplify UI |
| 14-04 | Retainer tab uses dashboard cards | Projects page Retainer tab renders grid of cards instead of table for better health/task visibility |
- [Phase 16-01]: Webhook context uses admin client loop for notification insert — createNotification requires cookie-based auth unavailable in webhook route handlers
- [Phase 16-01]: Extension notifications use status_change type — legacy extension_requested/approved/rejected types not in TS union, avoiding new enum values
- [Phase 16-01]: notifyAdmins/notifyProjectStakeholders use Promise.allSettled for fire-and-forget semantics — partial failures don't block callers
- [Phase 16-02]: DB trigger uses raw INSERT into notifications for @mentions — triggers run without HTTP session/cookies so createNotification() unavailable; push notifications for mentions deferred to V1.1
- [Phase 16-02]: SELECT expanded in markInquiryAsClosed and markProposalLost to include prospect_company_name — required for notification messages
- [Phase 16-02]: escalateToAdmin() now fetches auth user and inquiry name — previously had no auth context; needed for actorId and notification message

## Patterns Established

| Pattern | Description | First Used |
|---------|-------------|------------|
| Currency input | type="text" + inputMode="decimal" + regex sanitization | 03-01 |
| Textarea Enter key | onKeyDown with stopPropagation for Enter | 03-01 |
| Sectioned KPI layout | Section header (icon + label) + grid of compact cards | 07-01 |
| Compact stat card | Card className="py-3" with p-0 px-4 CardContent | 07-01 |
| Conditional color styling | cn() with ternary for green/red/orange variants | 07-01 |
| Dead route cleanup | When removing routes, also clean navigation, command palette, breadcrumbs, revalidatePath | 02-01 |
| Loom URL validation | Regex pattern for share/embed URLs with optional params | 06-01 |
| Rich sidebar tooltip | Custom tooltip content for sidebar items with additional data | 05-03 |
| Conditional badge | Show badge only when count > 0 | 05-03 |
| Project-scoped queries | Optional projectId parameter to filter at server level | 08-01 |
| Error state with retry | useState for error, clear before try, set in catch, Button to retry | 08-01 |
| Responsive iframe embed | paddingBottom % on parent + absolute positioning on iframe | 06-02 |
| Optional form validation | const isValid = !value \|\| validateFn(value) for optional fields | 06-02 |
| Graceful empty state component | Return null instead of placeholder when no content | 06-03 |
| Sidebar related content | Clickable cards with icon, name, subtitle, arrow navigation | 06-03 |
| Structured server action results | Return { data?, error? } instead of throwing for user-facing errors | 01-02 |
| White-label exports | Remove platform branding for client-facing outputs (PDF, web) | 04-01 |
| Toast deduplication | Database-backed shown_as_toast_at column with partial index | 11-01 |
| Time-windowed initial queries | Use cutoff timestamp for recent-only filtering | 11-01 |
| Fire-and-forget client updates | void supabase.update().eq() for non-blocking DB writes | 11-02 |
| Conversation type extension | ALTER TYPE + column + unique index + trigger + RLS function update + backfill | 09-01 |
| Notification type extension | type union + getNotificationIcon() + getNotificationColor() + getNotificationUrl() | 09-01 |
| Bid normalization | normalizeBidRelations for joined dev/opportunity relations | 10-01 |
| Cache expiry filter | expires_at with gt() filter for valid cached items | 10-01 |
| Web Crypto SHA256 | crypto.subtle.digest for hash generation (Node 15+ compatible) | 10-01 |
| Status-change notification | Conditional notification trigger when status field changes | 09-02 |
| Commitment upsert | Check existing preference, update or insert accordingly | 10-04 |
| Status badge with config | statusConfig object mapping status to icon/label/className | 10-04 |
| RadioGroup with descriptions | Radio options with title and description text | 10-04 |
| Optimistic UI with rollback | useState for local state, update optimistically, revert on error | 10-02 |
| Collapsible long content | Collapsible component for text > threshold characters | 10-02 |
| Sorted list with useMemo | useMemo for computed sorted arrays with sort option state | 10-02 |
| AI brief generation | OpenRouter + Claude 3.5 Haiku with structured tool calling | 10-03 |
| Complexity color coding | emerald/amber/red for low/medium/high complexity | 10-03 |
| Lazy tab data loading | Load data only when tab is activated via useEffect | 10-05 |
| formatDuration helper | Centralized duration display with weeks/hours fallback | 10-05 |
| Email client singleton | Export resend instance from lib/email/resend.ts | 13-01 |
| Email error handling | try/catch with console.error logging, return false on failure | 13-01 |
| React Email templates | Inline styles, consistent color palette, preview text | 13-02 |
| Email send in actions | Fetch context (inviter profile, org name) before sending | 13-02 |
| Fetch-based third-party API client | getApiKey() + wrapper function + singleton export for APIs without SDKs | 15-01 |
| Admin-only V1 RLS | Single policy using get_user_role() = 'admin' for all operations | 15-01 |
| Polymorphic linking without FKs | linkable_type + linkable_id without FK constraints for flexibility | 15-01 |
| Graceful third-party API failure | Try external API call but don't fail operation if unavailable - return with fallback status | 15-02 |
| CSV export with file download | GET endpoint returns Response with text/csv Content-Type and Content-Disposition | 15-04 |
| CSV import with validation | POST with formData, parse with validation, return {imported, skipped, errors} | 15-04 |
| Task conversion with rollback | Create target entity, link back, rollback on failure for consistency | 15-04 |
| Webhook Svix verification | Read raw body, verify signature with Svix SDK, return 200 for all events | 15-03 |
| Inline webhook processing | Accept timeout risk for processing in webhook handler, rely on automatic retries | 15-03 |
| AI transcript extraction | OpenRouter + Claude with structured JSON response_format for data extraction | 15-03 |
| Best-effort name matching | ILIKE profile search, store original if no match, don't fail operation | 15-03 |
| Transcript format normalization | Transform varying input formats to consistent internal schema | 15-03 |
| Status badge with pulse animation | Dual-span technique with animate-ping + solid dot for active states | 15-05 |
| Client-side list filtering | Badge-based filter UI for small datasets | 15-05 |
| Responsive meeting list | Cards on mobile, table on desktop with Tailwind md: utilities | 15-05 |
| Admin-only navigation | Sidebar entries restricted by role (adminNav/internalNav only) | 15-05 |
| Retainer config as inline columns | Nullable retainer-specific fields on projects table rather than separate config table | 14-01 |
| Post-delivery lifecycle | accepted->retainer->completed or accepted->completed (direct close) | 14-01 |
| Retainer reactivation | completed->retainer allows converting closed projects to ongoing retainer | 14-01 |
| Tab-based view filtering | Badge-based tab navigation with URL query params for view state | 14-02 |
| Multi-step dialog | Option selection → conditional form → confirmation pattern | 14-02 |
| JSONB completion ceremony | Generate summary with deliverables, timeline, team on project completion | 14-02 |
| Cadence-based due date calculation | Calculate next due date from last check-in timestamp + cadence days (weekly=7, biweekly=14, monthly=30) | 14-03 |
| Status-driven timestamp management | Auto-set completed_at when status becomes 'done', clear when status changes from 'done' | 14-03 |
| Health-triggered notifications | Send retainer_health_warning to all admins when health is not green | 14-03 |
| Task inline editing pattern | Edit form replaces row, save/cancel buttons, checkbox for quick status toggle | 15-07 |
| CSV import dialog pattern | File preview, result summary with imported/skipped counts, error list display | 15-07 |
| Supabase realtime subscription | createClient from client lib, channel.on('postgres_changes'), cleanup in useEffect | 15-07 |
| Lazy tab data loading | useState + useEffect pattern for fetching data only when tab activated, prevents unnecessary API calls | 14-04 |
| Phase-based tab visibility | Use isRetainerPhase/isPostDeliveryPhase helpers to show/hide tabs based on project lifecycle state | 14-04 |
| Health indicator dots | Colored circles (12px, green/yellow/red) with cn() for conditional styling based on check-in health status | 14-04 |
| Retainer dashboard cards | Compact Card with py-3, health dot, relative times, overdue badges, team avatars | 14-04 |
| Collapsible sections | Use Collapsible for done tasks and long notes to keep UI clean by default | 14-04 |

## Blockers/Concerns

None.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 001 | Fix testing modal null crash + add manual checklist items | 2026-02-09 | 2585fbb | [001-fix-testing-modal-manual-items](./quick/001-fix-testing-modal-manual-items/) |

## Session Continuity

Last session: 2026-02-22 21:25:00 UTC
Stopped at: Completed 16-02-PLAN.md
Resume file: None

### Roadmap Evolution

- Phase 15 added: Meeting Assistant — Recall.ai bot + Claude AI transcription + first-class tasks with CSV import/export

---

*Auto-updated by plan executor*
