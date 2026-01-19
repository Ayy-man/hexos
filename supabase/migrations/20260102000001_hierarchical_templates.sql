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
-- GHL SETUP HIERARCHY (WAGHL Flow)
-- ============================================================================

-- Remove old templates
DELETE FROM requirement_templates WHERE name IN ('WAGHL Setup', 'GHL Setup');

-- Create GHL Setup hierarchy
-- Flow: GHL Setup (Hexona) -> Add Billing (DFY) -> Add WAGHL (Hexona) -> Add WAGHL Billing (Client)
DO $$
DECLARE
  ghl_id UUID;
BEGIN
  -- Root: GHL Setup (Hexona)
  INSERT INTO requirement_templates (name, description, default_owner, default_blocker, category, position)
  VALUES (
    'GHL Setup',
    'Complete GoHighLevel + WhatsApp integration setup',
    'hexona',
    'absolute',
    'setup',
    0
  )
  RETURNING id INTO ghl_id;

  -- Child 1: Add Billing to Hexona (DFY)
  INSERT INTO requirement_templates (name, description, default_owner, default_blocker, category, parent_id, position)
  VALUES (
    'Add Billing to Hexona',
    'DFY partner adds billing/payment method to Hexona account',
    'dfy',
    'absolute',
    'setup',
    ghl_id,
    0
  );

  -- Child 2: Add WAGHL (Hexona)
  INSERT INTO requirement_templates (name, description, default_owner, default_blocker, category, parent_id, position)
  VALUES (
    'Add WAGHL',
    'Hexona configures WhatsApp + GoHighLevel integration',
    'hexona',
    'absolute',
    'setup',
    ghl_id,
    1
  );

  -- Child 3: Add WAGHL Billing (Client)
  INSERT INTO requirement_templates (name, description, default_owner, default_blocker, category, parent_id, position)
  VALUES (
    'Add WAGHL Billing',
    'Client sets up billing for WAGHL service',
    'client',
    'absolute',
    'setup',
    ghl_id,
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
