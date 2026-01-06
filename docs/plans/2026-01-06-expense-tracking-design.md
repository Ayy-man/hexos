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

## Database Setup

Run in Supabase SQL Editor (or `supabase db push`):

### 1. Tables & RLS

```sql
-- Helper function
create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Payment sources
create table if not exists payment_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  label text not null,
  type text check (type in ('credit_card', 'debit', 'bank_account')),
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table payment_sources enable row level security;

create policy "Payment sources readable by authenticated"
  on payment_sources for select using (auth.role() = 'authenticated');

create policy "Admins manage payment sources"
  on payment_sources for all using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );

-- Expenses
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  date date not null,
  description text not null,
  amount numeric(10,2) not null,
  category text not null check (category in ('direct_cost', 'contractor', 'tools_ops', 'other')),
  project_id uuid references projects(id) on delete set null,
  payment_source_id uuid references payment_sources(id) not null,
  paid_by uuid references profiles(id),
  reimbursed boolean default false,
  receipt_url text,
  created_by uuid references profiles(id)
);

alter table expenses enable row level security;

create policy "Admins full access to expenses"
  on expenses for all using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );

create index if not exists idx_expenses_project_id on expenses(project_id);
create index if not exists idx_expenses_date on expenses(date desc);

create trigger set_expenses_updated_at
  before update on expenses for each row execute function update_updated_at_column();

-- Seed payment sources
insert into payment_sources (name, label, type) values
  ('Primary Business Card', 'Business ***0001', 'credit_card'),
  ('Secondary Card', 'Personal ***0002', 'credit_card'),
  ('Business Checking', 'Checking ***0003', 'bank_account');
```

### 2. Functions

```sql
-- Get project expenses
create or replace function get_project_expenses(p_project_id uuid)
returns numeric language sql stable security definer as $$
  select coalesce(sum(amount), 0) from expenses where project_id = p_project_id;
$$;

-- Get expense summary
create or replace function get_expense_summary()
returns json language plpgsql stable security definer as $$
declare result json;
begin
  select json_build_object(
    'total_expenses', coalesce(sum(amount), 0),
    'expenses_this_month', coalesce(sum(case when date >= date_trunc('month', current_date) then amount else 0 end), 0),
    'by_category', (select coalesce(json_agg(row_to_json(t)), '[]') from (select category, sum(amount) as total from expenses group by category) t),
    'by_payment_source', (select coalesce(json_agg(row_to_json(t)), '[]') from (select ps.label, sum(e.amount) as total from expenses e join payment_sources ps on e.payment_source_id = ps.id group by ps.id, ps.label) t)
  ) into result from expenses;
  return result;
end;
$$;

-- Update financial hero metrics (drop first if exists)
drop function if exists get_financial_hero_metrics();

create function get_financial_hero_metrics()
returns json language plpgsql stable security definer as $$
declare
  result json;
  v_total_revenue numeric;
  v_revenue_this_month numeric;
  v_pending_payments numeric;
  v_payable_this_month numeric;
  v_payable_next_month numeric;
  v_win_rate numeric;
  v_avg_ticket numeric;
  v_active_inquiries int;
  v_projected_revenue numeric;
  v_total_expenses numeric;
  v_expenses_this_month numeric;
begin
  select coalesce(sum(amount), 0) into v_total_revenue from payment_milestones where paid_at is not null;
  select coalesce(sum(amount), 0) into v_revenue_this_month from payment_milestones where paid_at is not null and date_trunc('month', paid_at) = date_trunc('month', current_date);
  select coalesce(sum(amount), 0) into v_pending_payments from payment_milestones where paid_at is null;
  select coalesce(sum(amount), 0) into v_payable_this_month from payment_milestones where paid_at is null and date_trunc('month', due_date) = date_trunc('month', current_date);
  select coalesce(sum(amount), 0) into v_payable_next_month from payment_milestones where paid_at is null and date_trunc('month', due_date) = date_trunc('month', current_date + interval '1 month');
  select case when count(*) filter (where proposal_stage in ('won', 'closed_lost')) > 0 then count(*) filter (where proposal_stage = 'won')::numeric / count(*) filter (where proposal_stage in ('won', 'closed_lost'))::numeric else 0 end into v_win_rate from inquiries;
  select coalesce(avg(price_dfy), 0) into v_avg_ticket from projects where price_dfy > 0;
  select count(*) into v_active_inquiries from inquiries where proposal_stage not in ('won', 'closed_lost', 'closed_stale');
  v_projected_revenue := v_pending_payments + (v_active_inquiries * v_win_rate * v_avg_ticket);
  select coalesce(sum(amount), 0) into v_total_expenses from expenses;
  select coalesce(sum(amount), 0) into v_expenses_this_month from expenses where date >= date_trunc('month', current_date);

  select json_build_object(
    'total_revenue', v_total_revenue,
    'revenue_this_month', v_revenue_this_month,
    'pending_payments', v_pending_payments,
    'payable_this_month', v_payable_this_month,
    'payable_next_month', v_payable_next_month,
    'win_rate', v_win_rate,
    'avg_ticket_size', v_avg_ticket,
    'active_inquiries', v_active_inquiries,
    'projected_revenue', v_projected_revenue,
    'total_expenses', v_total_expenses,
    'expenses_this_month', v_expenses_this_month,
    'net_profit', v_total_revenue - v_total_expenses,
    'profit_margin', case when v_total_revenue > 0 then (v_total_revenue - v_total_expenses) / v_total_revenue else 0 end
  ) into result;
  return result;
end;
$$;
```

## Known Issues & Fixes

### Payment Sources RLS Fix

If payment sources dropdown is empty, run:

```sql
-- Drop old policy
drop policy if exists "Payment sources readable by authenticated" on payment_sources;

-- Create simpler policy
create policy "Payment sources readable by all logged in"
  on payment_sources for select
  using (auth.uid() is not null);
```

### Metrics Dashboard UI Redesign (TODO)

Current issues identified:

| Issue | Current State | Planned Fix |
|-------|---------------|-------------|
| Too many cards | 9 metric cards overwhelming | Reduce to 4 key metrics (Revenue, Profit, Pending, Active Projects) |
| No visual hierarchy | Everything same priority | Hero numbers big, trends small, progressive disclosure |
| Tab bar lost | Tabs in middle of page | Move tabs to top, below page title |
| Invalid Date on charts | "Invalid Date" on x-axis | Fix date formatting in chart data transform |
| Too many colors | Orange, teal, red, green competing | Single accent + semantic colors only (red=bad, green=good) |
| Blockers banner missed | Easy to overlook | Make sticky or more prominent |
| Disconnected sections | Inconsistent spacing | Consistent card spacing, group related items |
| Conversion funnel | Feels disconnected at bottom | Integrate into Pipeline tab properly |

**Redesign approach:**
1. Summary view: 4 key KPIs at top (Revenue, Net Profit, Pending, Active Projects)
2. Alerts: Sticky banner for critical items (overdue payments, blockers)
3. Tabs: Move to top, cleaner navigation
4. Progressive disclosure: Click cards to see detail breakdowns
5. Charts: Fix date formatting, improve contrast/readability

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
