-- hexOS Phase 4.2: Enhanced Progress Calculation Functions
-- SQL functions for calculating expected progress with delay adjustments

-- ============================================
-- 1. Function: Count working days (excluding Sundays)
-- ============================================
CREATE OR REPLACE FUNCTION public.count_working_days(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS INT AS $$
DECLARE
  v_count INT := 0;
  v_current DATE := p_start_date;
BEGIN
  IF p_end_date < p_start_date THEN
    RETURN 0;
  END IF;

  WHILE v_current <= p_end_date LOOP
    -- Exclude Sundays (0 = Sunday in PostgreSQL's EXTRACT DOW)
    IF EXTRACT(DOW FROM v_current) != 0 THEN
      v_count := v_count + 1;
    END IF;
    v_current := v_current + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION count_working_days IS 'Counts days between two dates excluding Sundays';

-- ============================================
-- 2. Function: Calculate expected progress
-- ============================================
CREATE OR REPLACE FUNCTION public.calculate_expected_progress(p_project_id UUID)
RETURNS TABLE (
  expected_progress_pct DECIMAL,
  actual_progress_pct DECIMAL,
  variance_pct DECIMAL,
  is_at_risk BOOLEAN,
  client_delay_days INT,
  dev_delay_days INT,
  total_deliverables INT,
  effective_working_days INT
) AS $$
DECLARE
  v_project RECORD;
  v_total_work DECIMAL;
  v_actual_work DECIMAL;
  v_client_delay_days INT;
  v_dev_delay_days INT;
  v_total_calendar_days INT;
  v_total_working_days INT;
  v_effective_working_days INT;
  v_elapsed_working_days INT;
  v_elapsed_calendar_days INT;
  v_expected_daily_progress DECIMAL;
  v_expected_pct DECIMAL;
  v_actual_pct DECIMAL;
  v_variance DECIMAL;
  v_total_deliverables INT;
BEGIN
  -- Get project details
  SELECT p.id, p.started_at, p.target_delivery_date
  INTO v_project
  FROM projects p
  WHERE p.id = p_project_id;

  IF v_project.id IS NULL THEN
    RETURN QUERY SELECT
      0::DECIMAL, 0::DECIMAL, 0::DECIMAL, FALSE,
      0, 0, 0, 0;
    RETURN;
  END IF;

  -- If no dates set, return zeros
  IF v_project.started_at IS NULL OR v_project.target_delivery_date IS NULL THEN
    RETURN QUERY SELECT
      0::DECIMAL, 0::DECIMAL, 0::DECIMAL, FALSE,
      0, 0, 0, 0;
    RETURN;
  END IF;

  -- Count deliverables and calculate actual progress
  -- Each sub-deliverable contributes hill_position (0-100)
  -- Total work = num_deliverables * 100
  SELECT
    COUNT(*),
    COALESCE(SUM(COALESCE(d.hill_position, 0)), 0)
  INTO v_total_deliverables, v_actual_work
  FROM deliverables d
  WHERE d.project_id = p_project_id
    AND d.parent_id IS NOT NULL;  -- Only count sub-deliverables

  IF v_total_deliverables = 0 THEN
    RETURN QUERY SELECT
      0::DECIMAL, 0::DECIMAL, 0::DECIMAL, FALSE,
      0, 0, 0, 0;
    RETURN;
  END IF;

  v_total_work := v_total_deliverables * 100;
  v_actual_pct := (v_actual_work / v_total_work) * 100;

  -- Get delay days
  SELECT COALESCE(SUM(CASE WHEN delay_type = 'client_delay' THEN days_count ELSE 0 END), 0),
         COALESCE(SUM(CASE WHEN delay_type = 'dev_delay' THEN days_count ELSE 0 END), 0)
  INTO v_client_delay_days, v_dev_delay_days
  FROM project_delays
  WHERE project_id = p_project_id;

  -- Calculate working days
  v_total_working_days := count_working_days(
    v_project.started_at::DATE,
    v_project.target_delivery_date
  );

  -- Effective working days = total - client delays
  v_effective_working_days := GREATEST(v_total_working_days - v_client_delay_days, 1);

  -- Elapsed working days
  v_elapsed_working_days := count_working_days(
    v_project.started_at::DATE,
    CURRENT_DATE
  );

  -- Adjust elapsed for client delays (cap at effective total)
  v_elapsed_working_days := LEAST(
    GREATEST(v_elapsed_working_days - v_client_delay_days, 0),
    v_effective_working_days
  );

  -- Expected progress based on time elapsed
  IF v_effective_working_days > 0 THEN
    v_expected_pct := (v_elapsed_working_days::DECIMAL / v_effective_working_days::DECIMAL) * 100;
  ELSE
    v_expected_pct := 100;
  END IF;

  -- Cap at 100%
  v_expected_pct := LEAST(v_expected_pct, 100);

  -- Variance = actual - expected
  v_variance := v_actual_pct - v_expected_pct;

  RETURN QUERY SELECT
    ROUND(v_expected_pct, 1),
    ROUND(v_actual_pct, 1),
    ROUND(v_variance, 1),
    v_variance < -30,  -- At risk if more than 30% behind
    v_client_delay_days,
    v_dev_delay_days,
    v_total_deliverables,
    v_effective_working_days;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION calculate_expected_progress IS 'Calculates expected vs actual progress with delay adjustments';

-- ============================================
-- 3. Function: Get dev logging status
-- ============================================
CREATE OR REPLACE FUNCTION public.get_dev_logging_status(p_user_id UUID)
RETURNS TABLE (
  needs_checkin BOOLEAN,
  last_checkin_date DATE,
  overdue_projects UUID[],
  is_snoozed BOOLEAN,
  snoozed_until TIMESTAMPTZ
) AS $$
DECLARE
  v_last_checkin DATE;
  v_overdue_projects UUID[];
  v_is_snoozed BOOLEAN := FALSE;
  v_snoozed_until TIMESTAMPTZ;
BEGIN
  -- Check snooze status
  SELECT cs.snoozed_until INTO v_snoozed_until
  FROM checkin_snoozes cs
  WHERE cs.user_id = p_user_id;

  IF v_snoozed_until IS NOT NULL AND v_snoozed_until > NOW() THEN
    v_is_snoozed := TRUE;
  END IF;

  -- Get last check-in date
  SELECT MAX(dc.checkin_date) INTO v_last_checkin
  FROM dev_checkins dc
  WHERE dc.user_id = p_user_id;

  -- Get projects needing check-in (assigned to dev, no check-in today or yesterday)
  SELECT ARRAY_AGG(pa.project_id)
  INTO v_overdue_projects
  FROM project_assignments pa
  JOIN projects p ON p.id = pa.project_id
  WHERE pa.user_id = p_user_id
    AND pa.role = 'dev'
    AND p.status NOT IN ('completed', 'cancelled', 'on_hold')
    AND NOT EXISTS (
      SELECT 1 FROM dev_checkins dc
      WHERE dc.user_id = p_user_id
        AND dc.project_id = pa.project_id
        AND dc.checkin_date >= CURRENT_DATE - INTERVAL '1 day'
    );

  RETURN QUERY SELECT
    COALESCE(ARRAY_LENGTH(v_overdue_projects, 1), 0) > 0 AND NOT v_is_snoozed,
    v_last_checkin,
    COALESCE(v_overdue_projects, '{}'::UUID[]),
    v_is_snoozed,
    v_snoozed_until;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_dev_logging_status IS 'Returns check-in status for a dev user';

-- ============================================
-- 4. Grant permissions
-- ============================================
GRANT EXECUTE ON FUNCTION count_working_days(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_expected_progress(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dev_logging_status(UUID) TO authenticated;
