# Mobile Optimization Overhaul

> Complete mobile UX redesign replacing the desktop sidebar-driven navigation with native mobile patterns: bottom tab bar, mobile-specific header, floating action button, swipe gestures, and optimized content layouts.

## Problem

The current mobile experience is a shrunk-down desktop layout. The sidebar opens as a Sheet drawer but doesn't auto-close on navigation, forcing users to manually dismiss it after every tap. There's no bottom tab bar, no mobile-native navigation patterns, and no touch-optimized interactions. The result is a clunky experience that feels like a website, not an app.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Bottom tab bar tabs | Dashboard, Inquiries, Projects, Conversations, More | Core daily-driver views; covers 80% of mobile usage |
| Notifications | Bell icon in header, not a tab | Saves a tab slot; ClickUp pattern; already have `NotificationPopover` |
| Sidebar on mobile | Completely removed | Bottom tab bar + More menu replaces it entirely; eliminates auto-close bug |
| More menu layout | Icon grid (non-admin) + grouped list (admin) | Visual for common items, compact for admin tools |
| Mobile header | 2-row: workspace + actions / search bar | Gives search prominence; contextual actions per page |
| Dashboard stats | Horizontal scroll strip | Native mobile pattern; saves vertical space |
| Page content | Card-based lists, no tables | Already using `ResponsiveTable` for this |
| Touch gestures | Swipe on list items for contextual actions | Moderate gesture support; power user efficiency |
| FAB | Floating above tab bar, right side | Quick-create from any screen; prominent but not intrusive |
| Desktop changes | None | Mobile-only changes gated by `useIsMobile()` |

## Architecture

### Navigation Structure

```
Mobile (< 768px):
  MobileHeader (sticky top)
    Row 1: "hexOS" label | [contextual action] [bell] [avatar]
    Row 2: [Search bar → opens command palette]

  Page Content (scrollable, full width)

  FloatingActionButton (fixed, bottom-right, above tab bar)

  MobileTabBar (fixed bottom, 56px + safe area)
    [Dashboard] [Inquiries] [Projects] [Conversations] [More]

Desktop (>= 768px):
  (unchanged — sidebar + header + content)
```

### Bottom Tab Bar

- Fixed position, 56px height, `z-50`
- Renders only below 768px via `useIsMobile()`
- Uses `usePathname()` for active tab highlighting
- Active tab: primary color icon + label; inactive: muted
- Safe area padding: `pb-[env(safe-area-inset-bottom)]` for iPhone home indicator
- Tabs:

| Tab | Icon (lucide) | Route | Badge |
|-----|---------------|-------|-------|
| Dashboard | `LayoutDashboard` | `/dashboard` | — |
| Inquiries | `MessageSquare` | `/inquiries` | Unread count |
| Projects | `FolderKanban` | `/projects` | — |
| Conversations | `MessagesSquare` | `/conversations` | Unread count |
| More | `Grid3x3` | Full-screen More menu | — |

### Mobile Header

Two-row sticky header replacing the current sidebar-trigger header on mobile:

**Row 1** (48px):
- Left: "hexOS" workspace label (or logo)
- Right: contextual action icon (per-page, optional) + notification bell (with badge) + profile avatar

**Row 2** (40px):
- Full-width search input (tappable, opens command palette as full-screen overlay)
- Subtle border/shadow separation from content below

Pages can inject one contextual action icon into Row 1:
- Inquiries: filter icon
- Projects: filter icon
- Conversations: compose icon
- Dashboard: none (clean)

### Floating Action Button

- 56px circular button, primary color (`#8860d0`)
- Positioned: `fixed bottom-20 right-4` (16px above tab bar)
- `z-40` (below tab bar)
- Plus icon, rotates 45deg on open
- Tap opens bottom drawer (vaul `Drawer`) with quick-create options:

**Quick-create options** (role-filtered):
- New Inquiry
- New Project
- New Conversation
- New Meeting

### More Menu

Full-screen view triggered by the "More" tab. Not a route — renders inline when More tab is active.

**Top section — Icon Grid** (3 columns):

| Item | Icon | Color | Route |
|------|------|-------|-------|
| Pulse | `Activity` | Blue | `/pulse` |
| Blueprints | `FileCode` | Purple | `/blueprints` |
| Case Studies | `BookOpen` | Green | `/case-studies` |
| Meetings | `Video` | Orange | `/meetings` |
| Suggestions | `Lightbulb` | Yellow | `/suggestions` |
| Finances | `DollarSign` | Emerald | `/finances` |

Each tile: rounded-lg surface card, 44px colored icon, label below. Tap navigates to route and switches context (More tab stays highlighted).

**Bottom section — Admin List** (admin/internal users only):
- Section header: "Admin"
- List items with chevron: Blockers, Devs, Team, Partners, Applications
- Routes: `/admin/blockers`, `/admin/devs`, `/admin/team`, `/admin/partners`, `/admin/applications`

### Content Patterns

**Dashboard**:
- Stat cards in `HorizontalScrollStrip`: horizontally scrollable, snap-to-card, overflow hidden with peek
- Cards: Total, Active, On Track, At Risk, Behind
- Below: vertically stacked section cards (All Projects, Pending Proposals, etc.)
- Each section tappable to navigate

**List Pages** (Inquiries, Projects, Conversations):
- Full-width card list (existing `ResponsiveTable` card rendering)
- `SwipeableCard` wrapper with per-page actions:

| Page | Swipe Left Actions |
|------|--------------------|
| Inquiries | Archive, Mark Read |
| Conversations | Mute, Pin |
| Projects | Quick status change |

- Swipe reveals action buttons with colored backgrounds (red for destructive, blue for neutral)
- 80px swipe threshold to reveal, spring-back if not committed
- `navigator.vibrate(10)` haptic feedback on threshold hit (if available)

**Forms & Dialogs**:
- No changes — existing `ResponsiveDialog` (bottom drawer on mobile, modal on desktop) continues to work

## New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `MobileTabBar` | `components/mobile/tab-bar.tsx` | Bottom navigation bar |
| `MobileHeader` | `components/mobile/header.tsx` | 2-row mobile header |
| `MobileMoreMenu` | `components/mobile/more-menu.tsx` | Grid + list More view |
| `FloatingActionButton` | `components/mobile/fab.tsx` | Quick-create FAB + drawer |
| `SwipeableCard` | `components/mobile/swipeable-card.tsx` | Swipe-to-reveal wrapper |
| `HorizontalScrollStrip` | `components/mobile/scroll-strip.tsx` | Snap-scroll horizontal container |

## Modified Components

| Component | Change |
|-----------|--------|
| `app/(dashboard)/layout.tsx` | Conditionally render `MobileTabBar` + `MobileHeader` on mobile, existing sidebar + header on desktop |
| `components/ui/sidebar.tsx` | Add `hidden md:flex` to sidebar root; remove `SidebarTrigger` from mobile |
| Dashboard page | Wrap stat cards in `HorizontalScrollStrip` on mobile |

## Unchanged

- Desktop layout (sidebar, header, breadcrumbs)
- `ResponsiveDialog` / `ResponsiveTable`
- Routing structure (same routes, different navigation chrome)
- Backend / API logic
- Service worker / PWA config

## Implementation Phases

### Phase 1 — Foundation (highest impact)

- Create `MobileTabBar` with 5 tabs and active state
- Hide sidebar on mobile (`hidden md:flex`), remove `SidebarTrigger` from mobile header
- Create `MobileHeader` with workspace label, search bar, notification bell, avatar
- Add safe area inset handling for iPhone
- Wire up `usePathname()` for active tab highlighting
- Add bottom padding to main content so it's not obscured by tab bar

**Ship criteria**: Users can navigate the app entirely via bottom tab bar on mobile. Sidebar is gone. Header shows search + notifications.

### Phase 2 — More Menu & FAB

- Create `MobileMoreMenu` with icon grid + admin grouped list
- Create `FloatingActionButton` with quick-create bottom drawer
- Role-based filtering for More menu items and FAB create options
- FAB positioning and animation (rotate icon on open)

**Ship criteria**: All routes are accessible on mobile. Users can quick-create from any screen.

### Phase 3 — Content Optimization

- Create `HorizontalScrollStrip` for dashboard stat cards
- Audit all pages for mobile card layout (ensure `ResponsiveTable` is used everywhere)
- Mobile-optimized spacing/padding pass (reduce `p-8` areas, tighten gaps)
- Ensure all touch targets are 44px+ minimum

**Ship criteria**: Dashboard feels native with horizontal scroll. All pages have proper mobile spacing.

### Phase 4 — Swipe & Polish

- Create `SwipeableCard` with touch event handlers and CSS transforms
- Implement per-page swipe actions (Inquiries, Conversations, Projects)
- Add haptic feedback via `navigator.vibrate()`
- Transition animations on tab switches
- Micro-interactions (FAB bounce on first visit, tab bar entrance animation)

**Ship criteria**: List items have swipe actions. Interactions feel polished and native.

## Technical Notes

- All mobile components gated by `useIsMobile()` hook (existing, 768px breakpoint)
- No new dependencies required — swipe via touch events, drawer via existing `vaul`
- Tab bar uses semantic `<nav>` with `role="tablist"` for accessibility
- FAB gets `aria-label="Create new item"`
- Bottom tab bar z-index: `z-50`; FAB z-index: `z-40`
- Main content needs `pb-20` on mobile to clear tab bar + FAB
- CSS custom property `--mobile-tab-bar-height: 56px` for consistent spacing
