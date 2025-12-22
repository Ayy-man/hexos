# Security

## RLS Strategy

RLS is ON from day one. To avoid development friction:

1. **Dev as admin** — Develop logged in as admin role. Admin policies allow full access.
2. **Test accounts** — Seed database with test users for each role. Switch to test role views.
3. **Role switcher** — Dev-only component to quickly switch between roles for testing.

## Role Hierarchy

```
admin > internal > dev/dfy/client
```

- **Admin** sees everything (Hamza, Ayman)
- **Internal** sees all projects, but no financials
- **Dev** sees only assigned projects
- **DFY** sees only their deals
- **Client** sees only their project (if invited)

## Helper Functions

```sql
-- Get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if user can access a project
CREATE OR REPLACE FUNCTION public.can_access_project(project_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role user_role;
  user_id UUID;
BEGIN
  user_id := auth.uid();
  user_role := public.get_user_role();
  
  RETURN CASE user_role
    WHEN 'admin' THEN TRUE
    WHEN 'internal' THEN TRUE
    WHEN 'dev' THEN EXISTS (
      SELECT 1 FROM projects WHERE id = project_id AND assigned_dev_id = user_id
    )
    WHEN 'dfy' THEN EXISTS (
      SELECT 1 FROM projects WHERE id = project_id AND dfy_partner_id = user_id
    )
    WHEN 'client' THEN EXISTS (
      SELECT 1 FROM projects WHERE id = project_id AND client_id = user_id
    )
    ELSE FALSE
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

## RLS Policies

### Profiles

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Everyone can read their own profile
CREATE POLICY "users_read_self" ON profiles
  FOR SELECT USING (id = auth.uid());

-- Admin can read all profiles
CREATE POLICY "admin_read_all" ON profiles
  FOR SELECT USING (get_user_role() = 'admin');

-- Admin can manage all profiles
CREATE POLICY "admin_manage" ON profiles
  FOR ALL USING (get_user_role() = 'admin');

-- Users can update own profile (but not role)
CREATE POLICY "users_update_self" ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (role = (SELECT role FROM profiles WHERE id = auth.uid()));
```

### Projects

```sql
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY "admin_all" ON projects
  FOR ALL USING (get_user_role() = 'admin');

-- Internal: read all (financials hidden via view, not RLS)
CREATE POLICY "internal_read" ON projects
  FOR SELECT USING (get_user_role() = 'internal');

-- Dev: only assigned projects
CREATE POLICY "dev_assigned" ON projects
  FOR SELECT USING (
    get_user_role() = 'dev' AND assigned_dev_id = auth.uid()
  );

-- DFY: only their deals
CREATE POLICY "dfy_own_deals" ON projects
  FOR SELECT USING (
    get_user_role() = 'dfy' AND dfy_partner_id = auth.uid()
  );

-- Client: only their project
CREATE POLICY "client_own_project" ON projects
  FOR SELECT USING (
    get_user_role() = 'client' AND client_id = auth.uid()
  );
```

### Deliverables, Files, etc.

```sql
-- All child tables inherit access from project
ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE scope_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Pattern for all child tables:
CREATE POLICY "access_via_project" ON deliverables
  FOR ALL USING (can_access_project(project_id));

-- Repeat for other tables...
```

## Column-Level Security (Views)

RLS handles row access. For column-level (hiding financials), use views:

```sql
-- What internal team sees (no financials)
CREATE VIEW projects_internal AS
SELECT 
  id, project_name, client_name, client_email, client_business,
  status, project_type, operational_mode,
  dfy_partner_id, assigned_dev_id, client_id,
  created_at, updated_at, proposal_sent_at, started_at,
  target_delivery_date, delivered_at, notes
  -- EXCLUDED: quoted_price, dev_cost, dfy_commission_pct
FROM projects;

-- What devs see (no financials, no DFY info)
CREATE VIEW projects_dev AS
SELECT 
  id, project_name, client_name, client_business,
  status, project_type,
  created_at, started_at, target_delivery_date, delivered_at, notes
FROM projects
WHERE assigned_dev_id = auth.uid();
```

## Destructive Actions

Only admins can delete:

```sql
CREATE POLICY "admin_only_delete" ON projects
  FOR DELETE USING (get_user_role() = 'admin');

CREATE POLICY "admin_only_delete" ON deliverables
  FOR DELETE USING (get_user_role() = 'admin');

-- Devs can only update deliverable status, not content
CREATE POLICY "dev_update_status_only" ON deliverables
  FOR UPDATE USING (
    get_user_role() = 'dev' AND can_access_project(project_id)
  )
  WITH CHECK (
    -- Can only change status column
    title = (SELECT title FROM deliverables WHERE id = deliverables.id)
    AND description = (SELECT description FROM deliverables WHERE id = deliverables.id)
    AND due_date = (SELECT due_date FROM deliverables WHERE id = deliverables.id)
  );
```

## Audit Trail

All sensitive operations logged:

```sql
CREATE OR REPLACE FUNCTION log_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activity_log (project_id, user_id, action, details)
  VALUES (
    COALESCE(NEW.id, OLD.id),
    auth.uid(),
    TG_OP,
    jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW))
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER projects_audit
  AFTER INSERT OR UPDATE OR DELETE ON projects
  FOR EACH ROW EXECUTE FUNCTION log_changes();
```

## Test Users (Seed Data)

```sql
-- In supabase/seed.sql
-- Admin (main dev accounts)
INSERT INTO profiles (id, email, name, role) VALUES
  ('11111111-1111-1111-1111-111111111111', 'ayman@hexona.io', 'Ayman', 'admin'),
  ('22222222-2222-2222-2222-222222222222', 'hamza@hexona.io', 'Hamza', 'admin');

-- Test accounts for each role
INSERT INTO profiles (id, email, name, role) VALUES
  ('33333333-3333-3333-3333-333333333333', 'dev@test.hexos', 'Test Dev', 'dev'),
  ('44444444-4444-4444-4444-444444444444', 'dfy@test.hexos', 'Test DFY', 'dfy'),
  ('55555555-5555-5555-5555-555555555555', 'client@test.hexos', 'Test Client', 'client'),
  ('66666666-6666-6666-6666-666666666666', 'internal@test.hexos', 'Test Internal', 'internal');
```

### Inquiries (DFY Update)

```sql
-- DFY partners can update their own inquiries
-- (specifically for dfy_version_content column)
CREATE POLICY "inquiries_dfy_update_own" ON inquiries
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND get_user_role() = 'dfy'
    AND submitted_by = auth.uid()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND get_user_role() = 'dfy'
    AND submitted_by = auth.uid()
  );
```

### Proposal Deliverables

```sql
ALTER TABLE proposal_deliverables ENABLE ROW LEVEL SECURITY;

-- Admin/Internal: full access
CREATE POLICY "admin_internal_all" ON proposal_deliverables
  FOR ALL USING (get_user_role() IN ('admin', 'internal'));

-- DFY: read/write own inquiry's deliverables
CREATE POLICY "dfy_own_inquiry" ON proposal_deliverables
  FOR ALL USING (
    get_user_role() = 'dfy'
    AND inquiry_id IN (
      SELECT id FROM inquiries WHERE submitted_by = auth.uid()
    )
  );
```

### Project Requirements

```sql
ALTER TABLE project_requirements ENABLE ROW LEVEL SECURITY;

-- Access via project
CREATE POLICY "access_via_project" ON project_requirements
  FOR ALL USING (can_access_project(project_id));
```

## Dev Workflow

1. Develop logged in as admin — full access, no friction
2. Test role views — switch to test accounts to verify RLS works
3. Use Role Switcher component (dev only) for quick switching
4. All RLS policies active in both dev and prod — no surprises at launch
