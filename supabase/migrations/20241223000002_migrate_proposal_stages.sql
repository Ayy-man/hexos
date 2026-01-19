-- New Proposal Stages Migration - Part 2: Data Migration
-- Migration: 20241223000002_migrate_proposal_stages.sql
-- Migrates existing data from old stages to new stages
-- Old: pending, proposal_sent, proposal_verify, on_hold, agreed
-- New: unopened, admin_reviewed, in_queue, working, on_hold, final_review, ready

-- Migrate existing data to new stages
UPDATE inquiries SET proposal_stage = 'unopened' WHERE proposal_stage = 'pending';
UPDATE inquiries SET proposal_stage = 'ready' WHERE proposal_stage = 'agreed';
UPDATE inquiries SET proposal_stage = 'in_queue' WHERE proposal_stage = 'proposal_sent';
UPDATE inquiries SET proposal_stage = 'working' WHERE proposal_stage = 'proposal_verify';
-- on_hold stays the same

-- Update default for new inquiries
ALTER TABLE inquiries ALTER COLUMN proposal_stage SET DEFAULT 'unopened';

-- Update stage_history to reflect new stage names
-- This uses a DO block to iterate and update the JSONB array
DO $$
DECLARE
  r RECORD;
  new_history JSONB;
  entry JSONB;
  new_from TEXT;
  new_to TEXT;
BEGIN
  FOR r IN SELECT id, stage_history FROM inquiries WHERE jsonb_array_length(COALESCE(stage_history, '[]'::jsonb)) > 0 LOOP
    new_history := '[]'::jsonb;

    FOR entry IN SELECT * FROM jsonb_array_elements(r.stage_history) LOOP
      -- Map old stage names to new ones
      new_from := CASE entry->>'from'
        WHEN 'pending' THEN 'unopened'
        WHEN 'agreed' THEN 'ready'
        WHEN 'proposal_sent' THEN 'in_queue'
        WHEN 'proposal_verify' THEN 'working'
        ELSE entry->>'from'
      END;

      new_to := CASE entry->>'to'
        WHEN 'pending' THEN 'unopened'
        WHEN 'agreed' THEN 'ready'
        WHEN 'proposal_sent' THEN 'in_queue'
        WHEN 'proposal_verify' THEN 'working'
        ELSE entry->>'to'
      END;

      -- Build the new entry with updated stage names
      entry := jsonb_set(entry, '{from}', to_jsonb(new_from));
      entry := jsonb_set(entry, '{to}', to_jsonb(new_to));

      new_history := new_history || entry;
    END LOOP;

    UPDATE inquiries SET stage_history = new_history WHERE id = r.id;
  END LOOP;
END $$;
