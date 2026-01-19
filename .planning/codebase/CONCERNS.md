# Codebase Concerns

**Analysis Date:** 2026-01-19

## Tech Debt

**Email System Not Implemented:**
- Issue: Email functionality is stubbed out, only logging to console instead of sending actual emails
- Files: `lib/api/email.ts`, `features/organizations/actions/invitationActions.ts`
- Impact: Invitation emails, application confirmations, and notifications are never sent to users. Critical user flows are broken in production.
- Fix approach: Install Resend package (`npm install resend @react-email/components`) and implement actual email sending. 11 TODO comments mark all locations needing implementation.

**Pervasive `any` Type Usage:**
- Issue: Over 70 instances of `as any` or `: any` type assertions scattered throughout codebase
- Files: `lib/api/invoices.ts`, `lib/api/testing.ts`, `lib/api/payouts.ts`, `lib/db/offline-storage.ts`, `features/testing/actions/testingActions.ts`, `components/ui/sortable.tsx`
- Impact: Type safety is bypassed, runtime errors may go undetected, IDE autocomplete degraded
- Fix approach: Define proper TypeScript interfaces for Supabase query results, Plate editor values, and API responses. Start with `lib/api/` files which have the most `any` usage.

**Deprecated Code Still Present:**
- Issue: Deprecated functions and features remain in codebase with `@deprecated` annotations
- Files: `lib/api/admin-reports.ts` (time tracking functions), `lib/api/financial-metrics.ts` (getPendingPaymentsByProject)
- Impact: Dead code increases bundle size and confuses developers. Functions return empty arrays but are still called.
- Fix approach: Remove deprecated functions and their call sites. Time tracking was removed in Phase 4.2 but code remains.

**Incomplete Features with TODOs:**
- Issue: 14+ TODO comments marking unfinished functionality
- Files:
  - `features/organizations/actions/invitationActions.ts`: 10 TODOs for email sending
  - `components/ui/block-discussion.tsx:338`: "TODO: fix throw error"
  - `features/projects/components/tabs/RequirementsTab.tsx:419`: "TODO: Add action to uncomplete"
- Impact: Features appear complete in UI but silently fail. Users may not receive expected notifications.
- Fix approach: Prioritize email TODOs first (blocking), then address UI-related TODOs.

**Sequential Awaits in Loops:**
- Issue: Multiple `for...of` loops with `await` inside, causing sequential execution instead of parallel
- Files: `lib/stripe/server.ts:62-63`, `lib/push/send-notification.ts:84-86`, `lib/api/project-files.ts:391-393`, `lib/api/payouts.ts:333-334`
- Impact: Operations that could run in parallel (e.g., sending notifications to multiple users) run sequentially, causing slow performance
- Fix approach: Use `Promise.all()` with `.map()` for independent operations. Example: `await Promise.all(items.map(item => processItem(item)))`

## Known Bugs

**Uncomplete Requirement Not Implemented:**
- Symptoms: When toggling a completed requirement, shows toast "Uncomplete not implemented yet"
- Files: `features/projects/components/tabs/RequirementsTab.tsx:419-421`
- Trigger: Click on a completed requirement's checkbox to uncomplete it
- Workaround: None - requirement cannot be uncompleted once marked complete

**Block Discussion Error Handling Incomplete:**
- Symptoms: Potential silent failure when setting discussion paths
- Files: `components/ui/block-discussion.tsx:338`
- Trigger: Unknown - marked with "TODO: fix throw error"
- Workaround: None documented

## Security Considerations

**Test Credentials Hardcoded in Login Page:**
- Risk: Test user emails and passwords visible in production code
- Files: `app/(auth)/login/page.tsx:6-9`
- Current mitigation: Test accounts presumably only exist in dev database
- Recommendations: Move test credentials to environment variables or remove entirely from production builds. Consider feature flag to show/hide quick login.

**Admin Client Bypasses RLS:**
- Risk: Service role key usage bypasses all Supabase Row Level Security policies
- Files: `lib/supabase/admin.ts`, used in 20+ locations throughout `lib/api/` and `app/api/`
- Current mitigation: Admin client only used for system operations and admin actions
- Recommendations: Audit all `createAdminClient()` usages. Ensure each is necessary. Add comments explaining why RLS bypass is required. Consider using RPC functions with `security definer` instead where possible.

**Missing CRON_SECRET Validation:**
- Risk: Cron endpoint accepts empty bearer token if CRON_SECRET env var not set
- Files: `app/api/testing/check-escalations/route.ts:7`
- Current mitigation: None - falls back to empty string comparison
- Recommendations: Fail loudly if CRON_SECRET is not set in production. Return 500 error instead of relying on empty string match.

## Performance Bottlenecks

**Large Component Files:**
- Problem: Multiple files exceed 700+ lines, indicating complex components that are slow to parse and hard to maintain
- Files:
  - `app/(dashboard)/inquiries/[id]/page.tsx` (982 lines)
  - `lib/api/inquiries.ts` (958 lines)
  - `features/projects/components/tabs/DeliverablesTab.tsx` (870 lines)
  - `features/admin/components/ComprehensiveMetricsDashboard.tsx` (865 lines)
  - `features/admin/components/metrics/InvoiceManagement.tsx` (845 lines)
- Cause: Feature creep, lack of component extraction
- Improvement path: Extract sub-components. Split API functions into domain-specific files. Consider code splitting for admin dashboard.

**Excessive Console Logging:**
- Problem: 100+ console.log/error/warn statements throughout codebase
- Files: Distributed across `hooks/`, `lib/`, `features/`, `components/`
- Cause: Debug logging left in production code
- Improvement path: Implement proper logging service with log levels. Remove or convert console statements to structured logging.

**No Query Caching Strategy:**
- Problem: Each page load re-fetches data without client-side caching
- Files: All API functions in `lib/api/`
- Cause: No SWR/React Query/TanStack Query implementation
- Improvement path: Implement data caching layer. IndexedDB offline storage exists (`lib/db/offline-storage.ts`) but is underutilized.

## Fragile Areas

**Plate Editor Type Coercion:**
- Files: `features/case-studies/components/CaseStudyEditor.tsx`, `features/blueprints/components/BlueprintEditor.tsx`, `features/projects/components/gameplan/GameplanEditor.tsx`, `features/inquiries/components/ProposalTab.tsx`
- Why fragile: Content consistently cast with `as any` when passed to Plate editor
- Safe modification: Ensure content matches Plate's expected format. Test all document types after changes.
- Test coverage: None - no test files found in codebase

**Supabase Query Results:**
- Files: `lib/api/invoices.ts`, `lib/api/testing.ts`, `lib/api/payouts.ts`
- Why fragile: Query results type-cast to `any` throughout, then manually mapped. Changes to database schema won't be caught by TypeScript.
- Safe modification: Regenerate Supabase types after schema changes. Update type assertions to match.
- Test coverage: None

**Invitation System:**
- Files: `lib/api/invitations.ts` (661 lines), `features/organizations/actions/invitationActions.ts` (475 lines)
- Why fragile: Complex invitation flow with multiple types (admin, dfy_first, dfy_team, dev, dev_team). Email sending not implemented but code assumes it works.
- Safe modification: Test all invitation types manually. Verify database state after each action.
- Test coverage: None

## Scaling Limits

**Offline Storage:**
- Current capacity: IndexedDB with no size limits configured
- Limit: Browser-imposed IndexedDB quotas (~50MB-2GB depending on browser)
- Scaling path: Implement storage quota monitoring. Add cleanup for old cached data. Currently only caches "Last 50 messages" per conversation.

**Push Notifications:**
- Current capacity: Sequential sending to all user subscriptions
- Limit: Slow for users with many devices or when notifying many users
- Scaling path: Batch notifications, use message queue, implement rate limiting

## Dependencies at Risk

**No Critical Dependency Risks Identified**
- All major dependencies are well-maintained
- Next.js 16.1.0, React 19.2.3, Supabase 2.89.0 are current
- Plate.js at v52 (active development)

## Missing Critical Features

**No Automated Testing:**
- Problem: Zero test files found in codebase
- Blocks: Safe refactoring, confidence in deployments, catching regressions
- Note: Glob search for `*.test.{ts,tsx}` and `*.spec.{ts,tsx}` returned no files

**Password Reset Not Implemented:**
- Problem: Account settings page shows "Password management will be available in a future update"
- Blocks: Users cannot reset forgotten passwords
- Files: `app/(dashboard)/settings/account/page.tsx:49-50`

**Email Notifications Not Functional:**
- Problem: All email sending is stubbed (see Tech Debt section)
- Blocks: User invitation flow, application confirmations, requirement notifications

## Test Coverage Gaps

**No Test Files Exist:**
- What's not tested: Entire codebase (0% coverage)
- Files: All `lib/api/*.ts`, `features/*/actions/*.ts`, `components/*.tsx`
- Risk: Any change could break existing functionality without detection
- Priority: High - critical for sustainable development

**No E2E Tests:**
- What's not tested: User flows, form submissions, navigation
- Files: No Playwright/Cypress configuration found
- Risk: Integration issues between client and server components undetected
- Priority: High

**No Component Tests:**
- What's not tested: UI component behavior, rendering, interactions
- Files: All components in `components/`, `features/*/components/`
- Risk: UI regressions, accessibility issues
- Priority: Medium

---

*Concerns audit: 2026-01-19*
