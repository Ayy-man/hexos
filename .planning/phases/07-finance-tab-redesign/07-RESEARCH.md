# Phase 07: Finance Tab Redesign - Research

**Researched:** 2026-01-19
**Domain:** UI/UX redesign for financial metrics dashboard
**Confidence:** HIGH

## Summary

The Finance Tab lives within the Admin Metrics Dashboard (`/dashboard/admin/metrics`) as the "Financials" tab. The current implementation displays financial metrics across 4 rows of cards plus tables, creating significant cognitive load. The cards use default sizing and occupy full width, making the dashboard feel overwhelming.

The redesign goal is to reduce cognitive load by:
1. Using narrower cards with clear visual hierarchy
2. Grouping metrics logically (Revenue, Costs, Timeline)
3. Leveraging the existing shadcn/ui Card `size="sm"` variant for more compact displays

**Primary recommendation:** Restructure the FinancialsTab into 3 logical card groups (Revenue, Costs, Timeline) using the existing Card `size="sm"` variant and a narrower grid layout (5-6 columns instead of 3-4), with clear section headers.

## Current Implementation Analysis

### File Locations

| File | Purpose |
|------|---------|
| `/features/admin/components/metrics/tabs/FinancialsTab.tsx` | Main finance tab component (445 lines) |
| `/features/admin/components/metrics/HeroMetrics.tsx` | Top-level KPI cards (always visible) |
| `/features/admin/components/metrics/MetricsDashboard.tsx` | Parent dashboard with tabs |
| `/features/admin/components/metrics/ExpenseLedger.tsx` | Expense management table |
| `/features/admin/components/metrics/InvoiceManagement.tsx` | Invoice management |
| `/app/(dashboard)/dashboard/admin/metrics/page.tsx` | Page that fetches all data |

### Current Card Layout

**HeroMetrics.tsx (always visible above tabs):**
- Row 1: 4 cards (Total Revenue, Projected Revenue, Pending Payments, Active Projects)
- Row 2: 3 cards (Payable This Month, Payable Next Month, Sales Metrics)
- Row 3: 3 cards (Net Profit, Profit Margin, Total Expenses)

**FinancialsTab.tsx (within Financials tab):**
- Row 1: 4 cards (Total Pending, Overdue, Due This Month, Due Next Month)
- Row 2: 2 chart cards (Payment Forecast, Revenue Trend)
- Row 3: Full-width table (Pending Payments by Project)
- Row 4: Conditional overdue table
- Row 5: Invoice Management
- Row 6: Expense Ledger

### Current Metrics Displayed

**Revenue Group (scattered across HeroMetrics + FinancialsTab):**
- Total Revenue
- Revenue This Month
- Projected Revenue
- Win Rate
- Avg Ticket Size

**Costs Group (scattered):**
- Total Expenses
- Expenses This Month
- Net Profit
- Profit Margin

**Timeline/Receivables Group (in FinancialsTab):**
- Pending Payments
- Payable This Month
- Payable Next Month
- Overdue Payments
- Payment Forecast chart

### Data Sources

All financial data flows from:
1. `lib/api/financial-metrics.ts` - Core API functions
2. `features/admin/actions/financialActions.ts` - Server actions
3. Supabase RPC functions:
   - `get_financial_hero_metrics` - Main financial KPIs
   - `get_payment_timeline` - Future payment projections
   - `get_revenue_trend` - Historical revenue
   - `get_overdue_payments` - Overdue milestone list
   - `get_expense_summary` - Expense totals by category

### TypeScript Interfaces

```typescript
interface FinancialHeroMetrics {
  total_revenue: number;
  revenue_this_month: number;
  pending_payments: number;
  payable_this_month: number;
  payable_next_month: number;
  projected_revenue: number;
  win_rate: number;
  avg_ticket_size: number;
  active_inquiries: number;
  total_expenses: number;
  expenses_this_month: number;
  net_profit: number;
  profit_margin: number;
}
```

## Standard Stack

### Core (Already in Use)
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| shadcn/ui Card | Latest | Card container | Has `size="sm"` variant |
| recharts | ^2.x | Charts | Used for BarChart, AreaChart |
| lucide-react | ^0.x | Icons | Consistent icon library |

### Supporting
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| @/components/ui/chart | Custom | Chart wrappers | ChartContainer, ChartTooltip |
| cn utility | - | Class merging | For conditional styling |

### No New Dependencies Needed

The redesign can be accomplished entirely with existing shadcn/ui components and patterns already in the codebase.

## Architecture Patterns

### Recommended Card Structure

```
FinancialsTab
├── Revenue Section (header + 4-5 narrow cards)
│   ├── Total Revenue
│   ├── This Month
│   ├── Projected
│   └── Win Rate / Avg Ticket
├── Costs Section (header + 3-4 narrow cards)
│   ├── Total Expenses
│   ├── This Month
│   ├── Net Profit
│   └── Margin
├── Timeline Section (header + visual timeline)
│   ├── Overdue Alert (if any)
│   ├── Due This Month
│   ├── Due Next Month
│   └── Payment Forecast Chart
└── Tables Section (collapsible)
    ├── Pending by Project
    ├── Invoice Management
    └── Expense Ledger
```

### Recommended Grid Layouts

```tsx
// Narrow card grid (5-6 columns on large screens)
<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
  <Card size="sm">...</Card>
</div>

// Section headers
<div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
  <Icon className="h-4 w-4" />
  <span>Revenue</span>
</div>
```

### Card Size="sm" Variant Details

The existing Card component supports a `size` prop:

```tsx
// card.tsx already supports size="sm":
// - gap-4 instead of gap-6
// - py-4 instead of py-6
// - px-4 instead of px-6 for CardHeader, CardContent, CardFooter
// - text-sm for CardTitle

<Card size="sm">
  <CardHeader className="pb-1">
    <CardDescription className="text-xs">Revenue</CardDescription>
    <CardTitle className="text-lg">${value}</CardTitle>
  </CardHeader>
</Card>
```

### Visual Hierarchy Pattern from Codebase

From `/app/(dashboard)/dashboard/admin/page.tsx`:

```tsx
// Compact stat cards with colored accents
<Card className="py-3">
  <CardContent className="p-0 px-4 flex items-center justify-between">
    <div>
      <p className="text-xs text-muted-foreground">Label</p>
      <p className="text-xl font-bold tabular-nums">{value}</p>
    </div>
    <Icon className="h-5 w-5 text-muted-foreground" />
  </CardContent>
</Card>

// With colored borders for status
<Card className="py-3 border-green-200 bg-green-50/30 dark:border-green-900 dark:bg-green-950/30">
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Compact cards | Custom card component | `<Card size="sm">` | Already implemented in card.tsx |
| Status colors | Inline color styles | CSS variables (--success, --warning, --error) | Theme consistency |
| Currency formatting | Manual formatting | `formatCurrency` from financial-metrics-utils | Already handles USD, no decimals |
| Responsive grids | Complex media queries | Tailwind `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5` | Standard pattern |

## Common Pitfalls

### Pitfall 1: Duplicate Metrics Between HeroMetrics and FinancialsTab

**What goes wrong:** Some metrics appear in both HeroMetrics (always visible) and FinancialsTab, creating redundancy.

**Why it happens:** HeroMetrics was designed to show critical KPIs regardless of active tab, but FinancialsTab also shows financial metrics.

**How to avoid:**
- Keep HeroMetrics focused on cross-domain alerts (overdue payments, critical blockers)
- Move all detailed financial metrics into FinancialsTab with proper grouping
- Or remove financial metrics from HeroMetrics when Financials tab is active

**Warning signs:** Users seeing same number twice on screen.

### Pitfall 2: Cards Too Wide for Quick Scanning

**What goes wrong:** Current 4-column layout means each card is ~25% screen width, too wide for simple numbers.

**Why it happens:** Default responsive grid without considering content density.

**How to avoid:** Use 5-6 column grids with `size="sm"` cards for numeric KPIs. Reserve wider cards only for charts and tables.

### Pitfall 3: No Visual Grouping

**What goes wrong:** All cards look the same, no clear sections.

**Why it happens:** Missing section headers and visual separators.

**How to avoid:** Add section headers with icons, use subtle background colors for groups, add spacing between sections.

### Pitfall 4: Charts Dominating Above-the-Fold

**What goes wrong:** Large charts push important numbers below the fold.

**Why it happens:** Charts given equal or more prominence than key metrics.

**How to avoid:** KPI cards first, charts below. Consider sparklines instead of full charts for inline trends.

## Code Examples

### Narrow Card Pattern (from admin dashboard)

```tsx
// Source: app/(dashboard)/dashboard/admin/page.tsx
<Card className="py-3">
  <CardContent className="p-0 px-4 flex items-center justify-between">
    <div>
      <p className="text-xs text-muted-foreground">Total</p>
      <p className="text-xl font-bold tabular-nums">{stats.total}</p>
    </div>
    <FolderKanban className="h-5 w-5 text-muted-foreground" />
  </CardContent>
</Card>
```

### Colored Status Card Pattern

```tsx
// Source: app/(dashboard)/dashboard/admin/page.tsx
<Card className="py-3 border-green-200 bg-green-50/30 dark:border-green-900 dark:bg-green-950/30">
  <CardContent className="p-0 px-4 flex items-center justify-between">
    <div>
      <p className="text-xs text-green-600 dark:text-green-400">On Track</p>
      <p className="text-xl font-bold text-green-600 tabular-nums">{onTrackCount}</p>
    </div>
    <CheckCircle2 className="h-5 w-5 text-green-500" />
  </CardContent>
</Card>
```

### Section Header Pattern

```tsx
// Recommended pattern for grouping
<div className="space-y-3">
  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
    <DollarSign className="h-4 w-4" />
    <span>Revenue</span>
  </div>
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
    {/* Narrow cards */}
  </div>
</div>
```

### Card size="sm" Usage

```tsx
// Source: components/ui/card.tsx - existing implementation
<Card size="sm">
  <CardHeader className="pb-1">
    <CardDescription className="text-xs">Label</CardDescription>
    <CardTitle className="text-lg font-mono tabular-nums">$50,000</CardTitle>
  </CardHeader>
</Card>
```

## Design System Colors

From `globals.css`, use semantic colors for status:

| Status | CSS Variable | Use For |
|--------|--------------|---------|
| Success | `--success` | Positive numbers, on-track |
| Warning | `--warning` | Due soon, pending |
| Error | `--error` | Overdue, negative |
| Info | `--info` | Neutral, informational |

```tsx
// Usage
<span className="text-success">+$5,000</span>
<span className="text-error">-$2,000</span>
<span className="text-warning">$3,000 due</span>
```

## Recommended Groupings

### Group 1: Revenue (Green/Success Theme)
- Total Revenue (all time)
- Revenue This Month
- Projected Revenue
- Win Rate
- Avg Ticket Size

### Group 2: Costs (Red/Error Theme)
- Total Expenses
- Expenses This Month
- Net Profit (can be positive/negative)
- Profit Margin (percentage)

### Group 3: Timeline (Yellow/Warning Theme)
- Overdue (alert if > 0)
- Payable This Month
- Payable Next Month
- Pending Total
- Payment Forecast (mini chart or sparkline)

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Full-width cards | Narrower, compact cards | Better scanability |
| No grouping | Logical sections | Reduced cognitive load |
| Large charts first | KPIs first, charts below | Important info above fold |
| Same styling for all | Color-coded by type | Visual differentiation |

## Open Questions

1. **HeroMetrics Overlap**
   - What we know: HeroMetrics shows financial data always, FinancialsTab shows more
   - What's unclear: Should financial metrics be removed from HeroMetrics when on Financials tab?
   - Recommendation: Keep alerts (overdue) in HeroMetrics, move detailed metrics to tab only

2. **Chart Placement**
   - What we know: Payment Forecast and Revenue Trend charts take significant space
   - What's unclear: Should charts be collapsed by default or always visible?
   - Recommendation: Keep charts visible but below KPI cards, consider sparklines inline

## Sources

### Primary (HIGH confidence)
- `/features/admin/components/metrics/tabs/FinancialsTab.tsx` - Current implementation
- `/features/admin/components/metrics/HeroMetrics.tsx` - Current KPI cards
- `/components/ui/card.tsx` - Card size="sm" variant
- `/app/globals.css` - Theme colors and semantic variables
- `/agent_docs/conventions.md` - Responsive patterns

### Secondary (MEDIUM confidence)
- `/app/(dashboard)/dashboard/admin/page.tsx` - Compact card pattern reference
- `/lib/api/financial-metrics.ts` - Data types and sources

## Metadata

**Confidence breakdown:**
- Current implementation: HIGH - Direct code inspection
- Card patterns: HIGH - Existing code in codebase
- Grouping recommendations: MEDIUM - UX best practice, not validated
- Color usage: HIGH - Defined in globals.css

**Research date:** 2026-01-19
**Valid until:** 2026-02-19 (stable codebase, internal project)
