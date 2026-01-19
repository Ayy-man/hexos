-- Weekly reviews for Monday reflection prompts
CREATE TABLE pulse_weekly_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  tasks_completed INTEGER,
  points_earned INTEGER,
  streak_length INTEGER,
  focus_text TEXT,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, week_start)
);

-- RLS
ALTER TABLE pulse_weekly_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pulse_weekly_reviews_own" ON pulse_weekly_reviews
  FOR ALL USING (user_id = auth.uid());

-- Index
CREATE INDEX idx_pulse_weekly_reviews_user_week ON pulse_weekly_reviews(user_id, week_start);

COMMENT ON TABLE pulse_weekly_reviews IS 'Weekly reflection prompts shown on Monday mornings';
