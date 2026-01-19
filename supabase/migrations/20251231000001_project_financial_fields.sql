-- Project Financial Fields Migration
-- Adds comprehensive pricing structure, lifecycle dates, and retainer fields
-- to both projects and inquiries tables

-- ============================================================================
-- NEW ENUMS
-- ============================================================================

CREATE TYPE retainer_plan AS ENUM ('one_time', 'monthly', 'quarterly', 'annual');
CREATE TYPE software_payer AS ENUM ('hexona', 'client');

-- ============================================================================
-- PROJECTS TABLE CHANGES
-- ============================================================================

-- Rename existing columns for consistency
ALTER TABLE projects RENAME COLUMN quoted_price TO price_dfy;
ALTER TABLE projects RENAME COLUMN dev_cost TO price_dev;

-- Add new pricing column (what Hexona charges DFY partner)
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS price_hexona DECIMAL(10,2);

-- Add retainer fields
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS retainer_plan retainer_plan DEFAULT 'one_time',
  ADD COLUMN IF NOT EXISTS retainer_date DATE;

-- Add software payer field
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS software_payer software_payer DEFAULT 'client';

-- Add lifecycle date fields for tracking project timeline
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS date_inquiry TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS date_proposal_sent TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS date_closed TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS date_onboarding TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS date_delivered TIMESTAMPTZ;

-- Add column comments for documentation
COMMENT ON COLUMN projects.price_dfy IS 'What the client pays (DFY quoted price)';
COMMENT ON COLUMN projects.price_hexona IS 'What Hexona charges the DFY partner (fulfillment cost)';
COMMENT ON COLUMN projects.price_dev IS 'What Hexona pays the developer';
COMMENT ON COLUMN projects.retainer_plan IS 'Retainer billing cycle type';
COMMENT ON COLUMN projects.retainer_date IS 'Next retainer renewal date';
COMMENT ON COLUMN projects.software_payer IS 'Who pays for software/tool costs';
COMMENT ON COLUMN projects.date_inquiry IS 'When the initial inquiry was received';
COMMENT ON COLUMN projects.date_proposal_sent IS 'When proposal was sent to client';
COMMENT ON COLUMN projects.date_closed IS 'When the deal was closed/won';
COMMENT ON COLUMN projects.date_onboarding IS 'When client onboarding started';
COMMENT ON COLUMN projects.date_delivered IS 'When the project was delivered';

-- ============================================================================
-- INQUIRIES TABLE CHANGES
-- ============================================================================

-- Rename estimated_value to price_dfy for consistency
ALTER TABLE inquiries RENAME COLUMN estimated_value TO price_dfy;

-- Add other pricing fields
ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS price_hexona DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS price_dev DECIMAL(10,2);

-- Add early-stage date fields (inquiry and proposal stages only)
ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS date_inquiry TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS date_proposal_sent TIMESTAMPTZ;

-- Add column comments
COMMENT ON COLUMN inquiries.price_dfy IS 'What the client pays (estimated deal value)';
COMMENT ON COLUMN inquiries.price_hexona IS 'What Hexona charges the DFY partner';
COMMENT ON COLUMN inquiries.price_dev IS 'Estimated developer cost';
COMMENT ON COLUMN inquiries.date_inquiry IS 'When the inquiry was submitted';
COMMENT ON COLUMN inquiries.date_proposal_sent IS 'When proposal was sent';
