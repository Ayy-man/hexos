# Role-Based Avatar & Profile Peek System

## Problem

User identity across hexOS is fragmented:
- 6+ different avatar implementations (hardcoded cyan, dicebear random, initials-only, direct img tags)
- Zero role-based visual indicators — you can't tell at a glance if someone is admin, dev, DFY, or client
- `avatar_url` exists in DB with upload/remove functions but isn't wired into most components
- No way to quickly inspect who someone is without navigating away

## Solution

Three new primitives + one data fix:

1. **Role Color Config** — single source of truth for role → color mapping
2. **RoleAvatar** — composite component wrapping existing Avatar with role ring + avatar_url
3. **ProfilePeek** — GSAP-animated hover card showing expanded profile info
4. **Profile type fix** — add `avatar_url` to the auth Profile type

## Design Decisions

- **Brand-aligned subtle palette**: teal (admin), slate (internal), sky (dev), amber (dfy), stone (client)
- **Ring only, no text pills**: role color communicated via 2px ring. Text labels only in ProfilePeek card, activity log, and team management
- **Click-to-expand popover**: clicking any avatar opens ProfilePeek with name, role badge, online status, location, and quick actions (Message, View Profile)
- **Full platform rollout**: all 12 avatar surfaces across 3 tiers

## Role Color Tokens

```typescript
// lib/constants/role-colors.ts
export const ROLE_COLORS = {
  admin:    { ring: 'ring-teal-400',   bg: 'bg-teal-400/15',   text: 'text-teal-400',   dot: 'bg-teal-400',   label: 'Admin'        },
  internal: { ring: 'ring-slate-400',  bg: 'bg-slate-400/15',  text: 'text-slate-400',  dot: 'bg-slate-400',  label: 'Internal'     },
  dev:      { ring: 'ring-sky-400',    bg: 'bg-sky-400/15',    text: 'text-sky-400',    dot: 'bg-sky-400',    label: 'Developer'    },
  dfy:      { ring: 'ring-amber-400',  bg: 'bg-amber-400/15',  text: 'text-amber-400',  dot: 'bg-amber-400',  label: 'DFY Partner'  },
  client:   { ring: 'ring-stone-400',  bg: 'bg-stone-400/15',  text: 'text-stone-400',  dot: 'bg-stone-400',  label: 'Client'       },
} as const
```

## Components

### RoleAvatar

Composite component. Does NOT modify existing `components/ui/avatar.tsx`.

```
Props:
  - role: UserRole (required)
  - name: string (for initials fallback)
  - avatarUrl?: string | null
  - size?: 'sm' | 'default' | 'lg'
  - showProfilePeek?: boolean (default true)
  - profileData?: { email, location, onlineStatus, userId }
```

Renders: `Avatar` + `AvatarImage` (if avatarUrl) + `AvatarFallback` (initials) + `ring-2 {ROLE_COLORS[role].ring}`

### ProfilePeek Card Content

When `showProfilePeek` is true, wraps RoleAvatar in ProfilePeek component:

```
┌──────────────────────────────┐
│  [Large Avatar w/ ring]      │
│  John Smith                  │
│  [Admin]  ← role pill        │
│  ● Online · San Francisco    │
│                              │
│  [Message]    [View Profile] │
└──────────────────────────────┘
```

- Role pill uses `ROLE_COLORS[role].bg` + `ROLE_COLORS[role].text`
- "Message" opens/creates direct conversation
- "View Profile" navigates to profile page

## Affected Surfaces (12 total)

### Tier 1 — High frequency
1. `components/nav-user.tsx` — sidebar user menu
2. `features/conversations/components/MessageItem.tsx` — chat messages
3. `components/team-presence.tsx` — online team widget
4. `components/notifications/NotificationItem.tsx` — notification list

### Tier 2 — Contextual
5. `components/ui/comment.tsx` — editor comments
6. `features/inquiries/components/CommentsSidebar.tsx` — inquiry comments
7. `features/projects/components/files-tab/FileSidebar.tsx` — file access indicators
8. `features/admin/activity-log/components/ActivityLogContent.tsx` — activity feed

### Tier 3 — Management
9. `app/(dashboard)/admin/team/page.tsx` — team management
10. `app/(dashboard)/projects/page.tsx` — project list (assigned dev)
11. `components/mobile/avatar-menu.tsx` — mobile nav
12. `components/notifications/NotificationToast.tsx` — toast notifications

## Data Fix

Add `avatar_url` to `Profile` type in `lib/auth/types.ts`:

```typescript
export interface Profile {
  id: string
  name: string
  email: string
  role: UserRole
  avatar_url?: string | null  // ← add this
  logo_url?: string | null
  city?: string | null
  country?: string | null
  timezone?: string | null
  created_at: string
  last_seen_at?: string | null
}
```

This field already exists in the DB and `lib/api/profiles.ts` has `uploadAvatar()` / `removeAvatar()`.

## Implementation Order

1. Create `lib/constants/role-colors.ts`
2. Fix `Profile` type to include `avatar_url`
3. Create `components/ui/role-avatar.tsx` (RoleAvatar)
4. Create `components/ui/profile-peek-card.tsx` (the card content for ProfilePeek)
5. Integrate Tier 1 surfaces (nav-user, MessageItem, team-presence, NotificationItem)
6. Integrate Tier 2 surfaces (comments, inquiry comments, files, activity log)
7. Integrate Tier 3 surfaces (team mgmt, projects, mobile, toasts)

## Dependencies

- `gsap` + `@gsap/react` — already installed for ProfilePeek animation
- All other deps already in project (radix-ui, lucide-react, etc.)
