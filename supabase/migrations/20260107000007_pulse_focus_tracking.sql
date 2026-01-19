-- Add focus and roll tracking to daily tasks
ALTER TABLE pulse_daily_tasks
ADD COLUMN is_focus BOOLEAN DEFAULT FALSE,
ADD COLUMN times_rolled INTEGER DEFAULT 0;

-- Add index for focus queries
CREATE INDEX idx_pulse_daily_tasks_focus ON pulse_daily_tasks(user_id, date, is_focus) WHERE is_focus = TRUE;

COMMENT ON COLUMN pulse_daily_tasks.is_focus IS 'True if this is a top-3 focus item (earns 10 pts instead of 3)';
COMMENT ON COLUMN pulse_daily_tasks.times_rolled IS 'Number of times this task has been rolled forward';
