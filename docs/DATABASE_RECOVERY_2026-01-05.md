# Database Recovery Documentation

**Date:** 2026-01-05
**Status:** STABLE - All features working
**Current Supabase:** `aqlcflpukoqbdekgvzoj`

---

## Summary

After the RLS crisis on 2026-01-03 and subsequent recovery attempts, we migrated to a fresh Supabase project on 2026-01-05. This document captures the working state and lessons learned.

---

## Recovery Timeline

| Date | Event |
|------|-------|
| 2026-01-03 | RLS crash - recursive `get_effective_file_visibility()` function |
| 2026-01-03 | Emergency fixes applied, app stabilized |
| 2026-01-05 | Old Supabase project became inaccessible |
| 2026-01-05 | Fresh Supabase project created (`aqlcflpukoqbdekgvzoj`) |
| 2026-01-05 | Combined migration script created (v3) |
| 2026-01-05 | Profiles RLS disabled, permissions granted |
| 2026-01-05 | All 4 roles tested and working |

---

## Current Database State

### Supabase Project
- **Ref:** `aqlcflpukoqbdekgvzoj`
- **URL:** `https://aqlcflpukoqbdekgvzoj.supabase.co`
- **Region:** (check dashboard)

### RLS Status

| Table | RLS Enabled | Notes |
|-------|-------------|-------|
| `profiles` | **DISABLED** | Causes recursion - handled in app |
| `projects` | Enabled | Uses `get_user_role()` |
| `project_files` | Enabled | Uses `can_access_file_v2()` |
| `inquiries` | Enabled | Standard policies |
| All others | Enabled | Standard policies |

### Permissions Granted

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
```

---

## Key Lessons Learned

### 1. Profiles Table Cannot Use get_user_role()

**Problem:** `get_user_role()` queries the `profiles` table. When used in a policy ON the `profiles` table, it creates infinite recursion.

**Wrong:**
```sql
CREATE POLICY "profiles_select_admin" ON profiles
  FOR SELECT USING (get_user_role() = 'admin');  -- RECURSIVE!
```

**Also Wrong:**
```sql
CREATE POLICY "profiles_select_admin" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );  -- STILL RECURSIVE!
```

**Solution:** Disable RLS on profiles or use only `id = auth.uid()` checks.

### 2. handle_new_user() Trigger Needs Permissions

The trigger that creates profiles on signup can fail silently if:
- RLS blocks the insert
- The `authenticated` role lacks INSERT permission

**Fix:** Ensure trigger function has `SECURITY DEFINER` and permissions are granted.

### 3. Column Names Matter

Migration `20260103000005_project_files_folders.sql` had `p.name` instead of `p.project_name`, causing the backfill to fail.

**Fixed in:** Combined migration v3

---

## Safe Functions (Non-Recursive)

| Function | Purpose | Status |
|----------|---------|--------|
| `get_user_role()` | Returns user's role from profiles | Safe (but not for profiles table policies) |
| `can_access_project(uuid)` | Checks if user can access a project | Safe |
| `can_access_file_v2(uuid, text)` | Checks file access with visibility | Safe |
| `can_access_conversation_v2(...)` | Checks conversation access | Safe |

### Dangerous Functions (DO NOT USE)

- `get_effective_file_visibility(uuid)` - Recursive folder traversal
- `can_access_file(uuid)` - Called the recursive function

---

## Test Checklist (All Passing)

- [x] Login works (all 4 roles)
- [x] Admin dashboard loads
- [x] Dev dashboard loads
- [x] DFY dashboard loads
- [x] Client dashboard loads
- [x] Projects page loads
- [x] Inquiries page loads
- [x] Blueprints shows seeded data
- [x] Conversations page loads
- [x] Settings page loads
- [x] Sign out works

---

## Test Accounts

| Email | Password | Role |
|-------|----------|------|
| `ayman@hexonasystems.com` | (your password) | admin |
| `admin@test.hexos` | `test1234` | admin |
| `dev@test.hexos` | `test1234` | dev |
| `dfy@test.hexos` | `test1234` | dfy |
| `client@test.hexos` | `test1234` | client |

---

## Files Reference

| File | Purpose |
|------|---------|
| `supabase/COMBINED_SAFE_MIGRATION_v3.sql` | All migrations combined, safe |
| `supabase/FIX_PROFILES_RLS.sql` | Profiles RLS fix (reference only) |
| `docs/FRESH_SUPABASE_SETUP.md` | Step-by-step setup guide |
| `docs/INCIDENT_2026-01-03_RLS_CRASH.md` | Original incident report |

---

## Emergency Procedures

### If App Can't Connect to Supabase
1. Check Supabase dashboard - is project paused?
2. Verify env vars match project ref
3. Test URL directly: `https://YOUR_REF.supabase.co/rest/v1/`

### If "permission denied for table X"
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON table_name TO authenticated;
```

### If "infinite recursion detected"
```sql
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
-- Fix the policy, then re-enable
```

### If Login Fails But User Exists
```sql
-- Check if profile exists
SELECT * FROM profiles WHERE email = 'user@email.com';

-- If not, insert from auth.users
INSERT INTO profiles (id, email, name, role)
SELECT id, email, split_part(email, '@', 1), 'client'::user_role
FROM auth.users WHERE email = 'user@email.com';
```

---

*Document updated: 2026-01-05*
*Last verified working: 2026-01-05*
