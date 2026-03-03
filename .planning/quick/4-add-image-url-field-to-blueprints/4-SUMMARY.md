---
phase: quick-4
plan: 01
subsystem: ui, database, api
tags: [supabase-storage, next-image, blueprints, image-upload]

# Dependency graph
requires:
  - phase: existing-case-studies
    provides: "uploadCaseStudyImage pattern, useImageUpload hook"
provides:
  - "image_url column on blueprints table"
  - "uploadBlueprintImage API function"
  - "uploadBlueprintImageAction server action"
  - "BlueprintForm cover image upload UI"
  - "BlueprintCard cover image display"
affects: [blueprints, blueprint-detail]

# Tech tracking
tech-stack:
  added: []
  patterns: [supabase-storage-upload-for-blueprints]

key-files:
  created:
    - supabase/migrations/20260303000002_blueprints_image.sql
  modified:
    - lib/api/blueprints.ts
    - features/blueprints/actions/blueprintActions.ts
    - features/blueprints/components/BlueprintForm.tsx
    - features/blueprints/components/BlueprintCard.tsx
    - app/(dashboard)/blueprints/page.tsx

key-decisions:
  - "Replicated exact case studies image pattern -- same storage bucket, same hook, same UI layout"

patterns-established:
  - "Supabase storage image upload for blueprints follows case-studies pattern"

requirements-completed: [QUICK-4]

# Metrics
duration: 4min
completed: 2026-03-03
---

# Quick Task 4: Add image_url Field to Blueprints Summary

**Supabase storage image upload for blueprints with cover image UI on form and card display, replicating the case studies pattern**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-03T00:02:25Z
- **Completed:** 2026-03-03T00:06:08Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- DB migration adds image_url TEXT column to blueprints table
- Full image upload pipeline: storage upload function, server action, form UI with preview/remove
- BlueprintCard displays cover image with hover scale animation
- Blueprints list page passes image_url prop through to cards

## Task Commits

Each task was committed atomically:

1. **Task 1: DB migration + API layer** - `7c8cc29` (feat)
2. **Task 2: BlueprintForm image upload UI + BlueprintCard image display** - `66e69ae` (feat)

## Files Created/Modified
- `supabase/migrations/20260303000002_blueprints_image.sql` - ALTER TABLE adds image_url TEXT column
- `lib/api/blueprints.ts` - uploadBlueprintImage function, image_url in 4 interfaces, updated SELECT/CRUD/duplicate
- `features/blueprints/actions/blueprintActions.ts` - uploadBlueprintImageAction server action
- `features/blueprints/components/BlueprintForm.tsx` - Cover Image card with useImageUpload hook, async submit with upload
- `features/blueprints/components/BlueprintCard.tsx` - Image display above card header with aspect-video and hover scale
- `app/(dashboard)/blueprints/page.tsx` - Passes image_url prop to BlueprintCard

## Decisions Made
- Replicated exact case studies image pattern -- same storage bucket (general-purpose), same useImageUpload hook, same UI layout for consistency

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. The general-purpose Supabase storage bucket already exists from the case studies feature.

## Next Phase Readiness
- Blueprint image_url is fully wired from database through UI
- Run the migration against Supabase to add the column in production

## Self-Check: PASSED

All 6 files verified present. Both commit hashes (7c8cc29, 66e69ae) verified in git log.

---
*Phase: quick-4*
*Completed: 2026-03-03*
