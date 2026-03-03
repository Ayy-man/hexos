---
phase: 20-onboarding-stepper-form
plan: 02
subsystem: ui
tags: [react, next.js, supabase, bento-grid, url-state, design-tokens]

# Dependency graph
requires:
  - phase: 20-01
    provides: "onboarding_categories/questions/answers API functions and types"

provides:
  - "OnboardingBentoGrid component replacing flat OnboardingTab"
  - "BentoCard base with URL-based sheet state, accessibility, visual priority signals"
  - "CategoryBentoCard with completion fraction, progress bar, last-edited timestamp"
  - "DeliverablesBentoCard lifting tree preview with design token colors"
  - "RequirementsBentoCard with blocker count using --signal-warn-dim"
  - "OnboardingProgressSummary with overall completion percentage"
  - "useOnboardingSheet hook for ?section= URL param management"
  - "useOnboardingProgress hook for per-category and overall progress calculation"
  - "Data pipeline: server page fetches categories/questions/answers in Promise.all"
affects:
  - "20-03: sheet content for category questions (uses BentoCard and useOnboardingSheet)"
  - "20-04: sheet content for deliverables/requirements (uses DeliverablesBentoCard, RequirementsBentoCard)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Suspense wrapper for useSearchParams components (required by Next.js)"
    - "Design tokens (--signal-good, --signal-warn, --signal-bad) for status colors instead of Tailwind hardcoded"
    - "URL-based sheet state: ?section=<slug> — openSheet/closeSheet via useRouter.push"
    - "BentoCard as base shell: visual priority via left-border accent and opacity dim for completed items"
    - "buildDeliverableTree utility extracted to DeliverablesBentoCard for module-level reuse"

key-files:
  created:
    - "features/projects/components/tabs/onboarding/hooks/use-onboarding-sheet.ts"
    - "features/projects/components/tabs/onboarding/hooks/use-onboarding-progress.ts"
    - "features/projects/components/tabs/onboarding/BentoCard.tsx"
    - "features/projects/components/tabs/onboarding/CategoryBentoCard.tsx"
    - "features/projects/components/tabs/onboarding/DeliverablesBentoCard.tsx"
    - "features/projects/components/tabs/onboarding/RequirementsBentoCard.tsx"
    - "features/projects/components/tabs/onboarding/OnboardingProgressSummary.tsx"
    - "features/projects/components/tabs/onboarding/OnboardingBentoGrid.tsx"
  modified:
    - "app/(dashboard)/projects/[id]/page.tsx"
    - "features/projects/components/ProjectPageClient.tsx"
    - "features/projects/components/ProjectTabs.tsx"

key-decisions:
  - "BentoCard renders sheet inline as ResponsiveDialog (not separate Sheet component) — co-location keeps click handler and dialog state together"
  - "OnboardingBentoGrid wraps inner component in Suspense to support useSearchParams (per Next.js requirements)"
  - "showQuestionsTab computed in ProjectTabs for post-onboarding persistent Q&A channel — same onboarding tab value with 'Questions' label"
  - "Categories sorted: incomplete first then by position — surfaces actionable items at top"
  - "buildDeliverableTree placed in DeliverablesBentoCard module (not shared utils) — only used there for now"

patterns-established:
  - "Design token pattern: use text-[--signal-good], text-[--signal-bad], bg-[--signal-warn-dim] instead of Tailwind color utilities for semantic status colors"
  - "Suspense+useSearchParams pattern: always wrap inner component in <Suspense> when using useSearchParams"
  - "Onboarding hook pattern: useOnboardingSheet and useOnboardingProgress are pure client hooks — no server state"

requirements-completed: []

# Metrics
duration: 4min
completed: 2026-03-03
---

# Phase 20 Plan 02: Onboarding Bento Grid UI Summary

**Responsive bento grid dashboard replacing flat OnboardingTab with per-category cards, URL-based sheet state via ?section=, and real-time progress tracking using design tokens**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-03T00:01:58Z
- **Completed:** 2026-03-03T00:05:58Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Wired full data pipeline: server page fetches categories/questions/answers in parallel Promise.all, threaded through ProjectPageClient and ProjectTabs to OnboardingBentoGrid
- Built 6 new components (BentoCard, CategoryBentoCard, DeliverablesBentoCard, RequirementsBentoCard, OnboardingProgressSummary, OnboardingBentoGrid) with 2 custom hooks (useOnboardingSheet, useOnboardingProgress)
- Replaced flat two-card OnboardingTab with interactive bento grid: responsive 2-col desktop / 1-col mobile, completed cards muted, required-incomplete cards with left-border accent, sheet placeholders ready for Plans 03-04
- All status signals use CSS custom properties (--signal-good, --signal-warn, --signal-bad) — zero hardcoded Tailwind color utilities in new files

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire data pipeline and create hooks** - `3a92b58` (feat)
2. **Task 2: Build bento grid components and replace OnboardingTab** - `f89f625` (feat)

## Files Created/Modified

- `app/(dashboard)/projects/[id]/page.tsx` - Extended Promise.all to fetch categories/questions/answers with .catch(() => []) guards
- `features/projects/components/ProjectPageClient.tsx` - Added OnboardingCategory/Question/Answer props and threading
- `features/projects/components/ProjectTabs.tsx` - Added OnboardingBentoGrid import, showQuestionsTab logic, replaced OnboardingTab render
- `features/projects/components/tabs/onboarding/hooks/use-onboarding-sheet.ts` - URL-based ?section= state management hook
- `features/projects/components/tabs/onboarding/hooks/use-onboarding-progress.ts` - Per-category and overall progress calculation with exported types
- `features/projects/components/tabs/onboarding/BentoCard.tsx` - Base card: role=button, tabIndex, focus ring, click-to-open, ResponsiveDialog with placeholder content
- `features/projects/components/tabs/onboarding/CategoryBentoCard.tsx` - Category card with status badge, completion fraction, progress bar, last-edited relative time
- `features/projects/components/tabs/onboarding/DeliverablesBentoCard.tsx` - Deliverables tree preview with buildDeliverableTree utility, sign-off status
- `features/projects/components/tabs/onboarding/RequirementsBentoCard.tsx` - Requirements preview with blocker count using --signal-warn-dim design token
- `features/projects/components/tabs/onboarding/OnboardingProgressSummary.tsx` - Overall completion summary with Progress bar
- `features/projects/components/tabs/onboarding/OnboardingBentoGrid.tsx` - Main grid container with Suspense, sort incomplete-first, overflow collapsible, empty states

## Decisions Made
- BentoCard renders ResponsiveDialog inline (not separate state) — co-location keeps handler and dialog together without external state
- Wrapped inner grid component in Suspense per Next.js requirement for useSearchParams hooks
- showQuestionsTab uses the same "onboarding" tab value with label "Questions" — avoids duplicate TabsContent
- Categories sorted: incomplete first then by position — surfaces actionable work at top
- buildDeliverableTree module-level in DeliverablesBentoCard — only used there; can be lifted later when Plans 03-04 need it

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TypeScript errors observed in tsc output are all pre-existing environment-level issues (missing lib declarations for JSX runtime, next/navigation, lucide-react, date-fns) that affect all files in the project equally and do not affect the Next.js build.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- BentoGrid renders with real data; clicking any card opens a ResponsiveDialog with "Content coming soon" placeholder
- Plan 03: Add category question form content inside BentoCard sheet (uses useOnboardingSheet slug `category-{id}`)
- Plan 04: Add deliverables sign-off and requirements management inside DeliverablesBentoCard and RequirementsBentoCard sheets
- OnboardingTab.tsx deliberately kept — Plans 03-04 will lift deliverables/requirements logic from it

---
*Phase: 20-onboarding-stepper-form*
*Completed: 2026-03-03*
