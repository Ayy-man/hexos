-- Security Hardening of Metrics System
-- Restricts sensitive financial and operational metrics to Admins only

-- ============================================================================
-- AUTHORIZATION HELPER PATTERN
-- ============================================================================

/*
  Pattern applied below:
  IF NOT (auth.uid() IS NOT NULL AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin only';
  END IF;
*/

-- ============================================================================
-- SECURE FINANCIAL METRICS (20260107000100)
-- ============================================================================

CREATE OR REPLACE FUNCTION create_payment_milestones(
  p_project_id UUID,
  p_price_dfy DECIMAL(10,2),
  p_payment_structure payment_structure,
  p_target_delivery_date DATE
) RETURNS VOID AS $$
DECLARE
  v_halfway_date DATE;
  v_two_thirds_date DATE;
BEGIN
  IF NOT (auth.uid() IS NOT NULL AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin only';
  END IF;

  v_halfway_date := CURRENT_DATE + ((p_target_delivery_date - CURRENT_DATE) / 2);
  v_two_thirds_date := CURRENT_DATE + ((p_target_delivery_date - CURRENT_DATE) * 2 / 3);

  DELETE FROM payment_milestones WHERE project_id = p_project_id;

  CASE p_payment_structure
    WHEN '100_upfront' THEN
      INSERT INTO payment_milestones (project_id, label, amount, due_date, sort_order)
      VALUES (p_project_id, 'Full Payment (100%)', p_price_dfy, CURRENT_DATE, 0);

    WHEN '50_50' THEN
      INSERT INTO payment_milestones (project_id, label, amount, due_date, sort_order)
      VALUES
        (p_project_id, 'First Payment (50%)', p_price_dfy * 0.5, CURRENT_DATE, 0),
        (p_project_id, 'Final Payment (50%)', p_price_dfy * 0.5, p_target_delivery_date, 1);

    WHEN '40_30_30' THEN
      INSERT INTO payment_milestones (project_id, label, amount, due_date, sort_order)
      VALUES
        (p_project_id, 'First Payment (40%)', p_price_dfy * 0.4, CURRENT_DATE, 0),
        (p_project_id, 'Second Payment (30%)', p_price_dfy * 0.3, v_halfway_date, 1),
        (p_project_id, 'Final Payment (30%)', p_price_dfy * 0.3, p_target_delivery_date, 2);

    WHEN 'custom' THEN
      NULL;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
  IF NOT (auth.uid() IS NOT NULL AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin only';
  END IF;

  RETURN QUERY
  WITH
  total_revenue AS (
    SELECT COALESCE(SUM(price_dfy), 0) as total
    FROM projects WHERE status NOT IN ('cancelled')
  ),
  revenue_this_month AS (
    SELECT COALESCE(SUM(price_dfy), 0) as total
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

CREATE OR REPLACE FUNCTION get_payment_timeline(p_months INT DEFAULT 12)
RETURNS TABLE(
  month TIMESTAMPTZ,
  milestone_count BIGINT,
  expected_revenue DECIMAL,
  projects TEXT[]
) AS $$
BEGIN
  IF NOT (auth.uid() IS NOT NULL AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin only';
  END IF;

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

CREATE OR REPLACE FUNCTION get_revenue_trend(p_months INT DEFAULT 12)
RETURNS TABLE(
  month TIMESTAMPTZ,
  projects_started BIGINT,
  revenue DECIMAL
) AS $$
BEGIN
  IF NOT (auth.uid() IS NOT NULL AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin only';
  END IF;

  RETURN QUERY
  SELECT
    DATE_TRUNC('month', started_at) as month,
    COUNT(*) as projects_started,
    SUM(price_dfy) as revenue
  FROM projects
  WHERE started_at >= CURRENT_DATE - (p_months || ' months')::INTERVAL
    AND status NOT IN ('cancelled')
  GROUP BY DATE_TRUNC('month', started_at)
  ORDER BY month ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

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
  IF NOT (auth.uid() IS NOT NULL AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin only';
  END IF;

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

CREATE OR REPLACE FUNCTION get_sales_cycle_stats()
RETURNS TABLE(
  avg_sales_cycle_days INT,
  median_sales_cycle_days INT,
  min_sales_cycle_days INT,
  max_sales_cycle_days INT,
  total_closed_deals BIGINT
) AS $$
BEGIN
  IF NOT (auth.uid() IS NOT NULL AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin only';
  END IF;

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

CREATE OR REPLACE FUNCTION get_projected_revenue_timeline()
RETURNS TABLE(
  month TIMESTAMPTZ,
  expected_deals BIGINT,
  projected_revenue DECIMAL
) AS $$
BEGIN
  IF NOT (auth.uid() IS NOT NULL AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin only';
  END IF;

  RETURN QUERY
  WITH
  sales_cycle AS (
    SELECT
      COALESCE(
        AVG(EXTRACT(EPOCH FROM (closed_at - created_at)) / 86400),
        60
      )::INT as avg_days
    FROM inquiries
    WHERE proposal_stage = 'closed'
      AND closed_at IS NOT NULL
      AND created_at >= CURRENT_DATE - INTERVAL '6 months'
  ),
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
  pipeline_forecast AS (
    SELECT
      i.id,
      i.price_dfy,
      i.created_at,
      m.avg_ticket_size,
      m.win_rate,
      sc.avg_days,
      (i.created_at::DATE + sc.avg_days) as estimated_close_date,
      COALESCE(i.price_dfy, m.avg_ticket_size) * m.win_rate as weighted_value
    FROM inquiries i
    CROSS JOIN metrics m
    CROSS JOIN sales_cycle sc
    WHERE i.proposal_stage NOT IN ('closed', 'lost', 'unopened')
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

-- ============================================================================
-- SECURE COMPREHENSIVE ADMIN METRICS (20260107000200)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_inquiry_pipeline_breakdown()
RETURNS TABLE(
  stage proposal_stage,
  count BIGINT,
  total_value DECIMAL,
  avg_value DECIMAL
) AS $$
BEGIN
  IF NOT (auth.uid() IS NOT NULL AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin only';
  END IF;

  RETURN QUERY
  SELECT
    proposal_stage,
    COUNT(*) as count,
    COALESCE(SUM(price_dfy), 0) as total_value,
    COALESCE(AVG(price_dfy), 0) as avg_value
  FROM inquiries
  WHERE proposal_stage NOT IN ('closed', 'lost')
  GROUP BY proposal_stage
  ORDER BY
    CASE proposal_stage
      WHEN 'unopened' THEN 1
      WHEN 'admin_reviewed' THEN 2
      WHEN 'in_queue' THEN 3
      WHEN 'working' THEN 4
      WHEN 'on_hold' THEN 5
      WHEN 'final_review' THEN 6
      WHEN 'ready' THEN 7
      WHEN 'sent' THEN 8
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_inquiry_conversion_rates()
RETURNS TABLE(
  total_inquiries BIGINT,
  proposal_created BIGINT,
  proposal_submitted BIGINT,
  proposal_sent BIGINT,
  closed_won BIGINT,
  closed_lost BIGINT,
  conversion_to_proposal DECIMAL,
  conversion_to_sent DECIMAL,
  win_rate DECIMAL,
  overall_conversion DECIMAL
) AS $$
BEGIN
  IF NOT (auth.uid() IS NOT NULL AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin only';
  END IF;

  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE proposal_content IS NOT NULL) as created,
      COUNT(*) FILTER (WHERE proposal_submitted_at IS NOT NULL) as submitted,
      COUNT(*) FILTER (WHERE proposal_stage = 'sent' OR proposal_stage IN ('closed', 'lost')) as sent,
      COUNT(*) FILTER (WHERE proposal_stage = 'closed') as won,
      COUNT(*) FILTER (WHERE proposal_stage = 'lost') as lost
    FROM inquiries
    WHERE created_at >= CURRENT_DATE - INTERVAL '6 months'
  )
  SELECT
    total,
    created,
    submitted,
    sent,
    won,
    lost,
    ROUND((created::DECIMAL / NULLIF(total, 0) * 100), 2) as conversion_to_proposal,
    ROUND((sent::DECIMAL / NULLIF(total, 0) * 100), 2) as conversion_to_sent,
    ROUND((won::DECIMAL / NULLIF(won + lost, 0) * 100), 2) as win_rate,
    ROUND((won::DECIMAL / NULLIF(total, 0) * 100), 2) as overall_conversion
  FROM stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_inquiries_by_source()
RETURNS TABLE(
  source_type TEXT,
  source_name TEXT,
  inquiry_count BIGINT,
  closed_count BIGINT,
  win_rate DECIMAL,
  total_value DECIMAL
) AS $$
BEGIN
  IF NOT (auth.uid() IS NOT NULL AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin only';
  END IF;

  RETURN QUERY
  SELECT
    'DFY Partner'::TEXT as source_type,
    COALESCE(p.name, 'Unknown') as source_name,
    COUNT(i.*) as inquiry_count,
    COUNT(*) FILTER (WHERE i.proposal_stage = 'closed') as closed_count,
    ROUND(
      COUNT(*) FILTER (WHERE i.proposal_stage = 'closed')::DECIMAL /
      NULLIF(COUNT(*) FILTER (WHERE i.proposal_stage IN ('closed', 'lost')), 0) * 100,
      2
    ) as win_rate,
    COALESCE(SUM(i.price_dfy) FILTER (WHERE i.proposal_stage = 'closed'), 0) as total_value
  FROM inquiries i
  LEFT JOIN profiles p ON p.id = i.submitted_by
  GROUP BY p.name

  UNION ALL

  SELECT
    'Blueprint'::TEXT as source_type,
    COALESCE(b.name, 'Custom') as source_name,
    COUNT(i.*) as inquiry_count,
    COUNT(*) FILTER (WHERE i.proposal_stage = 'closed') as closed_count,
    ROUND(
      COUNT(*) FILTER (WHERE i.proposal_stage = 'closed')::DECIMAL /
      NULLIF(COUNT(*) FILTER (WHERE i.proposal_stage IN ('closed', 'lost')), 0) * 100,
      2
    ) as win_rate,
    COALESCE(SUM(i.price_dfy) FILTER (WHERE i.proposal_stage = 'closed'), 0) as total_value
  FROM inquiries i
  LEFT JOIN blueprints b ON b.id = i.blueprint_id
  GROUP BY b.name

  ORDER BY inquiry_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_inquiry_timeline(p_months INT DEFAULT 12)
RETURNS TABLE(
  month TIMESTAMPTZ,
  created_count BIGINT,
  sent_count BIGINT,
  closed_count BIGINT,
  lost_count BIGINT
) AS $$
BEGIN
  IF NOT (auth.uid() IS NOT NULL AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin only';
  END IF;

  RETURN QUERY
  SELECT
    DATE_TRUNC('month', created_at) as month,
    COUNT(*) as created_count,
    COUNT(*) FILTER (
      WHERE proposal_stage = 'sent'
      OR proposal_stage IN ('closed', 'lost')
    ) as sent_count,
    COUNT(*) FILTER (WHERE proposal_stage = 'closed') as closed_count,
    COUNT(*) FILTER (WHERE proposal_stage = 'lost') as lost_count
  FROM inquiries
  WHERE created_at >= CURRENT_DATE - (p_months || ' months')::INTERVAL
  GROUP BY DATE_TRUNC('month', created_at)
  ORDER BY month ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_project_status_distribution()
RETURNS TABLE(
  phase TEXT,
  status project_status,
  project_count BIGINT,
  total_value DECIMAL
) AS $$
BEGIN
  IF NOT (auth.uid() IS NOT NULL AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin only';
  END IF;

  RETURN QUERY
  SELECT
    CASE
      WHEN status IN ('deliverables_pending', 'awaiting_signoff', 'signed_off') THEN 'Sign-off'
      WHEN status IN ('agreement_sent', 'agreement_signed') THEN 'Agreement'
      WHEN status IN ('payment_pending', 'payment_partial', 'payment_paid') THEN 'Payment'
      WHEN status IN ('collecting_access', 'access_complete', 'dev_assigned') THEN 'Onboarding'
      WHEN status IN ('in_progress', 'blocked_client', 'blocked_internal', 'review_checkpoint', 'revisions', 'final_qa') THEN 'Development'
      WHEN status IN ('delivered', 'acceptance_pending', 'accepted') THEN 'Delivery'
      WHEN status IN ('completed', 'cancelled', 'on_hold') THEN 'Closed'
      ELSE 'Other'
    END as phase,
    status,
    COUNT(*) as project_count,
    COALESCE(SUM(price_dfy), 0) as total_value
  FROM projects
  GROUP BY phase, status
  ORDER BY
    CASE phase
      WHEN 'Sign-off' THEN 1
      WHEN 'Agreement' THEN 2
      WHEN 'Payment' THEN 3
      WHEN 'Onboarding' THEN 4
      WHEN 'Development' THEN 5
      WHEN 'Delivery' THEN 6
      WHEN 'Closed' THEN 7
      ELSE 8
    END,
    project_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_project_health_indicators()
RETURNS TABLE(
  total_active_projects BIGINT,
  on_track_projects BIGINT,
  at_risk_projects BIGINT,
  blocked_projects BIGINT,
  overdue_projects BIGINT,
  on_hold_projects BIGINT
) AS $$
BEGIN
  IF NOT (auth.uid() IS NOT NULL AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin only';
  END IF;

  RETURN QUERY
  WITH project_stats AS (
    SELECT
      p.id,
      p.status,
      p.target_delivery_date,
      EXISTS(
        SELECT 1 FROM blockers b
        WHERE b.project_id = p.id
        AND b.status NOT IN ('resolved', 'closed')
      ) as has_active_blockers,
      EXISTS(
        SELECT 1 FROM deliverables d
        WHERE d.project_id = p.id
        AND d.due_date < CURRENT_DATE
        AND d.status NOT IN ('done')
      ) as has_overdue_deliverables
    FROM projects p
    WHERE p.status NOT IN ('completed', 'cancelled')
  )
  SELECT
    COUNT(*) as total_active_projects,
    COUNT(*) FILTER (
      WHERE NOT has_active_blockers
      AND NOT has_overdue_deliverables
      AND status NOT LIKE 'blocked_%'
    ) as on_track_projects,
    COUNT(*) FILTER (
      WHERE has_active_blockers OR has_overdue_deliverables
    ) as at_risk_projects,
    COUNT(*) FILTER (WHERE status LIKE 'blocked_%') as blocked_projects,
    COUNT(*) FILTER (WHERE has_overdue_deliverables) as overdue_projects,
    COUNT(*) FILTER (WHERE status = 'on_hold') as on_hold_projects
  FROM project_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_project_timeline_metrics()
RETURNS TABLE(
  avg_duration_days INT,
  avg_time_to_start_days INT,
  avg_time_to_delivery_days INT,
  median_duration_days INT
) AS $$
BEGIN
  IF NOT (auth.uid() IS NOT NULL AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin only';
  END IF;

  RETURN QUERY
  WITH durations AS (
    SELECT
      EXTRACT(EPOCH FROM (delivered_at - started_at)) / 86400 as duration_days,
      EXTRACT(EPOCH FROM (started_at - created_at)) / 86400 as time_to_start_days,
      EXTRACT(EPOCH FROM (delivered_at - started_at)) / 86400 as time_to_delivery_days
    FROM projects
    WHERE delivered_at IS NOT NULL
      AND started_at IS NOT NULL
      AND created_at >= CURRENT_DATE - INTERVAL '12 months'
  )
  SELECT
    AVG(duration_days)::INT as avg_duration_days,
    AVG(time_to_start_days)::INT as avg_time_to_start_days,
    AVG(time_to_delivery_days)::INT as avg_time_to_delivery_days,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_days)::INT as median_duration_days
  FROM durations;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_developer_utilization()
RETURNS TABLE(
  dev_id UUID,
  dev_name TEXT,
  active_projects BIGINT,
  total_deliverables BIGINT,
  pending_deliverables BIGINT,
  in_progress_deliverables BIGINT,
  completed_deliverables BIGINT,
  hours_logged_this_month DECIMAL,
  is_available BOOLEAN
) AS $$
BEGIN
  IF NOT (auth.uid() IS NOT NULL AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin only';
  END IF;

  RETURN QUERY
  SELECT
    p.id as dev_id,
    p.name as dev_name,
    COUNT(DISTINCT pr.id) FILTER (
      WHERE pr.status NOT IN ('completed', 'cancelled')
    ) as active_projects,
    COUNT(d.id) as total_deliverables,
    COUNT(d.id) FILTER (WHERE d.status = 'pending') as pending_deliverables,
    COUNT(d.id) FILTER (WHERE d.status = 'in_progress') as in_progress_deliverables,
    COUNT(d.id) FILTER (WHERE d.status = 'done') as completed_deliverables,
    COALESCE(
      SUM(te.duration_minutes) FILTER (
        WHERE te.entry_date >= DATE_TRUNC('month', CURRENT_DATE)
      ) / 60,
      0
    ) as hours_logged_this_month,
    COALESCE(da.is_available, false) as is_available
  FROM profiles p
  LEFT JOIN projects pr ON pr.assigned_dev_id = p.id
  LEFT JOIN deliverables d ON d.project_id = pr.id
  LEFT JOIN time_entries te ON te.deliverable_id = d.id AND te.user_id = p.id
  LEFT JOIN dev_availability da ON da.dev_id = p.id
  WHERE p.role = 'dev'
  GROUP BY p.id, p.name, da.is_available
  ORDER BY active_projects DESC, hours_logged_this_month DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_time_tracking_summary()
RETURNS TABLE(
  total_hours_logged DECIMAL,
  hours_this_month DECIMAL,
  hours_this_week DECIMAL,
  avg_hours_per_deliverable DECIMAL,
  active_timers_count BIGINT
) AS $$
BEGIN
  IF NOT (auth.uid() IS NOT NULL AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin only';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(SUM(duration_minutes) / 60, 0) as total_hours_logged,
    COALESCE(
      SUM(duration_minutes) FILTER (
        WHERE entry_date >= DATE_TRUNC('month', CURRENT_DATE)
      ) / 60,
      0
    ) as hours_this_month,
    COALESCE(
      SUM(duration_minutes) FILTER (
        WHERE entry_date >= DATE_TRUNC('week', CURRENT_DATE)
      ) / 60,
      0
    ) as hours_this_week,
    COALESCE(
      AVG(duration_minutes) / 60,
      0
    ) as avg_hours_per_deliverable,
    (SELECT COUNT(*) FROM active_timers) as active_timers_count
  FROM time_entries;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_dfy_partner_performance()
RETURNS TABLE(
  partner_id UUID,
  partner_name TEXT,
  total_inquiries BIGINT,
  closed_inquiries BIGINT,
  lost_inquiries BIGINT,
  win_rate DECIMAL,
  avg_deal_size DECIMAL,
  total_revenue DECIMAL,
  total_commission DECIMAL,
  avg_time_to_close_days INT
) AS $$
BEGIN
  IF NOT (auth.uid() IS NOT NULL AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin only';
  END IF;

  RETURN QUERY
  SELECT
    p.id as partner_id,
    p.name as partner_name,
    COUNT(i.*) as total_inquiries,
    COUNT(*) FILTER (WHERE i.proposal_stage = 'closed') as closed_inquiries,
    COUNT(*) FILTER (WHERE i.proposal_stage = 'lost') as lost_inquiries,
    ROUND(
      COUNT(*) FILTER (WHERE i.proposal_stage = 'closed')::DECIMAL /
      NULLIF(COUNT(*) FILTER (WHERE i.proposal_stage IN ('closed', 'lost')), 0) * 100,
      2
    ) as win_rate,
    COALESCE(
      AVG(i.price_dfy) FILTER (WHERE i.proposal_stage = 'closed'),
      0
    ) as avg_deal_size,
    COALESCE(
      SUM(pr.price_dfy),
      0
    ) as total_revenue,
    COALESCE(
      SUM(pr.price_dfy * pr.dfy_commission_pct / 100),
      0
    ) as total_commission,
    COALESCE(
      AVG(
        EXTRACT(EPOCH FROM (i.closed_at - i.created_at)) / 86400
      ) FILTER (WHERE i.proposal_stage = 'closed'),
      0
    )::INT as avg_time_to_close_days
  FROM profiles p
  LEFT JOIN inquiries i ON i.submitted_by = p.id
  LEFT JOIN projects pr ON pr.dfy_partner_id = p.id
  WHERE p.role = 'dfy'
  GROUP BY p.id, p.name
  ORDER BY total_inquiries DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_deliverables_overview()
RETURNS TABLE(
  total_deliverables BIGINT,
  pending_deliverables BIGINT,
  in_progress_deliverables BIGINT,
  blocked_deliverables BIGINT,
  completed_deliverables BIGINT,
  overdue_deliverables BIGINT,
  completion_rate DECIMAL
) AS $$
BEGIN
  IF NOT (auth.uid() IS NOT NULL AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin only';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*) as total_deliverables,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_deliverables,
    COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_deliverables,
    COUNT(*) FILTER (WHERE status = 'blocked') as blocked_deliverables,
    COUNT(*) FILTER (WHERE status = 'done') as completed_deliverables,
    COUNT(*) FILTER (
      WHERE due_date < CURRENT_DATE AND status NOT IN ('done')
    ) as overdue_deliverables,
    ROUND(
      COUNT(*) FILTER (WHERE status = 'done')::DECIMAL / NULLIF(COUNT(*), 0) * 100,
      2
    ) as completion_rate
  FROM deliverables;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_blockers_overview()
RETURNS TABLE(
  total_active_blockers BIGINT,
  critical_blockers BIGINT,
  high_priority_blockers BIGINT,
  unacknowledged_blockers BIGINT,
  avg_time_to_acknowledge_hours DECIMAL,
  avg_time_to_resolve_hours DECIMAL,
  resolution_rate DECIMAL
) AS $$
BEGIN
  IF NOT (auth.uid() IS NOT NULL AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin only';
  END IF;

  RETURN QUERY
  WITH blocker_stats AS (
    SELECT
      b.*,
      EXTRACT(EPOCH FROM (acknowledged_at - created_at)) / 3600 as ack_hours,
      EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600 as resolve_hours
    FROM blockers b
  )
  SELECT
    COUNT(*) FILTER (WHERE status NOT IN ('resolved', 'closed')) as total_active_blockers,
    COUNT(*) FILTER (
      WHERE status NOT IN ('resolved', 'closed') AND priority = 'critical'
    ) as critical_blockers,
    COUNT(*) FILTER (
      WHERE status NOT IN ('resolved', 'closed') AND priority = 'high'
    ) as high_priority_blockers,
    COUNT(*) FILTER (WHERE acknowledged_at IS NULL) as unacknowledged_blockers,
    COALESCE(AVG(ack_hours), 0) as avg_time_to_acknowledge_hours,
    COALESCE(AVG(resolve_hours), 0) as avg_time_to_resolve_hours,
    ROUND(
      COUNT(*) FILTER (WHERE status IN ('resolved', 'closed'))::DECIMAL /
      NULLIF(COUNT(*), 0) * 100,
      2
    ) as resolution_rate
  FROM blocker_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_activity_overview()
RETURNS TABLE(
  total_activities BIGINT,
  activities_this_month BIGINT,
  activities_this_week BIGINT,
  most_common_action TEXT,
  most_active_user_id UUID,
  most_active_user_name TEXT
) AS $$
BEGIN
  IF NOT (auth.uid() IS NOT NULL AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin only';
  END IF;

  RETURN QUERY
  WITH activity_stats AS (
    SELECT
      a.*,
      p.name as user_name
    FROM activity_log a
    LEFT JOIN profiles p ON p.id = a.user_id
  )
  SELECT
    COUNT(*) as total_activities,
    COUNT(*) FILTER (
      WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
    ) as activities_this_month,
    COUNT(*) FILTER (
      WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE)
    ) as activities_this_week,
    (
      SELECT action FROM activity_stats
      GROUP BY action
      ORDER BY COUNT(*) DESC
      LIMIT 1
    ) as most_common_action,
    (
      SELECT user_id FROM activity_stats
      WHERE user_id IS NOT NULL
      GROUP BY user_id
      ORDER BY COUNT(*) DESC
      LIMIT 1
    ) as most_active_user_id,
    (
      SELECT user_name FROM activity_stats
      WHERE user_id IS NOT NULL
      GROUP BY user_id, user_name
      ORDER BY COUNT(*) DESC
      LIMIT 1
    ) as most_active_user_name
  FROM activity_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_comment_statistics()
RETURNS TABLE(
  total_inquiry_comments BIGINT,
  total_blocker_comments BIGINT,
  total_deliverable_comments BIGINT,
  unresolved_inquiry_comments BIGINT,
  avg_response_time_hours DECIMAL
) AS $$
BEGIN
  IF NOT (auth.uid() IS NOT NULL AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin only';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM inquiry_comments) as total_inquiry_comments,
    (SELECT COUNT(*) FROM blocker_comments) as total_blocker_comments,
    (SELECT COUNT(*) FROM proposal_deliverable_comments) as total_deliverable_comments,
    (SELECT COUNT(*) FROM inquiry_comments WHERE resolved = FALSE) as unresolved_inquiry_comments,
    0::DECIMAL as avg_response_time_hours
  ;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_opportunity_metrics()
RETURNS TABLE(
  total_opportunities BIGINT,
  open_opportunities BIGINT,
  filled_opportunities BIGINT,
  avg_time_to_fill_days INT,
  total_invitations BIGINT,
  pending_invitations BIGINT,
  accepted_invitations BIGINT,
  declined_invitations BIGINT,
  invitation_acceptance_rate DECIMAL,
  total_applications BIGINT,
  pending_applications BIGINT
) AS $$
BEGIN
  IF NOT (auth.uid() IS NOT NULL AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin only';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM project_opportunities) as total_opportunities,
    (SELECT COUNT(*) FROM project_opportunities WHERE status = 'open') as open_opportunities,
    (SELECT COUNT(*) FROM project_opportunities WHERE status = 'filled') as filled_opportunities,
    (
      SELECT COALESCE(
        AVG(EXTRACT(EPOCH FROM (closed_at - published_at)) / 86400),
        0
      )::INT
      FROM project_opportunities
      WHERE status = 'filled' AND closed_at IS NOT NULL
    ) as avg_time_to_fill_days,
    (SELECT COUNT(*) FROM project_invitations) as total_invitations,
    (SELECT COUNT(*) FROM project_invitations WHERE status = 'pending') as pending_invitations,
    (SELECT COUNT(*) FROM project_invitations WHERE status = 'accepted') as accepted_invitations,
    (SELECT COUNT(*) FROM project_invitations WHERE status = 'declined') as declined_invitations,
    (
      SELECT ROUND(
        COUNT(*) FILTER (WHERE status = 'accepted')::DECIMAL /
        NULLIF(COUNT(*) FILTER (WHERE status IN ('accepted', 'declined')), 0) * 100,
        2
      )
      FROM project_invitations
    ) as invitation_acceptance_rate,
    (SELECT COUNT(*) FROM project_applications) as total_applications,
    (SELECT COUNT(*) FROM project_applications WHERE status = 'pending') as pending_applications
  ;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_comprehensive_dashboard_metrics()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  IF NOT (auth.uid() IS NOT NULL AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin only';
  END IF;

  SELECT json_build_object(
    'financial', (SELECT row_to_json(f) FROM get_financial_hero_metrics() f),
    'inquiry_pipeline', (SELECT row_to_json(i) FROM get_inquiry_conversion_rates() i),
    'project_health', (SELECT row_to_json(p) FROM get_project_health_indicators() p),
    'developer_performance', (SELECT row_to_json(d) FROM get_time_tracking_summary() d),
    'blockers', (SELECT row_to_json(b) FROM get_blockers_overview() b),
    'deliverables', (SELECT row_to_json(del) FROM get_deliverables_overview() del),
    'activity', (SELECT row_to_json(a) FROM get_activity_overview() a),
    'opportunities', (SELECT row_to_json(o) FROM get_opportunity_metrics() o)
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- SECURE EXPENSE METRICS (20260108000002)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_expense_summary()
RETURNS json
language plpgsql
stable
security definer
as $$
declare
  result json;
begin
  IF NOT (auth.uid() IS NOT NULL AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin only';
  END IF;

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

CREATE OR REPLACE FUNCTION get_project_expenses(p_project_id uuid)
returns numeric
language plpgsql
stable
security definer
as $$
begin
  -- Use existing can_access_project helper
  IF NOT can_access_project(p_project_id) THEN
    RAISE EXCEPTION 'Access denied: Insufficient permissions for this project';
  END IF;

  return (
    select coalesce(sum(amount), 0)
    from expenses
    where project_id = p_project_id
  );
end;
$$;
