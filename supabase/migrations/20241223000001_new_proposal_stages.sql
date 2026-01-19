-- New Proposal Stages Migration - Part 1
-- Migration: 20241223000001_new_proposal_stages.sql
-- Adds new enum values to proposal_stage type
-- Note: Data migration happens in a separate file because PostgreSQL requires
-- enum values to be committed before they can be used in UPDATE statements

-- Add new enum values (PostgreSQL allows adding but not removing enum values)
ALTER TYPE proposal_stage ADD VALUE IF NOT EXISTS 'unopened';
ALTER TYPE proposal_stage ADD VALUE IF NOT EXISTS 'admin_reviewed';
ALTER TYPE proposal_stage ADD VALUE IF NOT EXISTS 'in_queue';
ALTER TYPE proposal_stage ADD VALUE IF NOT EXISTS 'working';
ALTER TYPE proposal_stage ADD VALUE IF NOT EXISTS 'final_review';
ALTER TYPE proposal_stage ADD VALUE IF NOT EXISTS 'ready';
