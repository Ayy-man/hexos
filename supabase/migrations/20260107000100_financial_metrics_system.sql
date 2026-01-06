-- hexOS Financial Metrics System
-- Payment milestones auto-creation, pending payments tracking, and projected revenue

-- ============================================================================
-- FUNCTION: Create Payment Milestones
-- ============================================================================

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_payment_milestones IS 'Auto-create payment milestones based on project payment structure';

-- ============================================================================
-- FUNCTION: Get Financial Hero Metrics
-- Returns: total_revenue, revenue_this_month, pending_payments, payable_this_month,
--          payable_next_month, projected_revenue, win_rate, avg_ticket_size, active_inquiries
-- ============================================================================

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
      ((SELECT sales_metrics.active_inquiries FROM sales_metrics) *
       (SELECT sales_metrics.win_rate FROM sales_metrics) *
       (SELECT sales_metrics.avg_ticket_size FROM sales_metrics)) as total
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_financial_hero_metrics IS 'Returns key financial metrics for admin dashboard';

-- ============================================================================
-- FUNCTION: Get Payment Timeline (Next N Months)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_payment_timeline(p_months INT DEFAULT 12)
RETURNS TABLE(
  month TIMESTAMPTZ,
  milestone_count BIGINT,
  expected_revenue DECIMAL,
  projects TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE_TRUNC('month', pm.due_date) as month,
    COUNT(*) as milestone_count,
    SUM(pm.amount) as expected_revenue,
    ARRAY_AGG(p.project_name ORDER BY pm.due_date) as projects
  FROM payment_milestones pm
  JOIN projects p ON p.id = pm.project_id
  WHERE pm.paid_at IS NULL
    AND pm.due_date >= CURRENT_DATE
    AND pm.due_date < CURRENT_DATE + (p_months || ' months')::INTERVAL
  GROUP BY DATE_TRUNC('month', pm.due_date)
  ORDER BY month ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_payment_timeline IS 'Returns expected payment collections by month';

-- ============================================================================
-- FUNCTION: Get Revenue Trend (Last N Months)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_revenue_trend(p_months INT DEFAULT 12)
RETURNS TABLE(
  month TIMESTAMPTZ,
  projects_started BIGINT,
  revenue DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE_TRUNC('month', started_at) as month,
    COUNT(*) as projects_started,
    SUM(quoted_price) as revenue
  FROM projects
  WHERE started_at >= CURRENT_DATE - (p_months || ' months')::INTERVAL
    AND status NOT IN ('cancelled')
  GROUP BY DATE_TRUNC('month', started_at)
  ORDER BY month ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_revenue_trend IS 'Returns monthly revenue trend for past N months';

-- ============================================================================
-- FUNCTION: Get Overdue Payments
-- ============================================================================

CREATE OR REPLACE FUNCTION get_overdue_payments()
RETURNS TABLE(
  milestone_id UUID,
  project_name TEXT,
  client_name TEXT,
  milestone_label TEXT,
  amount DECIMAL,
  due_date DATE,
  days_overdue INT,
  project_status project_status
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pm.id,
    p.project_name,
    p.client_name,
    pm.label,
    pm.amount,
    pm.due_date,
    (CURRENT_DATE - pm.due_date)::INT as days_overdue,
    p.status
  FROM payment_milestones pm
  JOIN projects p ON p.id = pm.project_id
  WHERE pm.paid_at IS NULL
    AND pm.due_date < CURRENT_DATE
  ORDER BY days_overdue DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_overdue_payments IS 'Returns all overdue payment milestones';

-- ============================================================================
-- FUNCTION: Get Sales Cycle Stats
-- ============================================================================

CREATE OR REPLACE FUNCTION get_sales_cycle_stats()
RETURNS TABLE(
  avg_sales_cycle_days INT,
  median_sales_cycle_days INT,
  min_sales_cycle_days INT,
  max_sales_cycle_days INT,
  total_closed_deals BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH cycles AS (
    SELECT
      EXTRACT(EPOCH FROM (closed_at - created_at)) / 86400 as days
    FROM inquiries
    WHERE proposal_stage = 'closed'
      AND closed_at IS NOT NULL
      AND created_at >= CURRENT_DATE - INTERVAL '6 months'
  )
  SELECT
    AVG(days)::INT as avg_sales_cycle_days,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY days)::INT as median_sales_cycle_days,
    MIN(days)::INT as min_sales_cycle_days,
    MAX(days)::INT as max_sales_cycle_days,
    COUNT(*)::BIGINT as total_closed_deals
  FROM cycles;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_sales_cycle_stats IS 'Returns statistics about sales cycle duration';

-- ============================================================================
-- FUNCTION: Calculate Projected Revenue with Timeline
-- Returns projected revenue broken down by month for next 3 months
-- ============================================================================

CREATE OR REPLACE FUNCTION get_projected_revenue_timeline()
RETURNS TABLE(
  month TIMESTAMPTZ,
  expected_deals BIGINT,
  projected_revenue DECIMAL
) AS $$
BEGIN
  RETURN QUERY
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
    DATE_TRUNC('month', estimated_close_date) as month,
    COUNT(*) as expected_deals,
    SUM(weighted_value) as projected_revenue
  FROM pipeline_forecast
  GROUP BY DATE_TRUNC('month', estimated_close_date)
  ORDER BY month ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_projected_revenue_timeline IS 'Returns projected revenue by month based on active pipeline and sales metrics';

-- ============================================================================
-- VIEW: Financial Overview
-- Convenient view combining key metrics
-- ============================================================================

CREATE OR REPLACE VIEW financial_overview AS
WITH
pending_by_project AS (
  SELECT
    p.id,
    p.project_name,
    p.client_name,
    p.quoted_price,
    p.payment_structure,
    p.status,
    COALESCE(SUM(pm.amount) FILTER (WHERE pm.paid_at IS NOT NULL), 0) as paid_amount,
    COALESCE(SUM(pm.amount) FILTER (WHERE pm.paid_at IS NULL), 0) as pending_amount,
    ROUND(
      (COALESCE(SUM(pm.amount) FILTER (WHERE pm.paid_at IS NOT NULL), 0) / NULLIF(p.quoted_price, 0) * 100),
      2
    ) as payment_completion_pct
  FROM projects p
  LEFT JOIN payment_milestones pm ON pm.project_id = p.id
  WHERE p.status NOT IN ('completed', 'cancelled')
  GROUP BY p.id, p.project_name, p.client_name, p.quoted_price, p.payment_structure, p.status
)
SELECT * FROM pending_by_project
ORDER BY pending_amount DESC;

COMMENT ON VIEW financial_overview IS 'Overview of pending payments by project';

-- ============================================================================
-- INDEXES (if not already exist)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_payment_milestones_paid_at ON payment_milestones(paid_at);
CREATE INDEX IF NOT EXISTS idx_payment_milestones_due_date ON payment_milestones(due_date) WHERE paid_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_started_at ON projects(started_at);
CREATE INDEX IF NOT EXISTS idx_inquiries_closed_at ON inquiries(closed_at);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE payment_milestones IS 'Payment schedule for projects (auto-created based on payment_structure)';
