-- Retainer System Migration - Part 1
-- Add 'retainer' enum value (must be committed separately before use)
-- Phase 14, Plan 01

-- ============================================================================
-- EXTEND PROJECT_STATUS ENUM
-- ============================================================================

ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'retainer' BEFORE 'completed';
