# Database Recovery Documentation

**Date:** 2026-01-05
**Status:** STABLE - Projects loading successfully

---

## Summary

After the RLS crisis on 2026-01-03, the database has been stabilized. This document captures the current working state for rollback purposes.

---

## Current Database State

### Functions (Safe, Non-Recursive)

```sql
-- These are the current working functions
SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public';
```

| Function | Purpose | Status |
|----------|---------|--------|
| `get_user_role()` | Returns user's role from profiles | Safe |
| `can_access_project(uuid)` | Checks if user can access a project | Safe, non-recursive |
| `can_access_file_v2(uuid, text)` | Checks file access with visibility | Safe, non-recursive |
| `can_access_conversation_v2(...)` | Checks conversation access | Safe |
| `can_access_inquiry_deliverables(uuid)` | Checks inquiry deliverables access | Safe |
| `create_project_default_folders()` | Trigger for new projects | Safe |
| `create_project_conversations()` | Trigger for project conversations | Safe |
| `handle_new_user()` | Profile creation trigger | Safe |
| `handle_updated_at()` / `set_updated_at()` / `update_updated_at()` | Timestamp triggers | Safe |
| `log_project_changes()` | Activity logging trigger | Safe |

### Dangerous Functions (REMOVED)

These functions caused the database crashes and have been removed:

- `get_effective_file_visibility(uuid)` - **DELETED** - Was recursive
- `can_access_file(uuid)` - **DELETED** - Called recursive function

---

## RLS Policies Summary

### project_files
```sql
-- SELECT uses the safe v2 function
"project_files_select" -> can_access_file_v2(project_id, visibility)

-- Other operations use can_access_project
"project_files_insert" -> can_access_project(project_id)
"project_files_update" -> can_access_project(project_id)
"project_files_delete" -> can_access_project(project_id)
```

### projects
```sql
"projects_admin_all" -> get_user_role() = 'admin'
"projects_internal_select" -> get_user_role() = 'internal'
"projects_dev_select" -> get_user_role() = 'dev' AND assigned_dev_id = auth.uid()
"projects_dfy_select" -> get_user_role() = 'dfy' AND dfy_partner_id = auth.uid()
"projects_client_select" -> get_user_role() = 'client' AND client_id = auth.uid()
```

---

## SQL to Recreate Current State

If you need to restore the database to this working state, run:

### 1. Core Helper Functions

```sql
-- Get user role (simple, no recursion)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Can access project (no recursion)
CREATE OR REPLACE FUNCTION public.can_access_project(p_project_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_role user_role;
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN FALSE; END IF;
  SELECT role INTO v_role FROM profiles WHERE id = v_uid;
  IF v_role IN ('admin', 'internal') THEN RETURN TRUE; END IF;
  IF v_role = 'dev' THEN RETURN EXISTS (SELECT 1 FROM projects WHERE id = p_project_id AND assigned_dev_id = v_uid); END IF;
  IF v_role = 'dfy' THEN RETURN EXISTS (SELECT 1 FROM projects WHERE id = p_project_id AND dfy_partner_id = v_uid); END IF;
  IF v_role = 'client' THEN RETURN EXISTS (SELECT 1 FROM projects WHERE id = p_project_id AND client_id = v_uid); END IF;
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Can access file v2 (NO RECURSION - uses direct visibility)
CREATE OR REPLACE FUNCTION public.can_access_file_v2(p_project_id UUID, p_visibility TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role user_role;
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN FALSE; END IF;
  SELECT role INTO v_user_role FROM public.profiles WHERE id = v_uid;
  IF NOT public.can_access_project(p_project_id) THEN RETURN FALSE; END IF;
  IF v_user_role IN ('admin', 'internal', 'dev') THEN RETURN TRUE; END IF;
  RETURN p_visibility = 'portal' OR p_visibility = 'client';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;
```

### 2. Project Files RLS Policies

```sql
-- Drop any existing policies
DROP POLICY IF EXISTS "project_files_select" ON project_files;
DROP POLICY IF EXISTS "project_files_insert" ON project_files;
DROP POLICY IF EXISTS "project_files_update" ON project_files;
DROP POLICY IF EXISTS "project_files_delete" ON project_files;

-- Recreate with safe functions
CREATE POLICY "project_files_select" ON project_files
  FOR SELECT USING (can_access_file_v2(project_id, visibility));

CREATE POLICY "project_files_insert" ON project_files
  FOR INSERT WITH CHECK (can_access_project(project_id));

CREATE POLICY "project_files_update" ON project_files
  FOR UPDATE USING (can_access_project(project_id));

CREATE POLICY "project_files_delete" ON project_files
  FOR DELETE USING (can_access_project(project_id));
```

### 3. Projects RLS Policies

```sql
DROP POLICY IF EXISTS "projects_admin_all" ON projects;
DROP POLICY IF EXISTS "projects_internal_select" ON projects;
DROP POLICY IF EXISTS "projects_internal_write" ON projects;
DROP POLICY IF EXISTS "projects_internal_update" ON projects;
DROP POLICY IF EXISTS "projects_dev_select" ON projects;
DROP POLICY IF EXISTS "projects_dfy_select" ON projects;
DROP POLICY IF EXISTS "projects_client_select" ON projects;

CREATE POLICY "projects_admin_all" ON projects
  FOR ALL USING (auth.uid() IS NOT NULL AND get_user_role() = 'admin');

CREATE POLICY "projects_internal_select" ON projects
  FOR SELECT USING (auth.uid() IS NOT NULL AND get_user_role() = 'internal');

CREATE POLICY "projects_internal_write" ON projects
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND get_user_role() = 'internal');

CREATE POLICY "projects_internal_update" ON projects
  FOR UPDATE USING (auth.uid() IS NOT NULL AND get_user_role() = 'internal');

CREATE POLICY "projects_dev_select" ON projects
  FOR SELECT USING (auth.uid() IS NOT NULL AND get_user_role() = 'dev' AND assigned_dev_id = auth.uid());

CREATE POLICY "projects_dfy_select" ON projects
  FOR SELECT USING (auth.uid() IS NOT NULL AND get_user_role() = 'dfy' AND dfy_partner_id = auth.uid());

CREATE POLICY "projects_client_select" ON projects
  FOR SELECT USING (auth.uid() IS NOT NULL AND get_user_role() = 'client' AND client_id = auth.uid());
```

---

## Schema Columns (Critical Tables)

### project_files
- id, project_id, deliverable_id
- file_name, file_path, file_size, file_type
- uploaded_by, uploaded_at
- visibility (internal/client)
- description
- parent_id (for folder hierarchy)
- content_type (file/folder/document/whiteboard)
- content (JSONB for documents/whiteboards)
- position
- shared_to (internal/client or null)

### projects
- All standard columns plus:
- main_whiteboard (JSONB)
- price_hexona, price_dev, price_dfy
- retainer_plan, retainer_date, software_payer
- date_inquiry, date_proposal_sent, date_closed, date_onboarding, date_delivered
- source_inquiry_id

### inquiries
- All standard columns plus:
- price_hexona, price_dev (added 2026-01-05)
- date_inquiry, date_proposal_sent (added 2026-01-05)
- deliverables_status (added 2026-01-05)
- closed_at, closed_by, closed_notes, client_email (added 2026-01-05)
- proposal_whiteboard (added 2026-01-05)
- proposal_discussions (added 2026-01-05)

### profiles
- id, name, email, role, created_at
- logo_url
- last_seen_at

---

## What's NOT Working (Known Limitations)

1. **Folder visibility inheritance** - Files don't inherit visibility from parent folders at the DB level. The app handles this in code when creating items.

2. **shared_to field** - The `shared_to` column exists but RLS doesn't check it. Files are filtered by direct `visibility` only.

---

## Test Checklist

- [x] Login works
- [x] Dashboard loads
- [x] Projects list loads
- [x] Project detail page loads
- [x] Project tabs work (Overview, Deliverables, etc.)
- [ ] Files tab - create folder
- [ ] Files tab - create document
- [ ] Files tab - create whiteboard
- [ ] Inquiries list
- [ ] Inquiry detail

---

## Related Commits

- `deefe67` - Current HEAD (after emergency fixes)
- `c32e7eb` - Last stable commit before RLS issues
- `ac8cfb7` - Commit that introduced recursive function

---

## Emergency Contacts

If database crashes again:
1. Disable RLS: `ALTER TABLE project_files DISABLE ROW LEVEL SECURITY;`
2. Drop dangerous functions: `DROP FUNCTION IF EXISTS get_effective_file_visibility CASCADE;`
3. Re-enable RLS after fixing

---

*Document created: 2026-01-05*
*Last verified working: 2026-01-05*
