-- Hierarchical Templates Migration
-- Adds parent_id and position to support nested template trees

-- ============================================================================
-- SCHEMA CHANGES
-- ============================================================================

-- Add new columns to requirement_templates
ALTER TABLE requirement_templates
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES requirement_templates(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS position INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS default_blocker requirement_blocker DEFAULT 'none';

-- Index for parent lookups
CREATE INDEX IF NOT EXISTS idx_requirement_templates_parent ON requirement_templates(parent_id);

-- ============================================================================
-- WAGHL SETUP HIERARCHY
-- ============================================================================

-- Remove old flat WAGHL Setup template
DELETE FROM requirement_templates WHERE name = 'WAGHL Setup';

-- Create hierarchical WAGHL Setup
DO $$
DECLARE
  waghl_id UUID;
  meta_id UUID;
  ghl_id UUID;
BEGIN
  -- Root: WAGHL Setup
  INSERT INTO requirement_templates (name, description, default_owner, default_blocker, category, position)
  VALUES (
    'WAGHL Setup',
    'Complete WhatsApp + GoHighLevel integration setup',
    'hexona',
    'absolute',
    'setup',
    0
  )
  RETURNING id INTO waghl_id;

  -- Child 1: Meta Business Access
  INSERT INTO requirement_templates (name, description, default_owner, default_blocker, category, parent_id, position)
  VALUES (
    'Meta Business Access',
    'Get admin access to client Meta Business Suite',
    'client',
    'absolute',
    'setup',
    waghl_id,
    0
  )
  RETURNING id INTO meta_id;

  -- Grandchildren under Meta Business Access
  INSERT INTO requirement_templates (name, description, default_owner, default_blocker, category, parent_id, position) VALUES
  ('Facebook Page Admin Access', 'Grant admin role on Facebook business page', 'client', 'absolute', 'setup', meta_id, 0),
  ('WhatsApp Business Number', 'Provide verified WhatsApp Business phone number', 'client', 'absolute', 'setup', meta_id, 1),
  ('Meta Business Verification', 'Complete Meta Business verification if not done', 'client', 'partial', 'setup', meta_id, 2);

  -- Child 2: GoHighLevel Integration
  INSERT INTO requirement_templates (name, description, default_owner, default_blocker, category, parent_id, position)
  VALUES (
    'GoHighLevel Integration',
    'Configure GHL subaccount and integrations',
    'hexona',
    'absolute',
    'setup',
    waghl_id,
    1
  )
  RETURNING id INTO ghl_id;

  -- Grandchildren under GoHighLevel Integration
  INSERT INTO requirement_templates (name, description, default_owner, default_blocker, category, parent_id, position) VALUES
  ('GHL Subaccount Setup', 'Create and configure client subaccount in GHL', 'hexona', 'absolute', 'setup', ghl_id, 0),
  ('Webhook Configuration', 'Set up webhooks for WhatsApp message routing', 'hexona', 'absolute', 'setup', ghl_id, 1),
  ('Phone Number Assignment', 'Assign phone number to GHL for messaging', 'hexona', 'absolute', 'setup', ghl_id, 2),
  ('Test Message Flow', 'Verify end-to-end message delivery', 'hexona', 'none', 'setup', ghl_id, 3);

  -- Child 3: Testing & Handoff
  INSERT INTO requirement_templates (name, description, default_owner, default_blocker, category, parent_id, position)
  VALUES (
    'Testing & Handoff',
    'Final testing and client training',
    'hexona',
    'none',
    'setup',
    waghl_id,
    2
  );
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this to verify the hierarchy:
-- SELECT t1.name as parent, t2.name as child, t3.name as grandchild
-- FROM requirement_templates t1
-- LEFT JOIN requirement_templates t2 ON t2.parent_id = t1.id
-- LEFT JOIN requirement_templates t3 ON t3.parent_id = t2.id
-- WHERE t1.name = 'WAGHL Setup';
