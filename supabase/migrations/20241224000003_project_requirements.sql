-- Phase 4.8: Deliverables Negotiation System
-- Migration 3: Create project_requirements table for onboarding checklists

CREATE TYPE requirement_status AS ENUM (
  'pending',       -- Not yet provided
  'in_progress',   -- Being worked on
  'completed',     -- Provided/completed
  'blocked'        -- Waiting on something
);

CREATE TABLE public.project_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  description TEXT,
  status requirement_status DEFAULT 'pending',

  -- Optional: link to file upload when requirement is a document
  file_id UUID REFERENCES project_files(id),

  -- Response/completion tracking
  response TEXT,  -- For questions: the answer provided
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES profiles(id),

  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_project_requirements_project ON project_requirements(project_id);
CREATE INDEX idx_project_requirements_status ON project_requirements(status);

-- Comments
COMMENT ON TABLE project_requirements IS 'Onboarding checklist items for project setup';
COMMENT ON COLUMN project_requirements.response IS 'Answer or response for question-type requirements';
