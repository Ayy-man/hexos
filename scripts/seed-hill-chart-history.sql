-- ============================================
-- SEED HILL CHART POSITION HISTORY
-- ============================================
-- Run this in Supabase SQL Editor
-- Creates realistic progress from Jan 5 to today
-- ============================================

-- Clear existing history for sub-deliverables
DELETE FROM deliverable_position_history
WHERE deliverable_id IN (
  SELECT id FROM deliverables WHERE parent_id IS NOT NULL
);

-- Get a user ID for created_by
DO $$
DECLARE
  v_user_id UUID;
  v_deliverable RECORD;
  v_day DATE;
  v_position INTEGER;
  v_prev_position INTEGER;
  v_target INTEGER;
BEGIN
  -- Get any user
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;

  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id FROM profiles LIMIT 1;
  END IF;

  -- Loop through sub-deliverables
  FOR v_deliverable IN
    SELECT id, title, hill_position FROM deliverables WHERE parent_id IS NOT NULL
  LOOP
    v_prev_position := 0;
    v_target := COALESCE(v_deliverable.hill_position, 20);

    -- Jan 5 to Jan 11
    FOR v_day IN SELECT generate_series('2026-01-05'::date, CURRENT_DATE, '1 day'::interval)::date
    LOOP
      -- 80% chance of progress
      IF random() > 0.2 THEN
        v_position := LEAST(v_prev_position + floor(random() * 10 + 3)::int, v_target);

        INSERT INTO deliverable_position_history (
          deliverable_id, position, created_at, created_by, note
        ) VALUES (
          v_deliverable.id,
          v_position,
          v_day + (floor(random() * 8 + 9) || ' hours')::interval,
          v_user_id,
          CASE
            WHEN v_day = '2026-01-05' THEN 'Project kickoff'
            WHEN v_position >= 50 AND v_prev_position < 50 THEN 'Moving to implementation'
            ELSE NULL
          END
        );

        v_prev_position := v_position;
      END IF;
    END LOOP;

    RAISE NOTICE 'Added history for: %', v_deliverable.title;
  END LOOP;
END $$;

-- Show results
SELECT
  d.title,
  COUNT(h.id) as entries,
  MIN(h.created_at)::date as first_update,
  MAX(h.created_at)::date as last_update,
  MIN(h.position) as start_pos,
  MAX(h.position) as end_pos
FROM deliverables d
LEFT JOIN deliverable_position_history h ON d.id = h.deliverable_id
WHERE d.parent_id IS NOT NULL
GROUP BY d.id, d.title
ORDER BY d.title;
