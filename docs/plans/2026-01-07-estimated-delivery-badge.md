# Estimated Delivery Badge

## Overview

Dynamic delivery date estimation for projects that:
- Calculates estimated delivery based on `target_delivery_date` + overdue deliverable delays
- Shows current phase AND health status (On Track / At Risk / Delayed)
- Allows manual override (admin only)

## Location

Project detail page → Overview tab (replaces simple "Target Delivery" card)

## Calculation Logic

```
if (delivery_date_override) {
  estimatedDelivery = delivery_date_override
} else {
  estimatedDelivery = target_delivery_date + totalDelayDays
}

totalDelayDays = sum of (today - due_date) for each overdue deliverable where status != 'done'
```

## Status Thresholds

| Status | Delay Days | Color | Description |
|--------|------------|-------|-------------|
| On Track | 0-2 days | Green (emerald-500) | No significant delays |
| At Risk | 3-6 days | Amber (amber-500) | Minor delays accumulating |
| Delayed | 7+ days | Red (red-500) | Significant delays |

## Database Schema

```sql
-- Migration: 20260108000005_delivery_date_override.sql
ALTER TABLE projects ADD COLUMN IF NOT EXISTS delivery_date_override DATE;
```

## Files

| File | Purpose |
|------|---------|
| `components/ui/estimated-delivery-badge.tsx` | Badge component with animated border |
| `lib/utils/deliveryEstimate.ts` | Calculation utilities |
| `app/globals.css` | Animations (sliding-border, pulse-glow, fade-in-up) |
| `features/projects/actions/projectActions.ts` | `updateDeliveryOverrideAction` |
| `features/projects/components/tabs/OverviewTab.tsx` | Integration point |

## Component Props

```typescript
interface EstimatedDeliveryBadgeProps {
  estimatedDate: Date | null
  targetDate?: Date | null
  delayDays: number
  status: 'on_track' | 'at_risk' | 'delayed'
  phase: string
  isOverride?: boolean
  onEditClick?: () => void  // Admin only
}
```

## Utility Functions

```typescript
// lib/utils/deliveryEstimate.ts

calculateDeliveryEstimate(
  targetDate: string | null,
  overrideDate: string | null,
  deliverables: Array<{ due_date: string | null; status: string }>
): DeliveryEstimate

getDeliveryStatus(delayDays: number): 'on_track' | 'at_risk' | 'delayed'

getStatusColors(status: DeliveryStatus): { border, bg, text, pill }

getStatusLabel(status: DeliveryStatus): string

formatDeliveryDate(date: Date | null): string

getDayOfWeek(date: Date | null): string
```

## Visual Design

```
┌─────────────────────────────────────────────────────────┐
│  ╭──────────────────────────────────────────────────╮  │
│  │  🕐  Estimated Delivery              [On Track]  │  │ ← animated border
│  │      January 15, 2026                            │  │
│  │      Friday · Development                   ✏️   │  │ ← edit (admin)
│  ╰──────────────────────────────────────────────────╯  │
│                                                         │
│  Original target: January 10, 2026 • 5 days behind     │ ← shown when delayed
└─────────────────────────────────────────────────────────┘
```

## Admin Override Dialog

Admins can click the edit icon to:
1. Set a manual delivery date override
2. Clear the override to use calculated estimate
3. See current overdue deliverables count and delay impact

## CSS Animations

```css
/* Sliding animated border */
@keyframes sliding-border {
  0% { stroke-dashoffset: 1; }
  100% { stroke-dashoffset: 0; }
}

/* Soft pulsing glow on icon */
@keyframes pulse-glow {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* Fade in with slight upward motion */
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
```

## Setup

Run migration in Supabase SQL Editor:

```sql
ALTER TABLE projects ADD COLUMN IF NOT EXISTS delivery_date_override DATE;
```
