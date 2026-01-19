-- Advanced Requirements System
-- Add assignment and dependency features to requirements

-- Add assignment columns to project_requirements
ALTER TABLE project_requirements
  ADD COLUMN assigned_role TEXT DEFAULT 'admin' CHECK (assigned_role IN ('admin', 'client')),
  ADD COLUMN assigned_to UUID REFERENCES profiles(id);

-- Dependencies junction table (blocker/prerequisite relationships)
CREATE TABLE public.requirement_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID NOT NULL REFERENCES project_requirements(id) ON DELETE CASCADE,
  depends_on_id UUID NOT NULL REFERENCES project_requirements(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent self-references and duplicates
  CONSTRAINT no_self_dependency CHECK (requirement_id != depends_on_id),
  CONSTRAINT unique_dependency UNIQUE (requirement_id, depends_on_id)
);

-- Indexes for efficient querying
CREATE INDEX idx_req_deps_requirement ON requirement_dependencies(requirement_id);
CREATE INDEX idx_req_deps_depends_on ON requirement_dependencies(depends_on_id);
CREATE INDEX idx_project_requirements_role ON project_requirements(assigned_role);
CREATE INDEX idx_project_requirements_assigned_to ON project_requirements(assigned_to);

-- Enable realtime for requirements and dependencies
ALTER PUBLICATION supabase_realtime ADD TABLE project_requirements;
ALTER PUBLICATION supabase_realtime ADD TABLE requirement_dependencies;

-- Comments
COMMENT ON COLUMN project_requirements.assigned_role IS 'Who should complete this: admin (internal team) or client';
COMMENT ON COLUMN project_requirements.assigned_to IS 'Specific user assigned (optional, for notifications)';
COMMENT ON TABLE requirement_dependencies IS 'Tracks blocker/prerequisite relationships between requirements';
