# Profiles & Settings System

> Comprehensive user profiles, settings, and presence system for all roles

## Current State

**Profiles Table (Basic):**
- `id` (UUID, FK to auth.users)
- `name`, `email`, `role`
- `logo_url` (DFY branding)
- `last_seen_at` (presence tracking)
- `created_at`

**Conversations System:**
- ✅ 3 conversation types per project (project, workspace, partner)
- ✅ Messages, reactions, mentions, attachments
- ✅ Read status tracking
- ✅ Real-time updates via Supabase Realtime

## Schema Extensions Needed

### 1. Enhanced Profiles Table

```sql
-- migration: 20260107xxxxxx_enhanced_profiles.sql

-- Bio & Location
ALTER TABLE profiles ADD COLUMN bio TEXT;
ALTER TABLE profiles ADD COLUMN timezone TEXT DEFAULT 'America/New_York';
ALTER TABLE profiles ADD COLUMN location TEXT; -- for Location Tag component
ALTER TABLE profiles ADD COLUMN phone TEXT; -- for future WhatsApp

-- Developer-specific
ALTER TABLE profiles ADD COLUMN skills TEXT[]; -- ['Node.js', 'React', 'PostgreSQL']
ALTER TABLE profiles ADD COLUMN hourly_rate DECIMAL(10,2); -- admin-only visible
ALTER TABLE profiles ADD COLUMN max_concurrent_projects INT DEFAULT 3;
ALTER TABLE profiles ADD COLUMN portfolio_url TEXT;

-- DFY-specific
ALTER TABLE profiles ADD COLUMN commission_tier TEXT; -- 'standard', 'premium', 'vip'
ALTER TABLE profiles ADD COLUMN company_name TEXT; -- DFY company name

-- Client-specific
ALTER TABLE profiles ADD COLUMN company_name TEXT; -- reuse for clients too
ALTER TABLE profiles ADD COLUMN industry TEXT;

-- Availability
ALTER TABLE profiles ADD COLUMN availability_status TEXT DEFAULT 'available'; -- available, busy, away, offline

-- Preferences (JSONB for flexibility)
ALTER TABLE profiles ADD COLUMN notification_preferences JSONB DEFAULT '{
  "email": {
    "project_updates": true,
    "proposal_submitted": true,
    "payment_reminders": true,
    "deliverable_completed": true,
    "mentions": true
  },
  "in_app": {
    "project_updates": true,
    "proposal_submitted": true,
    "mentions": true,
    "direct_messages": true
  },
  "whatsapp": {
    "enabled": false,
    "critical_only": true
  }
}'::jsonb;

ALTER TABLE profiles ADD COLUMN ui_preferences JSONB DEFAULT '{
  "dashboard_layout": "default",
  "compact_mode": false,
  "show_onboarding": true,
  "default_project_view": "list",
  "default_inquiry_view": "board"
}'::jsonb;

-- Onboarding
ALTER TABLE profiles ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN onboarding_step INT DEFAULT 0;

-- Indexes
CREATE INDEX idx_profiles_skills ON profiles USING GIN (skills);
CREATE INDEX idx_profiles_availability ON profiles(availability_status);
CREATE INDEX idx_profiles_role_availability ON profiles(role, availability_status);
```

### 2. Developer Availability Calendar

```sql
-- Track dev capacity and availability windows
CREATE TABLE dev_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dev_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Capacity
  is_available BOOLEAN DEFAULT true,
  hours_per_week DECIMAL(5,1) DEFAULT 40,
  current_capacity_pct INT DEFAULT 0, -- calculated from active projects

  -- Availability windows (optional)
  available_from DATE,
  available_until DATE,

  -- Status
  status_message TEXT, -- "On vacation until Jan 15"
  auto_assign BOOLEAN DEFAULT true, -- for future auto-assignment

  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(dev_id)
);

CREATE INDEX idx_dev_availability_status ON dev_availability(is_available, current_capacity_pct);
```

### 3. Notification Preferences Table (Future)

```sql
-- For granular notification control (future enhancement)
CREATE TABLE notification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  event_type TEXT NOT NULL, -- 'project_status_change', 'mention', 'payment_received', etc.
  channel TEXT NOT NULL, -- 'email', 'in_app', 'whatsapp'
  enabled BOOLEAN DEFAULT true,

  -- Filters
  priority TEXT, -- 'all', 'urgent_only', 'high_and_urgent'
  quiet_hours_start TIME, -- e.g., '22:00'
  quiet_hours_end TIME, -- e.g., '08:00'

  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, event_type, channel)
);
```

### 4. User Sessions & Devices (Future)

```sql
-- Track active sessions for security
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  device_name TEXT, -- "Chrome on MacOS"
  ip_address TEXT,
  user_agent TEXT,

  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_active ON user_sessions(user_id, last_active_at DESC);
```

## Settings Page Structure

### Route Structure

```
/settings
  /profile          - Name, email, bio, avatar, timezone, location
  /account          - Password, 2FA, sessions
  /notifications    - Email, in-app, WhatsApp preferences
  /appearance       - Theme (already exists), language, compact mode

  # Role-specific
  /developer        - Skills, hourly rate, availability, portfolio (dev only)
  /partner          - Logo, company, commission tier, bio (dfy only)
  /company          - Company settings, billing contact (client only)
  /team             - Manage users, invitations (admin only)
  /integrations     - Stripe, email, webhooks (admin only)
```

### Layout Component

```typescript
// app/(dashboard)/settings/layout.tsx
import { SettingsSidebar } from '@/features/settings/components/SettingsSidebar'

export default function SettingsLayout({ children }) {
  return (
    <div className="flex gap-6">
      <SettingsSidebar /> {/* Navigation tabs on left */}
      <div className="flex-1">{children}</div>
    </div>
  )
}
```

## Features by Role

### All Roles

**Profile Settings:**
- ✅ Name, email (read-only, managed by auth)
- Avatar upload (Supabase Storage bucket: `avatars`)
- Bio (250 chars max, Textarea)
- Timezone selector (react-timezone-select)
- Location (for Location Tag component)
- Phone number (for future WhatsApp)

**Account Settings:**
- Change password (Supabase Auth)
- Email notifications toggle
- Active sessions list (device, last active, revoke)
- Delete account (with confirmation)

**Notification Preferences:**
- Email notifications (project updates, mentions, payments)
- In-app notifications (toast, sidebar badge)
- WhatsApp (future, toggle + phone verification)
- Quiet hours (optional)

**Appearance:**
- Theme toggle (light/dark/system) - already exists
- Compact mode (denser UI)
- Language (future i18n)

### Admin & Internal

**Team Management (`/settings/team`):**
- List all users (table with role, last seen, status)
- Invite new users (send email invitation)
- Edit user roles (dropdown)
- Deactivate/reactivate users
- View user activity logs

**Company Settings (`/settings/company`):**
- Company name, logo
- Default commission structure
- Default payment terms
- Billing contact info

**Integrations (`/settings/integrations`):**
- Stripe API keys (admin only)
- Email provider (Resend, future)
- Webhooks (future)
- n8n integration (future)

### Developer

**Developer Profile (`/settings/developer`):**
- Skills (multi-select tags: React, Node.js, PostgreSQL, etc.)
- Portfolio URL
- Hourly rate (admin sets, dev can see)
- Max concurrent projects (admin sets, dev can see)
- Availability status:
  - 🟢 Available
  - 🟡 Busy (near capacity)
  - 🔴 Unavailable
  - 🔵 Away (vacation, etc.)
- Availability message ("On vacation until Jan 15")
- Auto-assign to new projects (toggle)

**Capacity View:**
- Current projects (3/5)
- Progress bars per project
- Estimated hours remaining
- Next deliverable due dates

### DFY Partner

**Partner Settings (`/settings/partner`):**
- Company name
- Logo upload (for branded proposals) - already exists
- Bio (used in partner directory, future)
- Commission tier (view-only, set by admin)
- Payment/payout details (bank account, future)

**Marketing Materials:**
- Download brand assets (logos, templates)
- Access case studies
- Access blueprints

**Performance Dashboard:**
- My stats (inquiries, win rate, total commission)
- Active pipeline
- Closed deals
- Commission history (future with Stripe)

### Client

**Company Profile (`/settings/company`):**
- Company name
- Industry
- Billing contact
- Team members (invite other users to view project)

**Project Preferences:**
- Notification preferences (deliverable updates, milestone reminders)
- Preferred communication channel

## UI Components

### 1. SettingsSidebar

```typescript
// features/settings/components/SettingsSidebar.tsx

const settingsNav = {
  general: [
    { title: 'Profile', url: '/settings/profile', icon: 'User' },
    { title: 'Account', url: '/settings/account', icon: 'Settings' },
    { title: 'Notifications', url: '/settings/notifications', icon: 'Bell' },
    { title: 'Appearance', url: '/settings/appearance', icon: 'Palette' },
  ],
  developer: [ // only if role === 'dev'
    { title: 'Developer Profile', url: '/settings/developer', icon: 'Code' },
  ],
  partner: [ // only if role === 'dfy'
    { title: 'Partner Settings', url: '/settings/partner', icon: 'Handshake' },
  ],
  admin: [ // only if role === 'admin' or 'internal'
    { title: 'Team', url: '/settings/team', icon: 'Users' },
    { title: 'Company', url: '/settings/company', icon: 'Building' },
    { title: 'Integrations', url: '/settings/integrations', icon: 'Plug' },
  ],
}
```

### 2. AvatarUpload Component

```typescript
// features/settings/components/AvatarUpload.tsx

// Uses Supabase Storage
// Bucket: avatars
// Path: {user_id}/avatar.{ext}
// Max size: 2MB
// Allowed: jpg, png, webp
```

### 3. SkillsSelector (Dev)

```typescript
// features/settings/components/SkillsSelector.tsx

// Multi-select with suggestions
const SKILL_CATEGORIES = {
  frontend: ['React', 'Vue', 'Angular', 'Next.js', 'TypeScript'],
  backend: ['Node.js', 'Python', 'Go', 'PostgreSQL', 'MongoDB'],
  automation: ['n8n', 'Make', 'Zapier', 'Bubble', 'Airtable'],
  ai: ['OpenAI API', 'Claude API', 'LangChain', 'Vector DBs'],
}

// Uses TagInput component from blueprints
```

### 4. NotificationPreferences Component

```typescript
// features/settings/components/NotificationPreferences.tsx

// Grouped toggles
// Email: Project Updates, Mentions, Payments, Deliverables
// In-app: All above + Direct Messages
// WhatsApp: Enabled toggle + Critical Only toggle
```

### 5. AvailabilityControl (Dev)

```typescript
// features/settings/components/AvailabilityControl.tsx

// Radio group:
// 🟢 Available - "Accepting new projects"
// 🟡 Busy - "Near capacity, limited availability"
// 🔴 Unavailable - "Not taking new projects"
// 🔵 Away - "On vacation or leave"

// + Optional message field
// + Date range picker (available from/until)
```

## Integration with Existing Features

### 1. Conversations Integration

**User Presence Indicator:**
- Show online/offline status in conversations
- Use `last_seen_at` + WebSocket presence
- Green dot if `last_seen_at` < 5 minutes ago

**@Mentions in Messages:**
- Already exists in schema (`message_mentions`)
- Trigger notification based on user's preferences
- Show unread mention count in sidebar

**Direct Messages (Future):**
- Create DM conversations (not linked to projects)
- New table: `direct_conversations`
- Participants junction table

### 2. Developer Assignment

**Auto-Assignment Algorithm (Future):**
```sql
-- Find available dev with lowest capacity
SELECT p.id, p.name, da.current_capacity_pct
FROM profiles p
JOIN dev_availability da ON da.dev_id = p.id
WHERE p.role = 'dev'
  AND da.is_available = true
  AND da.auto_assign = true
  AND da.current_capacity_pct < 80
ORDER BY da.current_capacity_pct ASC
LIMIT 1;
```

### 3. DFY Partner Directory (Future)

**Public Partner Profiles:**
- List all DFY partners with bios
- Filter by commission tier, location, industry
- Show stats (deals closed, avg close time)
- Contact button → creates partner conversation

### 4. Team Management

**User Invitations:**
```sql
CREATE TABLE user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role user_role NOT NULL,
  invited_by UUID REFERENCES profiles(id),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  accepted_at TIMESTAMPTZ,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invite flow:
-- 1. Admin sends invite → creates invitation record
-- 2. Email sent with link: /accept-invite/[token]
-- 3. User signs up + token validates → profile created with role
```

## Implementation Phases

### Phase 1: Core Profile Settings (P0)

**Database:**
- [ ] Enhanced profiles migration (bio, timezone, location, phone, skills, preferences)
- [ ] dev_availability table
- [ ] Avatar storage bucket setup

**Pages:**
- [ ] `/settings/profile` - Edit name, bio, avatar, timezone, location
- [ ] `/settings/account` - Change password, view sessions
- [ ] `/settings/notifications` - Email/in-app preferences
- [ ] `/settings/appearance` - Theme, compact mode (reuse existing theme toggle)

**Components:**
- [ ] SettingsSidebar with role-based navigation
- [ ] AvatarUpload component
- [ ] NotificationPreferencesForm
- [ ] TimezoneSelector
- [ ] LocationInput (for Location Tag)

### Phase 2: Role-Specific Settings (P1)

**Developer:**
- [ ] `/settings/developer` page
- [ ] SkillsSelector component
- [ ] AvailabilityControl component
- [ ] Capacity dashboard

**DFY Partner:**
- [ ] `/settings/partner` page
- [ ] Performance dashboard widget
- [ ] Commission tier display (view-only)

**Admin:**
- [ ] `/settings/team` page (user list, roles, invite)
- [ ] `/settings/company` page (company info)
- [ ] User invitation system

### Phase 3: Advanced Features (P2)

- [ ] Active sessions management
- [ ] 2FA setup (Supabase Auth TOTP)
- [ ] WhatsApp integration (phone verification)
- [ ] DFY partner directory
- [ ] Auto-assignment algorithm
- [ ] Direct messages (DM conversations)
- [ ] Quiet hours enforcement
- [ ] Export user data (GDPR compliance)

## API Layer

```typescript
// lib/api/profiles.ts

export async function updateProfile(updates: ProfileUpdate) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', (await supabase.auth.getUser()).data.user?.id)
    .select()
    .single()
  return { data, error }
}

export async function updateNotificationPreferences(prefs: NotificationPrefs) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .update({ notification_preferences: prefs })
    .eq('id', (await supabase.auth.getUser()).data.user?.id)
  return { data, error }
}

export async function uploadAvatar(file: File) {
  const supabase = await createClient()
  const user = (await supabase.auth.getUser()).data.user
  if (!user) throw new Error('Not authenticated')

  const ext = file.name.split('.').pop()
  const path = `${user.id}/avatar.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true })

  if (uploadError) throw uploadError

  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(path)

  // Update profile with avatar URL
  await updateProfile({ avatar_url: publicUrl })

  return publicUrl
}

// lib/api/developer-availability.ts
export async function updateDevAvailability(updates: DevAvailabilityUpdate) {
  const supabase = await createClient()
  const user = (await supabase.auth.getUser()).data.user
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('dev_availability')
    .upsert({ dev_id: user.id, ...updates })
    .select()
    .single()
  return { data, error }
}
```

## Server Actions

```typescript
// features/settings/actions/profileActions.ts
'use server'

export async function updateProfileAction(formData: FormData) {
  const name = formData.get('name') as string
  const bio = formData.get('bio') as string
  const timezone = formData.get('timezone') as string
  const location = formData.get('location') as string

  const { data, error } = await updateProfile({ name, bio, timezone, location })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/settings/profile')
  return { success: true, data }
}

export async function uploadAvatarAction(formData: FormData) {
  const file = formData.get('avatar') as File
  if (!file) return { success: false, error: 'No file provided' }

  try {
    const url = await uploadAvatar(file)
    revalidatePath('/settings/profile')
    return { success: true, url }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
```

## Security Considerations

**RLS Policies:**
```sql
-- Profiles: Users can update their own profile
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admin can update any profile (for team management)
CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE USING (get_user_role() IN ('admin', 'internal'));

-- Dev availability: Devs can update their own, admins can update any
CREATE POLICY "dev_availability_update_own" ON dev_availability
  FOR UPDATE USING (dev_id = auth.uid() OR get_user_role() = 'admin')
  WITH CHECK (dev_id = auth.uid() OR get_user_role() = 'admin');

-- Hourly rate: Only admin can see/edit
-- Use a view to hide sensitive fields from devs
CREATE VIEW dev_profiles_public AS
SELECT id, name, skills, portfolio_url, availability_status
FROM profiles WHERE role = 'dev';

-- Admin gets full view including hourly_rate
```

**Field-Level Security:**
- `hourly_rate` - Admin only
- `commission_tier` - Admin write, DFY read
- `notification_preferences` - Own profile only
- `logo_url` - DFY can update own, admin can update any

## Future Enhancements

### Advanced Presence
- WebSocket-based real-time presence
- "Currently viewing this project" indicator
- Typing indicators in conversations

### Advanced Notifications
- Digest emails (daily/weekly summary)
- Slack integration
- Desktop push notifications (PWA)

### Profile Verification
- Email verification badges
- Phone verification (for WhatsApp)
- Identity verification (for high-value partners)

### Analytics
- User activity heatmap
- Login patterns
- Feature usage tracking

---

## Quick Start Checklist

To build Phase 1 (Core Profile Settings):

1. **Database:**
   - [ ] Create migration `20260107xxxxxx_enhanced_profiles.sql`
   - [ ] Run migration: `pnpm supabase db push`
   - [ ] Create `avatars` storage bucket in Supabase dashboard

2. **API Layer:**
   - [ ] Create `/lib/api/profiles.ts`
   - [ ] Create `/features/settings/actions/profileActions.ts`

3. **UI Components:**
   - [ ] Create `/features/settings/components/SettingsSidebar.tsx`
   - [ ] Create `/features/settings/components/AvatarUpload.tsx`
   - [ ] Create `/features/settings/components/NotificationPreferencesForm.tsx`

4. **Pages:**
   - [ ] Create `/app/(dashboard)/settings/layout.tsx`
   - [ ] Create `/app/(dashboard)/settings/profile/page.tsx`
   - [ ] Create `/app/(dashboard)/settings/account/page.tsx`
   - [ ] Create `/app/(dashboard)/settings/notifications/page.tsx`
   - [ ] Create `/app/(dashboard)/settings/appearance/page.tsx`

5. **Navigation:**
   - [ ] Update `/lib/navigation.ts` to add Settings link

6. **Test:**
   - [ ] Upload avatar as each role
   - [ ] Update bio, timezone, location
   - [ ] Toggle notification preferences
   - [ ] Verify RLS policies (dev can't see admin settings)
