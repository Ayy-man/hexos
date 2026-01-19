# Plan 01-01 Summary: Storage RLS Policies

**Phase:** 01-critical-bugs
**Plan:** 01
**Status:** Complete
**Date:** 2026-01-20

## What Was Built

Added RLS policies to the `general-purpose` storage bucket to fix 403 upload errors for case study images and suggestion box screenshots.

## Deliverables

| Artifact | Description |
|----------|-------------|
| `supabase/migrations/20260119000001_general_purpose_storage_rls.sql` | Migration with 4 RLS policies |

## Policies Created

1. **INSERT** - Authenticated users can upload to general-purpose bucket
2. **SELECT** - Public read access (bucket is public for URL access)
3. **UPDATE** - Authenticated users can update their uploads
4. **DELETE** - Admin/Internal roles only

## Commits

| Hash | Description |
|------|-------------|
| 84f6613 | feat(01-01): create storage RLS migration |

## Deviations

- Migration applied via Supabase SQL Editor instead of `db push` due to migration tracking being out of sync with production database

## Verification

- [x] Migration file created with 4 RLS policies
- [x] Policies use safe patterns (no recursive RLS)
- [x] SQL executed successfully in production

## Next Steps

Test uploads:
- Case study cover image upload
- Suggestion box screenshot upload
