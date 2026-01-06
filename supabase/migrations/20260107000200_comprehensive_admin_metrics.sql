-- hexOS Comprehensive Admin Metrics System
-- ALL metrics functions for admin dashboard

-- ============================================================================
-- INQUIRY PIPELINE METRICS
-- ============================================================================

-- Function: Get inquiry pipeline stage breakdown
CREATE OR REPLACE FUNCTION get_inquiry_pipeline_breakdown()
RETURNS TABLE(
  stage proposal_stage,
  count BIGINT,
  total_value DECIMAL,
  avg_value DECIMAL
) AS $$
BEGIN
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

-- Function: Get inquiry conversion rates
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

-- Function: Get inquiries by source
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
  RETURN QUERY
  -- By DFY Partner
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

  -- By Blueprint
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

-- Function: Get inquiry timeline (last N months)
CREATE OR REPLACE FUNCTION get_inquiry_timeline(p_months INT DEFAULT 12)
RETURNS TABLE(
  month TIMESTAMPTZ,
  created_count BIGINT,
  sent_count BIGINT,
  closed_count BIGINT,
  lost_count BIGINT
) AS $$
BEGIN
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

-- ============================================================================
-- PROJECT HEALTH METRICS
-- ============================================================================

-- Function: Get project status distribution
CREATE OR REPLACE FUNCTION get_project_status_distribution()
RETURNS TABLE(
  phase TEXT,
  status project_status,
  project_count BIGINT,
  total_value DECIMAL
) AS $$
BEGIN
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

-- Function: Get project health indicators
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

-- Function: Get project timeline metrics
CREATE OR REPLACE FUNCTION get_project_timeline_metrics()
RETURNS TABLE(
  avg_duration_days INT,
  avg_time_to_start_days INT,
  avg_time_to_delivery_days INT,
  median_duration_days INT
) AS $$
BEGIN
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

-- ============================================================================
-- DEVELOPER PERFORMANCE METRICS
-- ============================================================================

-- Function: Get developer utilization overview
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

-- Function: Get time tracking summary
CREATE OR REPLACE FUNCTION get_time_tracking_summary()
RETURNS TABLE(
  total_hours_logged DECIMAL,
  hours_this_month DECIMAL,
  hours_this_week DECIMAL,
  avg_hours_per_deliverable DECIMAL,
  active_timers_count BIGINT
) AS $$
BEGIN
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

-- ============================================================================
-- DFY PARTNER METRICS
-- ============================================================================

-- Function: Get DFY partner performance
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

-- ============================================================================
-- DELIVERABLES & TIMELINE METRICS
-- ============================================================================

-- Function: Get deliverables overview
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

-- ============================================================================
-- BLOCKER & ISSUE METRICS
-- ============================================================================

-- Function: Get blockers overview
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

-- ============================================================================
-- ENGAGEMENT & ACTIVITY METRICS
-- ============================================================================

-- Function: Get activity overview
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

-- Function: Get comment statistics
CREATE OR REPLACE FUNCTION get_comment_statistics()
RETURNS TABLE(
  total_inquiry_comments BIGINT,
  total_blocker_comments BIGINT,
  total_deliverable_comments BIGINT,
  unresolved_inquiry_comments BIGINT,
  avg_response_time_hours DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM inquiry_comments) as total_inquiry_comments,
    (SELECT COUNT(*) FROM blocker_comments) as total_blocker_comments,
    (SELECT COUNT(*) FROM proposal_deliverable_comments) as total_deliverable_comments,
    (SELECT COUNT(*) FROM inquiry_comments WHERE resolved = FALSE) as unresolved_inquiry_comments,
    0::DECIMAL as avg_response_time_hours -- TODO: Calculate based on thread timestamps
  ;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- OPPORTUNITY & INVITATION METRICS
-- ============================================================================

-- Function: Get opportunity metrics
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

-- ============================================================================
-- COMPREHENSIVE DASHBOARD METRICS
-- ============================================================================

-- Function: Get all dashboard metrics in one call
CREATE OR REPLACE FUNCTION get_comprehensive_dashboard_metrics()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
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
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION get_inquiry_pipeline_breakdown IS 'Returns inquiry count and value by pipeline stage';
COMMENT ON FUNCTION get_inquiry_conversion_rates IS 'Returns conversion rates through inquiry funnel';
COMMENT ON FUNCTION get_inquiries_by_source IS 'Returns inquiry performance by source (partner, blueprint)';
COMMENT ON FUNCTION get_project_status_distribution IS 'Returns project count by status and phase';
COMMENT ON FUNCTION get_project_health_indicators IS 'Returns project health metrics (on track, at risk, blocked)';
COMMENT ON FUNCTION get_developer_utilization IS 'Returns developer workload and hours logged';
COMMENT ON FUNCTION get_dfy_partner_performance IS 'Returns DFY partner metrics (inquiries, win rate, revenue)';
COMMENT ON FUNCTION get_deliverables_overview IS 'Returns deliverable status breakdown';
COMMENT ON FUNCTION get_blockers_overview IS 'Returns active blockers and resolution metrics';
COMMENT ON FUNCTION get_activity_overview IS 'Returns activity log statistics';
COMMENT ON FUNCTION get_opportunity_metrics IS 'Returns opportunity and invitation metrics';
COMMENT ON FUNCTION get_comprehensive_dashboard_metrics IS 'Returns all dashboard metrics in one JSON object';
