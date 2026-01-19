# Database Recovery Procedures

> Emergency reference for recovering from RLS-related database issues.
> Last Updated: 2026-01-05

## Quick Reference

### If Database Becomes Unresponsive

**Symptoms:**
- Supabase dashboard shows "Unhealthy" status
- Queries timeout or hang indefinitely
- App is extremely slow or unresponsive

**Root Cause (likely):** Recursive RLS function causing infinite loops.

### Emergency Recovery Steps

#### 1. Disable RLS on affected table(s)

```sql
-- Disable RLS to stop the crash loop
ALTER TABLE project_files DISABLE ROW LEVEL SECURITY;
ALTER TABLE deliverables DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_milestones DISABLE ROW LEVEL SECURITY;
ALTER TABLE scope_changes DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_requirements DISABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_requirements DISABLE ROW LEVEL SECURITY;
ALTER TABLE requirement_attachments DISABLE ROW LEVEL SECURITY;
```

#### 2. Drop dangerous functions

```sql
-- Nuclear option - drop functions with CASCADE to remove dependent policies
DROP FUNCTION IF EXISTS get_effective_file_visibility(UUID) CASCADE;
DROP FUNCTION IF EXISTS can_access_file(UUID) CASCADE;
-- Add any other recursive functions here
```

#### 3. Recreate safe functions

See `agent_docs/security.md` → "Current Safe Functions" for approved patterns.

Key safe functions:
- `get_user_role()` - Returns user's role from profiles
- `can_access_project(UUID)` - Non-recursive project access check
- `can_access_file_v2(UUID, TEXT, TEXT)` - Safe file access, takes column values directly

#### 4. Recreate policies

```sql
-- Example: Basic project_files policy
CREATE POLICY "project_files_select" ON project_files
  FOR SELECT USING (can_access_file_v2(project_id, visibility, shared_to));

CREATE POLICY "project_files_insert" ON project_files
  FOR INSERT WITH CHECK (can_access_project(project_id));

CREATE POLICY "project_files_update" ON project_files
  FOR UPDATE USING (can_access_project(project_id));

CREATE POLICY "project_files_delete" ON project_files
  FOR DELETE USING (can_access_project(project_id));
```

#### 5. Re-enable RLS

```sql
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;
-- ... repeat for all tables
```

#### 6. Verify

```sql
-- Test a simple query
SELECT COUNT(*) FROM project_files;

-- Check RLS is working
SELECT * FROM project_files LIMIT 5;
```

---

## Safe Function Patterns

### Golden Rules

1. **NEVER query the same table** the policy protects
2. **NEVER use recursive calls** in RLS functions
3. **Pass column values** to helper functions, don't look them up by ID
4. **Test with 100+ rows** before deploying
5. **Use EXPLAIN ANALYZE** to check for nested loops

### Dangerous Pattern (DO NOT USE)

```sql
-- This WILL crash your database
CREATE FUNCTION get_effective_file_visibility(p_file_id UUID)
RETURNS TEXT AS $$
  SELECT CASE
    WHEN visibility IS NOT NULL THEN visibility
    ELSE get_effective_file_visibility(parent_id)  -- RECURSIVE!
  END
  FROM project_files WHERE id = p_file_id  -- QUERIES SAME TABLE!
$$ LANGUAGE SQL;
```

### Safe Pattern

```sql
-- Pass column values directly - no self-reference
CREATE FUNCTION can_access_file_v2(
  p_project_id UUID,
  p_visibility TEXT,
  p_shared_to TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
  -- Uses passed values, never queries project_files
$$ LANGUAGE plpgsql;

-- In policy, pass columns directly
CREATE POLICY "safe_policy" ON project_files
  FOR SELECT USING (can_access_file_v2(project_id, visibility, shared_to));
```

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| `docs/INCIDENT_2026-01-03_RLS_CRASH.md` | Full incident report with timeline |
| `agent_docs/security.md` | RLS policies and crisis lessons |
| `agent_docs/database.md` | Schema reference |

---

## Prevention Checklist

Before deploying any RLS changes:

- [ ] Function does NOT query the table it protects
- [ ] Function does NOT call itself recursively
- [ ] Function parameters receive column values, not IDs to look up
- [ ] Tested with realistic data volume (100+ rows)
- [ ] EXPLAIN ANALYZE shows no nested loops
- [ ] Migration tested on local Supabase first
