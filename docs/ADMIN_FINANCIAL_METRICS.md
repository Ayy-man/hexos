# Admin Financial Metrics System

Comprehensive financial tracking with pending payments, payment milestones, and projected revenue.

---

## 1. 💰 Pending Payments System

### Overview
Track remaining payments for each project based on payment structure (100%, 50/50, 40/30/30, custom).

### Database Schema

The `payment_milestones` table already exists:
```sql
CREATE TABLE public.payment_milestones (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  label TEXT NOT NULL,              -- e.g., "First Payment (50%)", "Final Payment (50%)"
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE,                    -- When payment is expected
  paid_at TIMESTAMPTZ,              -- When actually paid (NULL = unpaid)
  stripe_payment_id TEXT,
  sort_order INT DEFAULT 0
);
```

### Auto-Create Payment Milestones

When a project is created from an inquiry, auto-generate milestones based on `payment_structure`:

```sql
-- Function to create payment milestones based on payment structure
CREATE OR REPLACE FUNCTION create_payment_milestones(
  p_project_id UUID,
  p_quoted_price DECIMAL(10,2),
  p_payment_structure payment_structure,
  p_target_delivery_date DATE
) RETURNS VOID AS $$
DECLARE
  v_halfway_date DATE;
  v_two_thirds_date DATE;
BEGIN
  -- Calculate milestone dates (estimated)
  v_halfway_date := CURRENT_DATE + ((p_target_delivery_date - CURRENT_DATE) / 2);
  v_two_thirds_date := CURRENT_DATE + ((p_target_delivery_date - CURRENT_DATE) * 2 / 3);

  -- Clear existing milestones (in case of re-calculation)
  DELETE FROM payment_milestones WHERE project_id = p_project_id;

  CASE p_payment_structure
    WHEN '100_upfront' THEN
      INSERT INTO payment_milestones (project_id, label, amount, due_date, sort_order)
      VALUES (p_project_id, 'Full Payment (100%)', p_quoted_price, CURRENT_DATE, 0);

    WHEN '50_50' THEN
      INSERT INTO payment_milestones (project_id, label, amount, due_date, sort_order)
      VALUES
        (p_project_id, 'First Payment (50%)', p_quoted_price * 0.5, CURRENT_DATE, 0),
        (p_project_id, 'Final Payment (50%)', p_quoted_price * 0.5, p_target_delivery_date, 1);

    WHEN '40_30_30' THEN
      INSERT INTO payment_milestones (project_id, label, amount, due_date, sort_order)
      VALUES
        (p_project_id, 'First Payment (40%)', p_quoted_price * 0.4, CURRENT_DATE, 0),
        (p_project_id, 'Second Payment (30%)', p_quoted_price * 0.3, v_halfway_date, 1),
        (p_project_id, 'Final Payment (30%)', p_quoted_price * 0.3, p_target_delivery_date, 2);

    WHEN 'custom' THEN
      -- For custom, admin will manually create milestones
      NULL;
  END CASE;
END;
$$ LANGUAGE plpgsql;
```

### Queries for Pending Payments

#### 1. **Total Pending Payments (All Projects)**
```sql
SELECT
  SUM(amount) as total_pending
FROM payment_milestones
WHERE paid_at IS NULL;
```

#### 2. **Pending Payments by Project**
```sql
SELECT
  p.id,
  p.project_name,
  p.client_name,
  p.quoted_price,
  p.payment_structure,
  COALESCE(SUM(pm.amount) FILTER (WHERE pm.paid_at IS NOT NULL), 0) as paid_amount,
  COALESCE(SUM(pm.amount) FILTER (WHERE pm.paid_at IS NULL), 0) as pending_amount,
  ROUND(
    (COALESCE(SUM(pm.amount) FILTER (WHERE pm.paid_at IS NOT NULL), 0) / p.quoted_price * 100),
    2
  ) as payment_completion_pct
FROM projects p
LEFT JOIN payment_milestones pm ON pm.project_id = p.id
WHERE p.status NOT IN ('completed', 'cancelled')
GROUP BY p.id, p.project_name, p.client_name, p.quoted_price, p.payment_structure
ORDER BY pending_amount DESC;
```

#### 3. **Pending Milestones Timeline**
```sql
SELECT
  pm.id,
  pm.label,
  pm.amount,
  pm.due_date,
  p.project_name,
  p.client_name,
  p.status as project_status,
  CASE
    WHEN pm.due_date < CURRENT_DATE THEN 'overdue'
    WHEN pm.due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'due_soon'
    ELSE 'upcoming'
  END as urgency
FROM payment_milestones pm
JOIN projects p ON p.id = pm.project_id
WHERE pm.paid_at IS NULL
ORDER BY pm.due_date ASC;
```

---

## 2. 📅 Monthly Payables (This Month / Next Month)

### Payable This Month
```sql
SELECT
  SUM(pm.amount) as payable_this_month
FROM payment_milestones pm
WHERE pm.paid_at IS NULL
  AND pm.due_date >= DATE_TRUNC('month', CURRENT_DATE)
  AND pm.due_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month';
```

### Payable Next Month
```sql
SELECT
  SUM(pm.amount) as payable_next_month
FROM payment_milestones pm
WHERE pm.paid_at IS NULL
  AND pm.due_date >= DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
  AND pm.due_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '2 months';
```

### Detailed Monthly Breakdown
```sql
SELECT
  DATE_TRUNC('month', pm.due_date) as month,
  COUNT(*) as milestone_count,
  SUM(pm.amount) as total_amount,
  ARRAY_AGG(p.project_name ORDER BY pm.due_date) as projects
FROM payment_milestones pm
JOIN projects p ON p.id = pm.project_id
WHERE pm.paid_at IS NULL
  AND pm.due_date >= CURRENT_DATE
GROUP BY DATE_TRUNC('month', pm.due_date)
ORDER BY month ASC
LIMIT 12; -- Next 12 months
```

---

## 3. 📊 Projected Revenue Calculation

### Dynamic Calculation Components

**Formula:**
```
Projected Revenue = Pending Payments + Estimated Pipeline Revenue

Where:
  Pending Payments = Sum of unpaid payment milestones
  Estimated Pipeline Revenue = (Active Inquiries × Win Rate × Avg Ticket Size)
```

### SQL Queries

#### 1. **Calculate Average Sales Cycle** (Days from inquiry → closed)
```sql
SELECT
  AVG(
    EXTRACT(EPOCH FROM (closed_at - created_at)) / 86400
  )::INT as avg_sales_cycle_days
FROM inquiries
WHERE proposal_stage = 'closed'
  AND closed_at IS NOT NULL
  AND created_at >= CURRENT_DATE - INTERVAL '6 months'; -- Last 6 months for relevance
```

#### 2. **Calculate Average Ticket Size**
```sql
SELECT
  AVG(price_dfy) as avg_ticket_size
FROM inquiries
WHERE proposal_stage = 'closed'
  AND price_dfy IS NOT NULL
  AND created_at >= CURRENT_DATE - INTERVAL '6 months';
```

#### 3. **Calculate Win Rate**
```sql
SELECT
  ROUND(
    COUNT(*) FILTER (WHERE proposal_stage = 'closed')::DECIMAL /
    NULLIF(COUNT(*) FILTER (WHERE proposal_stage IN ('closed', 'lost')), 0) * 100,
    2
  ) as win_rate_pct
FROM inquiries
WHERE created_at >= CURRENT_DATE - INTERVAL '6 months';
```

#### 4. **Estimated Pipeline Revenue**
```sql
WITH sales_metrics AS (
  SELECT
    -- Win rate (closed / (closed + lost))
    COALESCE(
      COUNT(*) FILTER (WHERE proposal_stage = 'closed')::DECIMAL /
      NULLIF(COUNT(*) FILTER (WHERE proposal_stage IN ('closed', 'lost')), 0),
      0.3 -- Default 30% if no historical data
    ) as win_rate,

    -- Average ticket size from closed deals
    COALESCE(
      AVG(price_dfy) FILTER (WHERE proposal_stage = 'closed'),
      0
    ) as avg_ticket_size,

    -- Count of active inquiries (in pipeline, not closed/lost)
    (SELECT COUNT(*) FROM inquiries
     WHERE proposal_stage NOT IN ('closed', 'lost', 'unopened')) as active_inquiries
  FROM inquiries
  WHERE created_at >= CURRENT_DATE - INTERVAL '6 months'
)
SELECT
  active_inquiries,
  win_rate,
  avg_ticket_size,
  (active_inquiries * win_rate * avg_ticket_size) as estimated_pipeline_revenue
FROM sales_metrics;
```

#### 5. **Complete Projected Revenue Query**
```sql
WITH
-- Pending payments from milestones
pending_payments AS (
  SELECT COALESCE(SUM(amount), 0) as total_pending
  FROM payment_milestones
  WHERE paid_at IS NULL
),

-- Historical sales metrics
sales_metrics AS (
  SELECT
    COALESCE(
      COUNT(*) FILTER (WHERE proposal_stage = 'closed')::DECIMAL /
      NULLIF(COUNT(*) FILTER (WHERE proposal_stage IN ('closed', 'lost')), 0),
      0.3
    ) as win_rate,
    COALESCE(
      AVG(price_dfy) FILTER (WHERE proposal_stage = 'closed'),
      0
    ) as avg_ticket_size
  FROM inquiries
  WHERE created_at >= CURRENT_DATE - INTERVAL '6 months'
),

-- Active pipeline count
pipeline AS (
  SELECT COUNT(*) as active_inquiries
  FROM inquiries
  WHERE proposal_stage NOT IN ('closed', 'lost', 'unopened')
)

SELECT
  -- Actual pending payments
  pp.total_pending as pending_payments,

  -- Pipeline estimation
  p.active_inquiries,
  sm.win_rate,
  sm.avg_ticket_size,
  (p.active_inquiries * sm.win_rate * sm.avg_ticket_size) as estimated_pipeline_revenue,

  -- Total projected revenue
  pp.total_pending + (p.active_inquiries * sm.win_rate * sm.avg_ticket_size) as total_projected_revenue
FROM pending_payments pp
CROSS JOIN sales_metrics sm
CROSS JOIN pipeline p;
```

### Time-Based Projected Revenue (Next 3 Months)

```sql
WITH
-- Avg sales cycle in days
sales_cycle AS (
  SELECT
    COALESCE(
      AVG(EXTRACT(EPOCH FROM (closed_at - created_at)) / 86400),
      60 -- Default 60 days
    )::INT as avg_days
  FROM inquiries
  WHERE proposal_stage = 'closed'
    AND closed_at IS NOT NULL
    AND created_at >= CURRENT_DATE - INTERVAL '6 months'
),

-- Win rate and avg ticket size
metrics AS (
  SELECT
    COALESCE(
      COUNT(*) FILTER (WHERE proposal_stage = 'closed')::DECIMAL /
      NULLIF(COUNT(*) FILTER (WHERE proposal_stage IN ('closed', 'lost')), 0),
      0.3
    ) as win_rate,
    COALESCE(AVG(price_dfy) FILTER (WHERE proposal_stage = 'closed'), 0) as avg_ticket_size
  FROM inquiries
  WHERE created_at >= CURRENT_DATE - INTERVAL '6 months'
),

-- Inquiries likely to close in next 3 months
pipeline_forecast AS (
  SELECT
    i.id,
    i.price_dfy,
    i.created_at,
    m.avg_ticket_size,
    m.win_rate,
    sc.avg_days,
    -- Estimated close date
    (i.created_at::DATE + sc.avg_days) as estimated_close_date,
    -- Weighted value (price × win_rate)
    COALESCE(i.price_dfy, m.avg_ticket_size) * m.win_rate as weighted_value
  FROM inquiries i
  CROSS JOIN metrics m
  CROSS JOIN sales_cycle sc
  WHERE i.proposal_stage NOT IN ('closed', 'lost', 'unopened')
    -- Will close in next 3 months based on avg cycle
    AND (i.created_at::DATE + sc.avg_days) <= CURRENT_DATE + INTERVAL '3 months'
)

SELECT
  -- Month buckets
  DATE_TRUNC('month', estimated_close_date) as month,
  COUNT(*) as expected_deals,
  SUM(weighted_value) as projected_revenue
FROM pipeline_forecast
GROUP BY DATE_TRUNC('month', estimated_close_date)
ORDER BY month ASC;
```

---

## 4. 📈 Complete Financial Dashboard Queries

### Hero Metrics (Top Cards)

```sql
WITH
-- Total revenue (all time)
total_revenue AS (
  SELECT COALESCE(SUM(quoted_price), 0) as total
  FROM projects
  WHERE status NOT IN ('cancelled')
),

-- Revenue this month
revenue_this_month AS (
  SELECT COALESCE(SUM(quoted_price), 0) as total
  FROM projects
  WHERE started_at >= DATE_TRUNC('month', CURRENT_DATE)
),

-- Pending payments
pending AS (
  SELECT COALESCE(SUM(amount), 0) as total
  FROM payment_milestones
  WHERE paid_at IS NULL
),

-- Payable this month
payable_this_month AS (
  SELECT COALESCE(SUM(amount), 0) as total
  FROM payment_milestones
  WHERE paid_at IS NULL
    AND due_date >= DATE_TRUNC('month', CURRENT_DATE)
    AND due_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
),

-- Payable next month
payable_next_month AS (
  SELECT COALESCE(SUM(amount), 0) as total
  FROM payment_milestones
  WHERE paid_at IS NULL
    AND due_date >= DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
    AND due_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '2 months'
),

-- Sales metrics
sales_metrics AS (
  SELECT
    COALESCE(
      COUNT(*) FILTER (WHERE proposal_stage = 'closed')::DECIMAL /
      NULLIF(COUNT(*) FILTER (WHERE proposal_stage IN ('closed', 'lost')), 0),
      0.3
    ) as win_rate,
    COALESCE(AVG(price_dfy) FILTER (WHERE proposal_stage = 'closed'), 0) as avg_ticket_size,
    COUNT(*) FILTER (WHERE proposal_stage NOT IN ('closed', 'lost', 'unopened')) as active_inquiries
  FROM inquiries
  WHERE created_at >= CURRENT_DATE - INTERVAL '6 months'
),

-- Projected revenue
projected AS (
  SELECT
    (SELECT total FROM pending) +
    ((SELECT active_inquiries FROM sales_metrics) *
     (SELECT win_rate FROM sales_metrics) *
     (SELECT avg_ticket_size FROM sales_metrics)) as total
)

SELECT
  (SELECT total FROM total_revenue) as total_revenue,
  (SELECT total FROM revenue_this_month) as revenue_this_month,
  (SELECT total FROM pending) as pending_payments,
  (SELECT total FROM payable_this_month) as payable_this_month,
  (SELECT total FROM payable_next_month) as payable_next_month,
  (SELECT total FROM projected) as projected_revenue,
  (SELECT win_rate FROM sales_metrics) as win_rate,
  (SELECT avg_ticket_size FROM sales_metrics) as avg_ticket_size,
  (SELECT active_inquiries FROM sales_metrics) as active_inquiries;
```

### Revenue Trend (Last 12 Months)

```sql
SELECT
  DATE_TRUNC('month', started_at) as month,
  COUNT(*) as projects_started,
  SUM(quoted_price) as revenue
FROM projects
WHERE started_at >= CURRENT_DATE - INTERVAL '12 months'
  AND status NOT IN ('cancelled')
GROUP BY DATE_TRUNC('month', started_at)
ORDER BY month ASC;
```

### Payment Collection Timeline (Next 12 Months)

```sql
SELECT
  DATE_TRUNC('month', due_date) as month,
  COUNT(*) as milestone_count,
  SUM(amount) as expected_revenue
FROM payment_milestones
WHERE paid_at IS NULL
  AND due_date >= CURRENT_DATE
  AND due_date < CURRENT_DATE + INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', due_date)
ORDER BY month ASC;
```

### Overdue Payments Alert

```sql
SELECT
  p.project_name,
  p.client_name,
  pm.label,
  pm.amount,
  pm.due_date,
  CURRENT_DATE - pm.due_date as days_overdue,
  p.status as project_status
FROM payment_milestones pm
JOIN projects p ON p.id = pm.project_id
WHERE pm.paid_at IS NULL
  AND pm.due_date < CURRENT_DATE
ORDER BY days_overdue DESC;
```

---

## 5. 🔧 Implementation Steps

### Step 1: Add Payment Milestone Auto-Creation

Add this to your project conversion logic (`convertToProject` function):

```typescript
// After creating project
await createPaymentMilestones(
  projectId,
  quotedPrice,
  paymentStructure,
  targetDeliveryDate
);
```

### Step 2: Create Server Actions

```typescript
// /features/admin/actions/financialActions.ts

export async function getFinancialMetrics() {
  const supabase = createServerClient();

  // Run the hero metrics query
  const { data } = await supabase.rpc('get_financial_hero_metrics');

  return data;
}

export async function getPaymentTimeline(months: number = 12) {
  const supabase = createServerClient();

  const { data } = await supabase
    .from('payment_milestones')
    .select('*, project:projects(project_name, client_name)')
    .is('paid_at', null)
    .gte('due_date', new Date().toISOString())
    .lte('due_date', new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toISOString())
    .order('due_date', { ascending: true });

  return data;
}

export async function getProjectedRevenue() {
  const supabase = createServerClient();

  const { data } = await supabase.rpc('calculate_projected_revenue');

  return data;
}
```

### Step 3: Create Database Functions (via migration)

```sql
-- Migration: Add financial calculation functions

-- Function: Get financial hero metrics
CREATE OR REPLACE FUNCTION get_financial_hero_metrics()
RETURNS TABLE(
  total_revenue DECIMAL,
  revenue_this_month DECIMAL,
  pending_payments DECIMAL,
  payable_this_month DECIMAL,
  payable_next_month DECIMAL,
  projected_revenue DECIMAL,
  win_rate DECIMAL,
  avg_ticket_size DECIMAL,
  active_inquiries BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH
  total_revenue AS (
    SELECT COALESCE(SUM(quoted_price), 0) as total
    FROM projects WHERE status NOT IN ('cancelled')
  ),
  revenue_this_month AS (
    SELECT COALESCE(SUM(quoted_price), 0) as total
    FROM projects WHERE started_at >= DATE_TRUNC('month', CURRENT_DATE)
  ),
  pending AS (
    SELECT COALESCE(SUM(amount), 0) as total
    FROM payment_milestones WHERE paid_at IS NULL
  ),
  payable_this_month AS (
    SELECT COALESCE(SUM(amount), 0) as total
    FROM payment_milestones
    WHERE paid_at IS NULL
      AND due_date >= DATE_TRUNC('month', CURRENT_DATE)
      AND due_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
  ),
  payable_next_month AS (
    SELECT COALESCE(SUM(amount), 0) as total
    FROM payment_milestones
    WHERE paid_at IS NULL
      AND due_date >= DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
      AND due_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '2 months'
  ),
  sales_metrics AS (
    SELECT
      COALESCE(
        COUNT(*) FILTER (WHERE proposal_stage = 'closed')::DECIMAL /
        NULLIF(COUNT(*) FILTER (WHERE proposal_stage IN ('closed', 'lost')), 0),
        0.3
      ) as win_rate,
      COALESCE(AVG(price_dfy) FILTER (WHERE proposal_stage = 'closed'), 0) as avg_ticket_size,
      COUNT(*) FILTER (WHERE proposal_stage NOT IN ('closed', 'lost', 'unopened')) as active_inquiries
    FROM inquiries WHERE created_at >= CURRENT_DATE - INTERVAL '6 months'
  ),
  projected AS (
    SELECT
      (SELECT total FROM pending) +
      ((SELECT active_inquiries FROM sales_metrics) *
       (SELECT win_rate FROM sales_metrics) *
       (SELECT avg_ticket_size FROM sales_metrics)) as total
  )
  SELECT
    (SELECT total FROM total_revenue),
    (SELECT total FROM revenue_this_month),
    (SELECT total FROM pending),
    (SELECT total FROM payable_this_month),
    (SELECT total FROM payable_next_month),
    (SELECT total FROM projected),
    (SELECT sales_metrics.win_rate FROM sales_metrics),
    (SELECT sales_metrics.avg_ticket_size FROM sales_metrics),
    (SELECT sales_metrics.active_inquiries FROM sales_metrics);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 6. 📊 Chart Recommendations

### Financial Overview Page

1. **Hero Metrics (Cards)**
   - Total Revenue (all time)
   - Revenue This Month
   - Pending Payments
   - Payable This Month
   - Payable Next Month
   - Projected Revenue (next 3 months)

2. **Revenue Trend** (Line Chart)
   - X-axis: Last 12 months
   - Y-axis: Revenue
   - Line: Monthly revenue
   - Shaded area: Projected revenue (next 3 months)

3. **Payment Collection Timeline** (Stacked Bar Chart)
   - X-axis: Next 12 months
   - Bars: Expected payments by month
   - Color: By payment milestone type (first, second, final)

4. **Payment Status** (Donut Chart)
   - Paid (green)
   - Due This Month (orange)
   - Due Next Month (yellow)
   - Future (blue)
   - Overdue (red)

5. **Projected Revenue Breakdown** (Horizontal Stacked Bar)
   - Pending Payments (solid)
   - Estimated Pipeline Revenue (pattern fill)

6. **Overdue Payments Table**
   - Columns: Project, Client, Amount, Due Date, Days Overdue, Status
   - Sorted by days overdue (descending)

---

## 7. 🎯 Quick Implementation Checklist

- [ ] Create migration with `create_payment_milestones()` function
- [ ] Create migration with `get_financial_hero_metrics()` function
- [ ] Add payment milestone auto-creation to project conversion
- [ ] Create `/features/admin/actions/financialActions.ts`
- [ ] Create `/features/admin/components/FinancialDashboard.tsx`
- [ ] Add charts using Recharts or similar
- [ ] Create payment milestone management UI (mark as paid, adjust dates)
- [ ] Add email notifications for upcoming/overdue payments
- [ ] Create export to CSV functionality

---

## 8. 💡 Future Enhancements

1. **Stripe Integration**: Auto-mark milestones as paid when Stripe payment succeeds
2. **Invoice Generation**: Auto-generate invoices for upcoming milestones
3. **Payment Reminders**: Auto-email clients when payments are due
4. **Cash Flow Forecast**: Project cash flow based on milestones + expenses
5. **Budget vs Actual**: Compare projected revenue to actual
6. **Payment Analytics**: Average time to payment, collection rate trends
7. **Client Payment History**: Track which clients pay on time
8. **Revenue Recognition**: GAAP-compliant revenue recognition reporting

---

This system gives you real-time financial visibility with dynamic projections based on actual sales performance!
