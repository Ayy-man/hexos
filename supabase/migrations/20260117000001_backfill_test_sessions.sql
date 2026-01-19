-- Backfill test sessions for deliverables already in testing zone
-- This is a one-time migration to fix existing data where deliverables
-- reached 90%+ before the auto-create test session feature was implemented

INSERT INTO deliverable_tests (deliverable_id, stage, status)
SELECT d.id, 'dev', 'pending'
FROM deliverables d
LEFT JOIN deliverable_tests dt ON d.id = dt.deliverable_id AND dt.stage = 'dev'
WHERE d.hill_position >= 90
  AND dt.id IS NULL
  AND NOT EXISTS (
    -- Avoid duplicate inserts (UNIQUE constraint on deliverable_id, stage)
    SELECT 1 FROM deliverable_tests existing
    WHERE existing.deliverable_id = d.id AND existing.stage = 'dev'
  )
ON CONFLICT (deliverable_id, stage) DO NOTHING;
