# Expense Tracking System Design

## Overview

Add expense tracking to hexOS to calculate true project profitability. Expenses are logged via Excel-style editable tables, visible both globally (Admin → Financials) and per-project.

## Data Model

### `payment_sources` table

Predefined cards/accounts for consistent reporting.

```sql
payment_sources (
  id          uuid primary key default gen_random_uuid()
  name        text not null        -- "Chase Business Checking"
  label       text not null        -- "Chase ***4521" (display)
  type        text                 -- 'credit_card', 'debit', 'bank_account'
  is_active   boolean default true
  created_at  timestamptz default now()
)
```

### `expenses` table

```sql
expenses (
  id              uuid primary key default gen_random_uuid()
  created_at      timestamptz default now()
  updated_at      timestamptz default now()

  date            date not null
  description     text not null
  amount          numeric(10,2) not null
  category        text not null check (category in ('direct_cost', 'contractor', 'tools_ops', 'other'))

  project_id      uuid references projects(id) on delete set null  -- nullable for overhead
  payment_source_id uuid references payment_sources(id) not null
  paid_by         uuid references profiles(id)
  reimbursed      boolean default false
  receipt_url     text                          -- storage path

  created_by      uuid references profiles(id)
)
```

### Database functions

```sql
-- Get total expenses for a project
get_project_expenses(p_project_id uuid) -> numeric

-- Get expenses summary for metrics
get_expense_summary() -> {
  total_expenses: numeric,
  expenses_this_month: numeric,
  by_category: { category: text, total: numeric }[]
}

-- Update financial hero metrics to include profit
get_financial_hero_metrics() -> adds:
  - total_expenses
  - net_profit (total_revenue - total_expenses)
  - profit_margin
```

## UI Components

### Global Expense Ledger (Admin → Financials tab)

Location: New section in FinancialsTab or dedicated sub-tab

```
┌─────────────────────────────────────────────────────────────┐
│  Expense Ledger                         [+ Add] [Export CSV]│
├─────────────────────────────────────────────────────────────┤
│  Filters: [All Projects ▼] [All Categories ▼] [This Month ▼]│
├────┬────────┬─────────────────┬──────────┬────────┬────────┤
│  # │ Date   │ Description     │ Project  │ Card   │ Amount │
├────┼────────┼─────────────────┼──────────┼────────┼────────┤
│  1 │ Jan 3  │ Cursor license  │ Overhead │ Amex   │ $20    │
│  2 │ Jan 3  │ Vercel hosting  │ Acme Co  │ Chase  │ $50    │
│  3 │ Jan 5  │ DFY payment     │ Acme Co  │ Chase  │ $800   │
└────┴────────┴─────────────────┴──────────┴────────┴────────┘
```

Uses `ExcelTable` component with `editable={true}`.

### Project Expenses Tab

Location: Project detail page → new "Expenses" tab

Shows filtered view of expenses for that project only. Can add new expenses directly (project pre-selected).

### Updated Metrics Dashboard

**Hero Metrics additions:**
- Total Expenses (new card)
- Net Profit (new card)
- Profit Margin % (new card or subtitle)

**Pending Payments table additions:**
| Column | Shows |
|--------|-------|
| Expenses | Sum of project's expenses |
| Net | Revenue - Expenses |

## Component Integration

The `ExcelTable` component (`components/ui/excel-style-table.tsx`) is now available with:

- `data: string[][]` - 2D array of cell values
- `headers?: string[]` - Column headers
- `editable?: boolean` - Enable inline editing
- `title?: string` - Table title
- `onCellChange?: (row, col, value) => void` - Edit callback
- `onExport?: (data, headers) => void` - Custom export handler
- `exportFilename?: string` - CSV filename

Features:
- Row/column/cell selection
- Shift+click range selection
- Drag to select
- Double-click to edit
- Ctrl+C to copy
- CSV export
- Row numbers

## Implementation Order

1. Create `payment_sources` table + seed with initial cards
2. Create `expenses` table with RLS policies
3. Create database functions for expense queries
4. Update `get_financial_hero_metrics` to include profit calculations
5. Build `ExpenseLedger` component using `ExcelTable`
6. Add expense ledger to Financials tab
7. Add Expenses tab to project detail page
8. Update HeroMetrics to show profit metrics
9. Update Pending Payments table with expense/net columns

## RLS Policies

```sql
-- Admins can do everything
create policy "Admins full access to expenses"
  on expenses for all
  using (is_admin());

-- Payment sources readable by all authenticated
create policy "Payment sources readable"
  on payment_sources for select
  using (auth.role() = 'authenticated');

-- Only admins can modify payment sources
create policy "Admins manage payment sources"
  on payment_sources for all
  using (is_admin());
```

## Categories

| Category | Use Case |
|----------|----------|
| `direct_cost` | Software, APIs, services bought for specific project |
| `contractor` | DFY partner payments, external dev fees |
| `tools_ops` | Figma, hosting, general tools (allocate to "Overhead") |
| `other` | Miscellaneous |
