-- Quarterly reviews for end-of-quarter reflection
CREATE TABLE pulse_quarterly_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  targets_completed INTEGER,
  targets_total INTEGER,
  worked_text TEXT,
  didnt_work_text TEXT,
  carry_forward_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, year, quarter)
);

-- RLS
ALTER TABLE pulse_quarterly_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pulse_quarterly_reviews_own" ON pulse_quarterly_reviews
  FOR ALL USING (user_id = auth.uid());

-- Index
CREATE INDEX idx_pulse_quarterly_reviews_user ON pulse_quarterly_reviews(user_id, year, quarter);

COMMENT ON TABLE pulse_quarterly_reviews IS 'End-of-quarter reflection prompts';
