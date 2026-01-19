-- Add inline_discussions column for Plate.js inline comment persistence
-- Migration: 20241221000010_inline_discussions.sql

-- Store inline discussions (the actual comment content for highlighted text)
-- This is separate from document_content which only stores the text marks
ALTER TABLE inquiries
ADD COLUMN inline_discussions JSONB DEFAULT '[]'::jsonb;
