-- Expense Tracking System
-- Tracks expenses per project for profitability calculation

-- ============================================================================
-- HELPER FUNCTION (if not exists)
-- ============================================================================

create or replace function update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- PAYMENT SOURCES TABLE
-- ============================================================================

create table if not exists payment_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,                    -- "Chase Business Checking"
  label text not null,                   -- "Chase ***4521" (display)
  type text check (type in ('credit_card', 'debit', 'bank_account')),
  is_active boolean default true,
  created_at timestamptz default now()
);

-- RLS for payment_sources
alter table payment_sources enable row level security;

create policy "Payment sources readable by authenticated"
  on payment_sources for select
  using (auth.role() = 'authenticated');

create policy "Admins manage payment sources"
  on payment_sources for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- ============================================================================
-- EXPENSES TABLE
-- ============================================================================

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  date date not null,
  description text not null,
  amount numeric(10,2) not null,
  category text not null check (category in ('direct_cost', 'contractor', 'tools_ops', 'other')),

  project_id uuid references projects(id) on delete set null,  -- nullable for overhead
  payment_source_id uuid references payment_sources(id) not null,
  paid_by uuid references profiles(id),
  reimbursed boolean default false,
  receipt_url text,

  created_by uuid references profiles(id)
);

-- RLS for expenses
alter table expenses enable row level security;

create policy "Admins full access to expenses"
  on expenses for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Index for common queries
create index if not exists idx_expenses_project_id on expenses(project_id);
create index if not exists idx_expenses_date on expenses(date desc);
create index if not exists idx_expenses_category on expenses(category);

-- Updated_at trigger
create trigger set_expenses_updated_at
  before update on expenses
  for each row
  execute function update_updated_at_column();

-- ============================================================================
-- EXPENSE SUMMARY FUNCTIONS
-- ============================================================================

-- Get total expenses for a specific project
create or replace function get_project_expenses(p_project_id uuid)
returns numeric
language sql
stable
security definer
as $$
  select coalesce(sum(amount), 0)
  from expenses
  where project_id = p_project_id;
$$;

-- Get expense summary for dashboard
create or replace function get_expense_summary()
returns json
language plpgsql
stable
security definer
as $$
declare
  result json;
begin
  select json_build_object(
    'total_expenses', coalesce(sum(amount), 0),
    'expenses_this_month', coalesce(sum(case
      when date >= date_trunc('month', current_date) then amount
      else 0
    end), 0),
    'by_category', (
      select coalesce(json_agg(cat_summary), '[]'::json)
      from (
        select
          category,
          sum(amount) as total
        from expenses
        group by category
        order by sum(amount) desc
      ) cat_summary
    ),
    'by_payment_source', (
      select coalesce(json_agg(source_summary), '[]'::json)
      from (
        select
          ps.label,
          sum(e.amount) as total
        from expenses e
        join payment_sources ps on e.payment_source_id = ps.id
        group by ps.id, ps.label
        order by sum(e.amount) desc
      ) source_summary
    )
  ) into result
  from expenses;

  return result;
end;
$$;

-- ============================================================================
-- UPDATE FINANCIAL HERO METRICS FOR PROFIT
-- ============================================================================

create or replace function get_financial_hero_metrics()
returns json
language plpgsql
stable
security definer
as $$
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
  -- Total revenue (paid milestones)
  select coalesce(sum(amount), 0) into v_total_revenue
  from payment_milestones
  where paid_at is not null;

  -- Revenue this month
  select coalesce(sum(amount), 0) into v_revenue_this_month
  from payment_milestones
  where paid_at is not null
  and date_trunc('month', paid_at) = date_trunc('month', current_date);

  -- Pending payments (unpaid milestones)
  select coalesce(sum(amount), 0) into v_pending_payments
  from payment_milestones
  where paid_at is null;

  -- Payable this month
  select coalesce(sum(amount), 0) into v_payable_this_month
  from payment_milestones
  where paid_at is null
  and date_trunc('month', due_date) = date_trunc('month', current_date);

  -- Payable next month
  select coalesce(sum(amount), 0) into v_payable_next_month
  from payment_milestones
  where paid_at is null
  and date_trunc('month', due_date) = date_trunc('month', current_date + interval '1 month');

  -- Win rate
  select
    case
      when count(*) filter (where proposal_stage in ('won', 'closed_lost')) > 0
      then count(*) filter (where proposal_stage = 'won')::numeric /
           count(*) filter (where proposal_stage in ('won', 'closed_lost'))::numeric
      else 0
    end into v_win_rate
  from inquiries;

  -- Average ticket size
  select coalesce(avg(price_dfy), 0) into v_avg_ticket
  from projects
  where price_dfy > 0;

  -- Active inquiries (in pipeline)
  select count(*) into v_active_inquiries
  from inquiries
  where proposal_stage not in ('won', 'closed_lost', 'closed_stale');

  -- Projected revenue: pending + (active inquiries * win rate * avg ticket)
  v_projected_revenue := v_pending_payments + (v_active_inquiries * v_win_rate * v_avg_ticket);

  -- Total expenses
  select coalesce(sum(amount), 0) into v_total_expenses
  from expenses;

  -- Expenses this month
  select coalesce(sum(amount), 0) into v_expenses_this_month
  from expenses
  where date >= date_trunc('month', current_date);

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
    'profit_margin', case when v_total_revenue > 0
      then (v_total_revenue - v_total_expenses) / v_total_revenue
      else 0
    end
  ) into result;

  return result;
end;
$$;

-- ============================================================================
-- FINANCIAL OVERVIEW VIEW UPDATE
-- ============================================================================

-- Drop and recreate the view to include expenses
drop view if exists financial_overview;

create view financial_overview as
select
  p.id,
  p.name as project_name,
  c.full_name as client_name,
  p.price_dfy,
  p.payment_structure,
  p.status,
  coalesce(paid.paid_amount, 0) as paid_amount,
  p.price_dfy - coalesce(paid.paid_amount, 0) as pending_amount,
  case
    when p.price_dfy > 0
    then round((coalesce(paid.paid_amount, 0) / p.price_dfy) * 100)
    else 0
  end as payment_completion_pct,
  coalesce(exp.total_expenses, 0) as expenses,
  p.price_dfy - coalesce(exp.total_expenses, 0) as net_revenue
from projects p
left join profiles c on p.client_id = c.id
left join (
  select project_id, sum(amount) as paid_amount
  from payment_milestones
  where paid_at is not null
  group by project_id
) paid on p.id = paid.project_id
left join (
  select project_id, sum(amount) as total_expenses
  from expenses
  group by project_id
) exp on p.id = exp.project_id
where p.price_dfy > 0
order by pending_amount desc;

-- ============================================================================
-- SEED DEFAULT PAYMENT SOURCES
-- ============================================================================

insert into payment_sources (name, label, type) values
  ('Primary Business Card', 'Business ***0001', 'credit_card'),
  ('Secondary Card', 'Personal ***0002', 'credit_card'),
  ('Business Checking', 'Checking ***0003', 'bank_account')
on conflict do nothing;
