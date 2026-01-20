---
phase: 10-opportunities-overhaul
plan: 05
subsystem: opportunities
tags: [bidding, dev-dashboard, admin-dashboard, weeks-display, ui-integration]
completed: 2026-01-20

dependency_graph:
  requires: ["10-01", "10-02", "10-03", "10-04"]
  provides:
    - dev-opportunities-page
    - admin-opportunity-detail-tabs
    - weeks-duration-display
    - bid-count-display
  affects: []

tech_stack:
  added: []
  patterns:
    - lazy-loading-admin-tabs
    - formatDuration-helper

key_files:
  created:
    - app/(dashboard)/dashboard/dev/opportunities/page.tsx
    - features/dev/components/DevOpportunitiesContent.tsx
  modified:
    - lib/api/project-invitations.ts
    - features/dev/components/OpportunityCard.tsx
    - features/dev/components/OpportunityDetailModal.tsx
    - features/admin/components/AdminOpportunitiesContent.tsx
    - features/admin/actions/opportunityActions.ts

decisions:
  - id: dev-oppcard-extend
    decision: Extended existing OpportunityCard instead of creating new DevOpportunityCard
    rationale: Existing card had good structure; added bid counts, commitment status, and formatDuration

metrics:
  duration: 25min
  tasks: 4/4
  commits: 4
---

# Phase 10 Plan 05: Dashboard Integration Summary

**One-liner:** Integrated bidding system components into admin and dev dashboards with weeks display and bid counts

## What Was Built

### 1. Project Invitations API Updates
Extended the API to support weeks-based duration display and bid counts:
- Added `estimated_weeks`, `estimated_hours_min`, `estimated_hours_max` to `ProjectOpportunity` interface
- Added `bids_count` to interface for display in cards
- Updated all opportunity queries to include bid count aggregation via `bids:dev_opportunity_bids(count)`
- Added `formatDuration()` helper function for consistent duration display across UI

### 2. Dev Opportunities Page
Created new page at `/dashboard/dev/opportunities`:
- Fetches opportunities with `getOpportunitiesForDev()` and existing bids with `getMyBids()`
- Grid layout with filtering (starred/hidden) and sorting
- Shows DevOpportunitiesContent component with bid dialog integration

### 3. Extended OpportunityCard
Updated existing OpportunityCard component:
- Duration display uses `formatDuration()` instead of raw hours
- Shows bid count badge when bids exist
- Shows commitment status badge when dev has pre-committed
- Added `hasExistingBid` prop to show "Bid submitted" badge

### 4. Admin OpportunityDetailModal with Tabs
Extended the modal to support admin-only functionality:
- `isAdmin` prop controls visibility of admin tabs
- **Details Tab:** Full opportunity information with formatDuration
- **Bids Tab:** Lazy-loaded BidList component showing all bids
- **Brief Tab:** RedactedBriefCard with generate/regenerate capability
- **Committed Devs Tab:** List of developers who pre-committed with their notes
- Lazy loading: Data fetched only when tab is activated

### 5. Weeks Input in Opportunity Forms
Updated opportunity creation form:
- Added `estimated_weeks` input field (primary duration, step=0.5)
- Kept hours as optional fallback estimate
- Updated form to pass weeks to API
- Updated `createOpportunity` API function to store weeks fields

## Commits

| Hash | Description |
|------|-------------|
| 7590abe | Add weeks fields, bid counts, and formatDuration helper |
| 3b5fbd0 | Create dev opportunities page with bidding integration |
| 34a711e | Extend OpportunityDetailModal with admin tabs |
| 628bf5c | Add weeks input to opportunity creation form |

## Decisions Made

1. **Extended existing OpportunityCard** instead of creating separate DevOpportunityCard - kept codebase DRY since the card structure was already good
2. **Lazy loading for admin tabs** - prevents loading bids/briefs/committed devs until user clicks the tab, improving initial load performance
3. **formatDuration priority:** weeks > hour range > single hours > TBD

## Deviations from Plan

### Auto-fixed Issues
None - plan executed exactly as written.

## Testing Notes

To verify the integration:

1. **Dev Opportunities Page:**
   - Navigate to `/dashboard/dev/opportunities` as a dev user
   - Should see opportunity grid with duration in weeks format
   - Click "Bid" button to open bid form dialog
   - Bid counts should appear on cards with existing bids

2. **Admin Detail Modal:**
   - Navigate to `/admin/opportunities` as admin
   - Click dropdown > "View Details" on any opportunity
   - Should see 4 tabs: Details, Bids, Brief, Committed
   - Switching tabs should lazy-load data

3. **Opportunity Creation:**
   - Go to admin opportunities page
   - Click "Create Opportunity"
   - Should see "Estimated Weeks" as primary input field

## Integration Points

- `lib/api/project-invitations.ts` - Core API with formatDuration and bid counts
- `lib/api/bids.ts` - Bid operations (from plan 10-02)
- `features/opportunities/components/BidForm.tsx` - Bid submission (from plan 10-02)
- `features/opportunities/components/BidList.tsx` - Bid display (from plan 10-02)
- `features/opportunities/components/RedactedBriefCard.tsx` - Brief display (from plan 10-03)
- `features/opportunities/components/PreCommitmentTab.tsx` - Pre-commitment (from plan 10-04)

## Next Steps

Phase 10 is now complete. All bidding system components are integrated into the dashboards. The next phase should focus on:
- End-to-end testing of the complete bidding workflow
- Notification triggers when bids are submitted/reviewed
- Dashboard widgets showing bid activity
