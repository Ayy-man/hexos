# Incident Report: Database Crash Due to Recursive RLS Function

**Date:** 2026-01-03
**Severity:** Critical (Production Down)
**Duration:** ~2 hours
**Status:** Resolved (with technical debt)

---

## Summary

A recursive RLS function caused infinite loops that repeatedly crashed the Supabase database. Emergency fix was applied that sacrificed several features for stability.

---

## Timeline

1. **15:00** - Implementing whiteboard optimization (Phase 1 & 2)
2. **~19:00** - Vercel build failed due to server/client import issue - fixed
3. **~20:00** - User reports app is extremely slow, clicking projects does nothing
4. **~20:30** - Discovered database showing "Unhealthy" in Supabase dashboard
5. **~21:00** - Identified root cause: recursive `get_effective_file_visibility` function
6. **~21:30** - Database kept crashing every time someone accessed a project
7. **~22:00** - Applied emergency fix: dropped all RLS functions/policies with CASCADE
8. **~22:30** - Recreated simplified functions and policies
9. **~23:00** - App stable, documented incident

---

## Root Cause

The `get_effective_file_visibility` function was designed to walk up the folder tree to inherit visibility from parent folders:

```sql
-- THE PROBLEMATIC CODE (DO NOT USE)
CREATE FUNCTION get_effective_file_visibility(p_file_id UUID)
RETURNS TEXT AS $$
BEGIN
  SELECT visibility, parent_id INTO v_visibility, v_parent_id
  FROM project_files WHERE id = p_file_id;

  IF v_visibility IS NOT NULL THEN RETURN v_visibility; END IF;
  IF v_parent_id IS NOT NULL THEN
    RETURN get_effective_file_visibility(v_parent_id);  -- RECURSIVE CALL
  END IF;
  RETURN 'internal';
END;
$$
```

**Problems:**
1. No depth limit - could recurse infinitely
2. No cycle detection - if `parent_id` ever pointed to itself or created a loop, infinite recursion
3. Called by `can_access_file()` which was called for EVERY row in RLS SELECT policy
4. N * depth queries per page load

---

## What We Lost (Technical Debt)

### 1. Folder Visibility Inheritance (BROKEN)

**Before:** Files in a folder inherited the folder's visibility. A file with `visibility = NULL` inside a "client" folder would be visible to clients.

**After:** Files only use their direct `visibility` column. Inheritance doesn't work.

**Impact:** Files must have explicit visibility set. Nested folder structures don't auto-inherit.

**To Fix Later:** Implement safe inheritance with:
- Depth limit (max 10 levels)
- Materialized `effective_visibility` column updated via trigger
- Or just require explicit visibility on all files

### 2. Role-Specific Update/Delete Permissions (SIMPLIFIED)

**Before:**
- Admins/Internal: Could update/delete any file in accessible projects
- Devs: Could update/delete files in assigned projects
- DFY/Client: Could only update/delete their own uploads
- Separate policies for each role

**After:** Anyone with project access can update/delete any file in that project.

**Impact:** Less granular permission control. A client could theoretically delete internal files if they somehow got access (though `can_access_file` should prevent this).

**To Fix Later:** Add role checks back to update/delete policies:
```sql
CREATE POLICY "project_files_update" ON project_files
FOR UPDATE USING (
  CASE get_user_role()
    WHEN 'admin' THEN can_access_project(project_id)
    WHEN 'internal' THEN can_access_project(project_id)
    WHEN 'dev' THEN can_access_project(project_id)
    ELSE uploaded_by = auth.uid()  -- DFY/Client can only edit own files
  END
);
```

### 3. shared_to Field (NOT CHECKED)

**Before:** Files could be "shared" to another view via `shared_to` column. A file with `visibility = 'internal'` and `shared_to = 'client'` would be visible in both views.

**After:** `shared_to` is completely ignored in RLS. Only `visibility` matters.

**Impact:** The "Share to Client" / "Share to Internal" feature in the UI does nothing at the database level.

**To Fix Later:** Add `shared_to` check back to `can_access_file`:
```sql
IF v_role IN ('dfy', 'client') THEN
  RETURN v_visibility = 'client' OR v_shared_to = 'client';
END IF;
```

### 4. Cascaded Policy Deletion

When we ran `DROP FUNCTION ... CASCADE`, it deleted policies on **9 tables**:
- project_files
- deliverables
- payment_milestones
- scope_changes
- activity_log
- project_requirements
- onboarding_requirements
- requirement_attachments
- (projects table was already okay)

We recreated basic policies, but they may be missing nuanced access control that existed before.

---

## What Still Works

- Basic CRUD on all tables
- Project access control (admin sees all, dev sees assigned, etc.)
- File visibility (client vs internal) - just not inherited
- Whiteboard saving with the new optimizations
- Realtime presence (who's viewing)
- Conflict detection (someone else saved)

---

## Lessons Learned

1. **Never use unbounded recursion in RLS functions** - Always add depth limits
2. **Test RLS with realistic data volumes** - N+1 issues multiply fast
3. **Have a direct psql connection ready** - Dashboard SQL editor times out when DB is dying
4. **Monitor Supabase health dashboard** - Would have caught this earlier
5. **Keep migrations atomic** - Easier to rollback specific changes

---

## Action Items

- [ ] Implement safe folder visibility inheritance (with depth limit or materialized column)
- [ ] Restore role-specific update/delete permissions
- [ ] Re-enable shared_to field checking
- [ ] Add database monitoring/alerts
- [ ] Document RLS function guidelines for future development
- [ ] Consider moving complex access logic to application layer

---

## Related Files

- `supabase/migrations/20260103000011_emergency_rls_fix.sql` - The fix that was applied
- `supabase/migrations/20260103000006_fix_project_files_rls.sql` - OBSOLETE, contains dangerous recursive function
- `hooks/use-whiteboard-realtime.ts` - The realtime feature we were adding when this happened
- `hooks/use-app-presence.ts` - Added error handling during incident

---

## Commands Used to Fix

```sql
-- 1. Disable RLS to stop the crash loop
ALTER TABLE project_files DISABLE ROW LEVEL SECURITY;
-- (repeated for 8 other tables)

-- 2. Nuclear option - drop everything that depends on the functions
DROP FUNCTION IF EXISTS can_access_project(UUID) CASCADE;
DROP FUNCTION IF EXISTS can_access_file(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_effective_file_visibility(UUID) CASCADE;

-- 3. Recreate simple, safe functions (see migration file)

-- 4. Re-enable RLS and recreate basic policies
```

---

*This incident report is kept for future reference. Delete when all technical debt is resolved.*
