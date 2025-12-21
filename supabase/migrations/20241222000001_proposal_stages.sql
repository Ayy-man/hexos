-- Enhanced Proposal Flow: New stages, priority, due dates, and assignment
-- Migration: 20241222000001_proposal_stages.sql

-- New proposal stages matching ClickUp workflow
CREATE TYPE proposal_stage AS ENUM (
  'pending',         -- Newly submitted, not yet reviewed
  'proposal_sent',   -- Proposal drafted and sent to prospect
  'proposal_verify', -- Awaiting client verification/response
  'on_hold',         -- Paused (client request, timing, etc.)
  'agreed'           -- Deal agreed, ready to convert to project
);

-- Add proposal management columns to inquiries
ALTER TABLE inquiries
ADD COLUMN proposal_stage proposal_stage DEFAULT 'pending',
ADD COLUMN stage_entered_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN stage_history JSONB DEFAULT '[]'::jsonb,
ADD COLUMN priority TEXT DEFAULT 'normal',
ADD COLUMN due_date DATE,
ADD COLUMN assigned_to UUID REFERENCES profiles(id),
ADD COLUMN estimated_value DECIMAL(10,2);

-- Add constraint for priority values
ALTER TABLE inquiries
ADD CONSTRAINT inquiries_priority_check
CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

-- Index for stage queries and filtering
CREATE INDEX idx_inquiries_proposal_stage ON inquiries(proposal_stage);
CREATE INDEX idx_inquiries_priority ON inquiries(priority);
CREATE INDEX idx_inquiries_due_date ON inquiries(due_date);
CREATE INDEX idx_inquiries_assigned_to ON inquiries(assigned_to);

-- Public proposal link columns (for P1: client view)
ALTER TABLE inquiries
ADD COLUMN public_token UUID DEFAULT gen_random_uuid(),
ADD COLUMN client_viewed_at TIMESTAMPTZ,
ADD COLUMN client_view_count INT DEFAULT 0;

CREATE UNIQUE INDEX idx_inquiries_public_token ON inquiries(public_token);

-- Comment to explain stage_history structure:
-- Each entry: { "from": "pending", "to": "proposal_sent", "changed_by": "uuid", "changed_at": "timestamp", "notes": "optional" }
