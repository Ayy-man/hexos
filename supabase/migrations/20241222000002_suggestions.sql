-- Suggestions table for user feedback
CREATE TABLE suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'implemented', 'declined')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add updated_at trigger
CREATE TRIGGER update_suggestions_updated_at
  BEFORE UPDATE ON suggestions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS Policies
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;

-- Everyone can create suggestions
CREATE POLICY "Users can create suggestions"
  ON suggestions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can see their own suggestions
CREATE POLICY "Users can view own suggestions"
  ON suggestions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admin/internal can see all suggestions
CREATE POLICY "Admin can view all suggestions"
  ON suggestions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'internal')
    )
  );

-- Admin/internal can update suggestions (status, notes)
CREATE POLICY "Admin can update suggestions"
  ON suggestions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'internal')
    )
  );

-- Admin can delete suggestions
CREATE POLICY "Admin can delete suggestions"
  ON suggestions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create index for faster queries
CREATE INDEX suggestions_user_id_idx ON suggestions(user_id);
CREATE INDEX suggestions_status_idx ON suggestions(status);
CREATE INDEX suggestions_created_at_idx ON suggestions(created_at DESC);
