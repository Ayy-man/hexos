# Authentication

## Auth Provider

**Supabase Auth only.** No Firebase.

Supabase Auth integrates natively with RLS via `auth.uid()`.

## Auth Methods

| Method | Use Case |
|--------|----------|
| Email + Password | Primary login for all users |
| Magic Link | Optional passwordless |
| OAuth (Google) | Future consideration |

## User Onboarding Flow

### Invitation System

All user onboarding goes through the `invitations` table. **Emails are NOT automatically sent** - admins must manually copy and share invite links.

**Invitation Types:**
| Type | Created By | Target Role | Has Org |
|------|-----------|-------------|---------|
| `admin` | Admin | admin | No |
| `internal` | Admin | internal | No |
| `dfy_first` | Admin | dfy | Creates new org |
| `dfy_team` | DFY owner | dfy | Joins existing org |
| `dev_solo` | Admin | dev | No |
| `dev_team` | Dev owner | dev | Joins existing org |

**Flow:**
1. Admin clicks "Invite User" → creates invitation record with unique token
2. UI shows success message and pending invitation in list
3. Admin clicks "Copy Link" to get `/invite/{token}` URL
4. Admin shares link manually (email, Slack, etc.)
5. Invitee clicks link → `/invite/[token]` page validates and shows accept form
6. Invitee signs up/logs in → invitation accepted, role assigned

**Key Files:**
- `lib/api/invitations.ts` - All invitation CRUD operations
- `features/organizations/actions/invitationActions.ts` - Server actions
- `app/invite/[token]/page.tsx` - Accept invitation page
- `features/admin/components/AdminTeamList.tsx` - Pending invitations UI

### Admin/Internal
1. Admin goes to `/admin/team` → clicks "Invite User"
2. Selects role (admin or internal), enters email
3. Copies invite link from pending invitations section
4. Shares link with invitee

### Devs
1. Admin goes to `/admin/devs` → clicks "Invite Developer"
2. Enters email, copies invite link
3. Dev clicks link, creates account
4. Dev sees only assigned projects

### DFY Partners
1. Admin goes to `/admin/partners` → clicks "Invite Partner"
2. Enters email + organization name
3. Partner clicks link, creates account + org
4. Can submit inquiries, manage their team

### Clients (if invited)
1. DFY or Admin invites client to specific project
2. Client account created with role='client', linked to project
3. Client receives invite link
4. Client sets password, sees only their project

## Auth Flow Code

```typescript
// src/lib/supabase/auth.ts

import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Sign in
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  if (error) throw error
  return data
}

// Sign out
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// Get current user
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  // Get profile with role
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  
  return profile
}

// Create new user (admin only)
export async function inviteUser(email: string, name: string, role: string) {
  // This should be a server action or API route
  // Uses service role key to create user
}
```

## Route Protection

```typescript
// src/lib/auth/guards.ts

import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

type Role = 'admin' | 'internal' | 'dev' | 'dfy' | 'client'

export async function requireAuth() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }
  
  return user
}

export async function requireRole(allowedRoles: Role[]) {
  const user = await requireAuth()
  const supabase = createServerClient()
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (!profile || !allowedRoles.includes(profile.role)) {
    redirect('/unauthorized')
  }
  
  return { user, role: profile.role }
}

export async function requireAdmin() {
  return requireRole(['admin'])
}
```

## Permissions Matrix

| Feature | Admin | Internal | Dev | DFY | Client |
|---------|-------|----------|-----|-----|--------|
| View all projects | ✅ | ✅ | ❌ | ❌ | ❌ |
| View assigned projects | ✅ | ✅ | ✅ | ✅ | ✅ |
| View all financials | ✅ | ❌ | ❌ | ❌ | ❌ |
| View own payment status | ✅ | N/A | ✅* | ✅ | ✅ |
| Mark payments as paid | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create/edit projects | ✅ | ✅ | ❌ | ❌ | ❌ |
| Assign devs | ✅ | ✅ | ❌ | ❌ | ❌ |
| View assigned dev name | ✅ | ✅ | ✅ | ✅ | ❌ |
| See other devs on project | ✅ | ✅ | ✅ | ✅ | ❌ |
| Update deliverable status | ✅ | ✅ | ✅ | ❌ | ❌ |
| Flag scope change | ✅ | ✅ | ✅ | ✅ | ✅ |
| Approve scope changes | ✅ | ❌ | ❌ | ❌ | ❌ |
| Invite client to project | ✅ | ✅ | ❌ | ✅ | ❌ |
| Submit inquiries | ✅ | ✅ | ❌ | ✅ | ❌ |
| Manage users | ✅ | ❌ | ❌ | ❌ | ❌ |

*Devs see "Cleared" or "Pending", not amounts.

## Session Management

Supabase handles sessions automatically. Tokens refresh in the background.

```typescript
// src/app/layout.tsx
// Session refresh on app load

import { createServerClient } from '@/lib/supabase/server'

export default async function RootLayout({ children }) {
  const supabase = createServerClient()
  await supabase.auth.getSession() // Refreshes if needed
  
  return (
    <html>
      <body>{children}</body>
    </html>
  )
}
```

## Profile Creation Trigger

Auto-create profile when user signs up:

```sql
-- In migrations
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'client')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```
