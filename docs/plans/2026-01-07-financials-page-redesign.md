# Financials Page Redesign

## Problem Statement

Current state:
- Financials is a tab within the crowded Analytics/Metrics page
- 9+ metric cards create visual overload
- Expense tracking buried at bottom
- No clear hierarchy or workflow
- Charts show "Invalid Date"

## Proposed Solution

**Dedicated `/dashboard/admin/financials` route** with focused financial management.

---

## Page Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  Financials                                        [Date Range] │
│  Real-time financial health and expense management              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────────┐│
│  │ $125,000    │ │ $98,500     │ │ 78.8%       │ │ $26,500    ││
│  │ Revenue     │ │ Net Profit  │ │ Margin      │ │ Expenses   ││
│  │ ↑12% MTD    │ │ ↑8% MTD     │ │ Healthy     │ │ ↓3% MTD    ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └────────────┘│
│                                                                 │
│  ┌─────────────────────────────┐ ┌─────────────────────────────┐│
│  │ ALERTS                      │ │ CASH FLOW (next 90 days)    ││
│  │ ⚠ 2 overdue ($4,500)       │ │ [=========Area Chart=======]││
│  │ ⏰ 3 due this week ($8,000) │ │ Expected in: $45,000        ││
│  └─────────────────────────────┘ │ Expected out: $12,000       ││
│                                  └─────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ [Revenue] [Expenses] [Projects] [Payment Sources]    [+Add] ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │                                                             ││
│  │  < Tab Content Area - Excel Tables >                        ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## Section Breakdown

### 1. Hero Metrics (4 cards only)

| Metric | Primary | Secondary | Color Logic |
|--------|---------|-----------|-------------|
| **Revenue** | Total all-time | MTD change % | Always neutral |
| **Net Profit** | Revenue - Expenses | MTD change % | Green if positive, Red if negative |
| **Margin** | Profit / Revenue | Health label | Green ≥20%, Amber 10-20%, Red <10% |
| **Expenses** | Total all-time | MTD change % | Neutral (red accent) |

### 2. Alerts Banner

Sticky, always visible when there are issues:

```
┌──────────────────────────────────────────────────────────────┐
│ ⚠️ 2 overdue payments ($4,500)  │  ⏰ 3 due this week ($8k)  │
│    [View Details]               │     [View Details]         │
└──────────────────────────────────────────────────────────────┘
```

- Click expands to show specific invoices
- Dismissable per-session (but comes back on reload if still overdue)

### 3. Cash Flow Chart

Simple area chart showing:
- X-axis: Next 90 days (or selectable range)
- Y-axis: Running balance
- Two lines: Expected In (payment milestones), Expected Out (recurring expenses)
- Hover shows specific milestones/expenses on that date

### 4. Tabbed Data Tables

**Tab: Revenue**
- Payment milestones by project
- Status: Paid / Pending / Overdue
- Actions: Mark as paid, Send reminder

**Tab: Expenses** (current ExpenseLedger)
- Excel-style table
- Filter by project, category, date range
- Add/Edit/Delete inline
- CSV export

**Tab: Projects**
- Project profitability view
- Columns: Project | Revenue | Expenses | Net | Margin %
- Click to see project breakdown

**Tab: Payment Sources**
- Manage cards/accounts
- Add new payment source
- See spending by source

---

## Data Architecture

### Shared with Analytics

Keep these in Analytics/Metrics:
- Inquiry pipeline
- Project health
- Team utilization
- Deliverables/Blockers

### Financials-only

Move these to dedicated Financials page:
- Revenue tracking
- Expense tracking
- Profit calculations
- Cash flow projections
- Payment management

---

## Navigation Update

```
Sidebar:
├── Dashboard
├── Projects
├── Inquiries
├── Conversations
├── Team
├── Analytics      ← Pipeline, Projects, Team metrics
├── Financials     ← NEW: Revenue, Expenses, Profit
└── Settings
```

---

## Component Reuse

| Component | Current Location | Reuse |
|-----------|------------------|-------|
| HeroMetrics | metrics/HeroMetrics.tsx | Extract 4 financial cards |
| ExpenseLedger | metrics/ExpenseLedger.tsx | Move to financials/ |
| ExcelTable | components/ui/excel-style-table.tsx | Shared |
| Charts | metrics/tabs/*.tsx | Extract chart configs |

---

## Implementation Steps

1. **Create route**: `/dashboard/admin/financials`
2. **Create page component**: `FinancialsPage.tsx`
3. **Extract financial hero cards** from HeroMetrics
4. **Move ExpenseLedger** to new page
5. **Add Revenue tab** with payment milestones
6. **Add Projects tab** with profitability view
7. **Add Payment Sources tab** for card management
8. **Add Cash Flow chart** with projections
9. **Add Alerts banner** for overdue/upcoming
10. **Update sidebar navigation**
11. **Remove financials from Analytics page** (keep link)

---

## Design Principles

1. **Single purpose**: This page is about money, nothing else
2. **Actionable**: Every section leads to an action (pay, log, review)
3. **Scannable**: Key numbers visible at glance, details on demand
4. **Consistent**: One color scheme (green=good, red=bad, amber=warning)
5. **Exportable**: Every table can be exported to CSV

---

## Future Enhancements

- [ ] Stripe integration for automatic payment tracking
- [ ] Recurring expense templates
- [ ] Budget vs actual tracking
- [ ] Invoice generation
- [ ] Bank feed import
- [ ] Multi-currency support
