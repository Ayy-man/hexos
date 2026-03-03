-- Onboarding Form System Migration
-- Adds onboarding_categories, onboarding_questions, onboarding_answers tables
-- Extends onboarding_requirements with optional category_id

-- ============================================================================
-- TABLES
-- ============================================================================

-- Onboarding Categories (sections/steps in the onboarding form)
CREATE TABLE public.onboarding_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Onboarding Questions (individual fields within a category)
CREATE TABLE public.onboarding_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.onboarding_categories(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  question_type text NOT NULL CHECK (question_type IN ('text', 'textarea', 'select', 'multi_select', 'boolean')),
  options jsonb,
  is_required boolean NOT NULL DEFAULT false,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Onboarding Answers (client/DFY responses to questions, one per project per question)
CREATE TABLE public.onboarding_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.onboarding_questions(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  answered_by uuid REFERENCES public.profiles(id),
  value jsonb,
  answered_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT onboarding_answers_question_project_unique UNIQUE (question_id, project_id)
);

-- ============================================================================
-- EXTEND ONBOARDING REQUIREMENTS
-- ============================================================================

-- Add optional link from a requirement to a category
ALTER TABLE public.onboarding_requirements
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.onboarding_categories(id) ON DELETE SET NULL;

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_onboarding_categories_project ON public.onboarding_categories(project_id);
CREATE INDEX idx_onboarding_questions_project ON public.onboarding_questions(project_id);
CREATE INDEX idx_onboarding_questions_category ON public.onboarding_questions(category_id);
CREATE INDEX idx_onboarding_answers_project ON public.onboarding_answers(project_id);
CREATE INDEX idx_onboarding_answers_question ON public.onboarding_answers(question_id);
CREATE INDEX idx_onboarding_requirements_category ON public.onboarding_requirements(category_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at on onboarding_categories
CREATE TRIGGER update_onboarding_categories_updated_at
  BEFORE UPDATE ON public.onboarding_categories
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Auto-update updated_at on onboarding_answers
CREATE TRIGGER update_onboarding_answers_updated_at
  BEFORE UPDATE ON public.onboarding_answers
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE public.onboarding_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_answers ENABLE ROW LEVEL SECURITY;

-- ONBOARDING_CATEGORIES POLICIES

-- Admin/Internal have full access
CREATE POLICY "onboarding_categories_admin_all" ON public.onboarding_categories
  FOR ALL USING (auth.uid() IS NOT NULL AND get_user_role() IN ('admin', 'internal', 'dev'));

-- Project members can view categories
CREATE POLICY "onboarding_categories_select_via_project" ON public.onboarding_categories
  FOR SELECT USING (auth.uid() IS NOT NULL AND can_access_project(project_id));

-- ONBOARDING_QUESTIONS POLICIES

-- Admin/Internal have full access
CREATE POLICY "onboarding_questions_admin_all" ON public.onboarding_questions
  FOR ALL USING (auth.uid() IS NOT NULL AND get_user_role() IN ('admin', 'internal', 'dev'));

-- Project members can view questions
CREATE POLICY "onboarding_questions_select_via_project" ON public.onboarding_questions
  FOR SELECT USING (auth.uid() IS NOT NULL AND can_access_project(project_id));

-- ONBOARDING_ANSWERS POLICIES

-- Admin/Internal have full access
CREATE POLICY "onboarding_answers_admin_all" ON public.onboarding_answers
  FOR ALL USING (auth.uid() IS NOT NULL AND get_user_role() IN ('admin', 'internal', 'dev'));

-- Project members can view answers
CREATE POLICY "onboarding_answers_select_via_project" ON public.onboarding_answers
  FOR SELECT USING (auth.uid() IS NOT NULL AND can_access_project(project_id));

-- DFY can insert answers for their projects
CREATE POLICY "onboarding_answers_dfy_insert" ON public.onboarding_answers
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND get_user_role() = 'dfy'
    AND can_access_project(project_id)
  );

-- DFY can update answers for their projects
CREATE POLICY "onboarding_answers_dfy_update" ON public.onboarding_answers
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND get_user_role() = 'dfy'
    AND can_access_project(project_id)
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND get_user_role() = 'dfy'
    AND can_access_project(project_id)
  );
