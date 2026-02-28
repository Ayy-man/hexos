# Phase 17: Performance Optimization — Research

**Date:** 2026-02-28
**Source:** 4-agent parallel audit (bundle, waterfalls, re-renders, smoothness)

## Full audit findings

See: `/Users/aymanbaig/.claude/projects/-Users-aymanbaig-Desktop-Manual-Library-hexos-main/memory/performance-audit.md`

## Work Streams

### WS-1: Caching & Auth Dedup
- Wrap createClient() + getUser() in React.cache()
- Use requireRole() return value instead of re-calling getProfile()
- Eliminates 2-6 redundant auth round-trips per page

### WS-2: Bundle & Dynamic Imports
- next/dynamic for: onborda, cmdk, react-pdf, @react-pdf/renderer, recharts, cal-heatmap
- Add optimizePackageImports to next.config.ts (platejs, lucide-react, date-fns, recharts)
- Install @next/bundle-analyzer

### WS-3: Loading States
- Add loading.tsx to ~15 missing routes
- Use existing skeleton components where available, create minimal ones where not

### WS-4: Waterfall Fixes
- Conversation N+1 → batch/JOIN queries
- getUnreadConversationsSummary → single SQL aggregate
- Dashboard activityTrends into Promise.all
- Parallelize independent sequential awaits in server actions

### WS-5: Re-render Fixes
- HillChart 20fps timer → CSS @keyframes
- Fix isRefetching useCallback bug in useHillChartRealtime + useRequirementsRealtime
- Memoize CheckinPromptContext value
- Stabilize useOnlineUsers (compare before setState)
- Add React.memo to list item components
- Extract AppSidebar pathname subscription

### WS-6: CSS & Animation Fixes
- Add missing @keyframes shrink-width
- Define animate-pulse-glow and animate-fade-in-up
- Fix dual NotificationPopover mount
- Replace transition-all with specific properties
