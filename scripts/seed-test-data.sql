-- ============================================
-- SEED TEST DATA FOR HILL CHART TESTING
-- ============================================
-- Run this AFTER wipe-test-data.sql
-- Creates project with hierarchical deliverables
-- ============================================

-- Get the first admin user for ownership
DO $$
DECLARE
  v_admin_id UUID;
  v_dfy_id UUID;
  v_project_id UUID;
  v_parent_1 UUID;
  v_parent_2 UUID;
  v_parent_3 UUID;
BEGIN
  -- Get admin user
  SELECT id INTO v_admin_id FROM profiles WHERE role = 'admin' LIMIT 1;

  -- Get DFY partner (if exists)
  SELECT id INTO v_dfy_id FROM profiles WHERE role = 'dfy' LIMIT 1;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'No admin user found. Please ensure at least one admin exists.';
  END IF;

  -- ============================================
  -- 1. Create a test project
  -- ============================================
  INSERT INTO projects (
    id,
    project_name,
    client_name,
    client_email,
    client_business,
    status,
    project_type,
    operational_mode,
    price_dfy,
    payment_structure,
    dfy_partner_id,
    created_at
  ) VALUES (
    gen_random_uuid(),
    'Hill Chart Test Project',
    'Test Client',
    'test@example.com',
    'Test Business LLC',
    'in_progress',
    'full_custom',
    'hexona_devs_dfy',
    5000,
    '50_50',
    v_dfy_id,
    NOW()
  ) RETURNING id INTO v_project_id;

  RAISE NOTICE 'Created project: %', v_project_id;

  -- ============================================
  -- 2. Create Parent Deliverables
  -- ============================================

  -- Parent 1: Design Phase
  INSERT INTO deliverables (
    id,
    project_id,
    title,
    description,
    status,
    estimated_hours,
    due_date,
    sort_order,
    parent_id,
    hill_position,
    hill_color
  ) VALUES (
    gen_random_uuid(),
    v_project_id,
    'Design Phase',
    'Complete UI/UX design for all screens',
    'in_progress',
    20,
    NOW() + INTERVAL '14 days',
    1,
    NULL,
    0, -- Will be computed from children
    '#3B82F6'
  ) RETURNING id INTO v_parent_1;

  -- Parent 2: Development Phase
  INSERT INTO deliverables (
    id,
    project_id,
    title,
    description,
    status,
    estimated_hours,
    due_date,
    sort_order,
    parent_id,
    hill_position,
    hill_color
  ) VALUES (
    gen_random_uuid(),
    v_project_id,
    'Development Phase',
    'Build all frontend and backend features',
    'pending',
    40,
    NOW() + INTERVAL '30 days',
    2,
    NULL,
    0,
    '#10B981'
  ) RETURNING id INTO v_parent_2;

  -- Parent 3: Testing & QA
  INSERT INTO deliverables (
    id,
    project_id,
    title,
    description,
    status,
    estimated_hours,
    due_date,
    sort_order,
    parent_id,
    hill_position,
    hill_color
  ) VALUES (
    gen_random_uuid(),
    v_project_id,
    'Testing & QA',
    'Complete testing and bug fixes',
    'pending',
    15,
    NOW() + INTERVAL '45 days',
    3,
    NULL,
    0,
    '#F59E0B'
  ) RETURNING id INTO v_parent_3;

  RAISE NOTICE 'Created 3 parent deliverables';

  -- ============================================
  -- 3. Create Sub-Deliverables for Parent 1 (Design)
  -- ============================================

  -- Sub 1.1: Wireframes
  INSERT INTO deliverables (
    project_id, title, description, status, estimated_hours, due_date,
    sort_order, parent_id, hill_position, hill_color
  ) VALUES (
    v_project_id,
    'Wireframes',
    'Create low-fidelity wireframes for all pages',
    'in_progress',
    5,
    NOW() + INTERVAL '5 days',
    1,
    v_parent_1,
    65,
    '#60A5FA'
  );

  -- Sub 1.2: High-Fidelity Mockups
  INSERT INTO deliverables (
    project_id, title, description, status, estimated_hours, due_date,
    sort_order, parent_id, hill_position, hill_color
  ) VALUES (
    v_project_id,
    'High-Fidelity Mockups',
    'Create polished designs in Figma',
    'in_progress',
    10,
    NOW() + INTERVAL '10 days',
    2,
    v_parent_1,
    35,
    '#93C5FD'
  );

  -- Sub 1.3: Design System
  INSERT INTO deliverables (
    project_id, title, description, status, estimated_hours, due_date,
    sort_order, parent_id, hill_position, hill_color
  ) VALUES (
    v_project_id,
    'Design System',
    'Document colors, typography, and components',
    'pending',
    5,
    NOW() + INTERVAL '12 days',
    3,
    v_parent_1,
    15,
    '#BFDBFE'
  );

  RAISE NOTICE 'Created 3 sub-deliverables for Design Phase';

  -- ============================================
  -- 4. Create Sub-Deliverables for Parent 2 (Development)
  -- ============================================

  -- Sub 2.1: Authentication
  INSERT INTO deliverables (
    project_id, title, description, status, estimated_hours, due_date,
    sort_order, parent_id, hill_position, hill_color
  ) VALUES (
    v_project_id,
    'Authentication System',
    'Implement login, signup, and password reset',
    'pending',
    8,
    NOW() + INTERVAL '18 days',
    1,
    v_parent_2,
    10,
    '#34D399'
  );

  -- Sub 2.2: Dashboard
  INSERT INTO deliverables (
    project_id, title, description, status, estimated_hours, due_date,
    sort_order, parent_id, hill_position, hill_color
  ) VALUES (
    v_project_id,
    'Dashboard',
    'Build main dashboard with widgets',
    'pending',
    15,
    NOW() + INTERVAL '25 days',
    2,
    v_parent_2,
    5,
    '#6EE7B7'
  );

  -- Sub 2.3: API Integration
  INSERT INTO deliverables (
    project_id, title, description, status, estimated_hours, due_date,
    sort_order, parent_id, hill_position, hill_color
  ) VALUES (
    v_project_id,
    'API Integration',
    'Connect to external services',
    'pending',
    10,
    NOW() + INTERVAL '28 days',
    3,
    v_parent_2,
    0,
    '#A7F3D0'
  );

  -- Sub 2.4: Data Export
  INSERT INTO deliverables (
    project_id, title, description, status, estimated_hours, due_date,
    sort_order, parent_id, hill_position, hill_color
  ) VALUES (
    v_project_id,
    'Data Export',
    'CSV and PDF export functionality',
    'pending',
    7,
    NOW() + INTERVAL '30 days',
    4,
    v_parent_2,
    0,
    '#D1FAE5'
  );

  RAISE NOTICE 'Created 4 sub-deliverables for Development Phase';

  -- ============================================
  -- 5. Create Sub-Deliverables for Parent 3 (Testing)
  -- ============================================

  -- Sub 3.1: Unit Tests
  INSERT INTO deliverables (
    project_id, title, description, status, estimated_hours, due_date,
    sort_order, parent_id, hill_position, hill_color
  ) VALUES (
    v_project_id,
    'Unit Tests',
    'Write tests for core functions',
    'pending',
    5,
    NOW() + INTERVAL '35 days',
    1,
    v_parent_3,
    0,
    '#FBBF24'
  );

  -- Sub 3.2: Integration Tests
  INSERT INTO deliverables (
    project_id, title, description, status, estimated_hours, due_date,
    sort_order, parent_id, hill_position, hill_color
  ) VALUES (
    v_project_id,
    'Integration Tests',
    'Test API endpoints and flows',
    'pending',
    5,
    NOW() + INTERVAL '40 days',
    2,
    v_parent_3,
    0,
    '#FCD34D'
  );

  -- Sub 3.3: UAT
  INSERT INTO deliverables (
    project_id, title, description, status, estimated_hours, due_date,
    sort_order, parent_id, hill_position, hill_color
  ) VALUES (
    v_project_id,
    'User Acceptance Testing',
    'Client testing and feedback',
    'pending',
    5,
    NOW() + INTERVAL '45 days',
    3,
    v_parent_3,
    0,
    '#FDE68A'
  );

  RAISE NOTICE 'Created 3 sub-deliverables for Testing & QA';

  -- ============================================
  -- 6. Add Position History for sparkline testing
  -- ============================================

  -- Add history entries for the wireframes deliverable (shows progress over time)
  INSERT INTO deliverable_position_history (deliverable_id, position, note, created_at, created_by)
  SELECT
    d.id,
    pos.position,
    pos.note,
    pos.created_at,
    v_admin_id
  FROM deliverables d
  CROSS JOIN (
    VALUES
      (10, 'Started initial research', NOW() - INTERVAL '7 days'),
      (25, 'Completed competitor analysis', NOW() - INTERVAL '5 days'),
      (40, 'First wireframe drafts done', NOW() - INTERVAL '3 days'),
      (55, 'Feedback incorporated', NOW() - INTERVAL '1 day'),
      (65, 'Almost ready for review', NOW())
  ) AS pos(position, note, created_at)
  WHERE d.title = 'Wireframes' AND d.project_id = v_project_id;

  -- Add history for high-fidelity mockups
  INSERT INTO deliverable_position_history (deliverable_id, position, note, created_at, created_by)
  SELECT
    d.id,
    pos.position,
    pos.note,
    pos.created_at,
    v_admin_id
  FROM deliverables d
  CROSS JOIN (
    VALUES
      (5, 'Started design exploration', NOW() - INTERVAL '4 days'),
      (15, 'Color palette selected', NOW() - INTERVAL '2 days'),
      (35, 'First screens designed', NOW())
  ) AS pos(position, note, created_at)
  WHERE d.title = 'High-Fidelity Mockups' AND d.project_id = v_project_id;

  RAISE NOTICE 'Added position history for sparkline testing';

  -- ============================================
  -- Summary
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'TEST DATA CREATED SUCCESSFULLY';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Project: Hill Chart Test Project';
  RAISE NOTICE 'Project ID: %', v_project_id;
  RAISE NOTICE '';
  RAISE NOTICE 'Structure:';
  RAISE NOTICE '  Design Phase (parent)';
  RAISE NOTICE '    ├── Wireframes (65%%)';
  RAISE NOTICE '    ├── High-Fidelity Mockups (35%%)';
  RAISE NOTICE '    └── Design System (15%%)';
  RAISE NOTICE '  Development Phase (parent)';
  RAISE NOTICE '    ├── Authentication System (10%%)';
  RAISE NOTICE '    ├── Dashboard (5%%)';
  RAISE NOTICE '    ├── API Integration (0%%)';
  RAISE NOTICE '    └── Data Export (0%%)';
  RAISE NOTICE '  Testing & QA (parent)';
  RAISE NOTICE '    ├── Unit Tests (0%%)';
  RAISE NOTICE '    ├── Integration Tests (0%%)';
  RAISE NOTICE '    └── User Acceptance Testing (0%%)';
  RAISE NOTICE '';
  RAISE NOTICE 'Position History: Added for Wireframes and Mockups';
  RAISE NOTICE '============================================';

END $$;

-- Verification query
SELECT
  p.title as parent,
  COALESCE(c.title, '-') as child,
  CASE WHEN c.id IS NOT NULL THEN c.hill_position ELSE NULL END as position,
  CASE WHEN c.id IS NOT NULL THEN c.hill_color ELSE p.hill_color END as color
FROM deliverables p
LEFT JOIN deliverables c ON c.parent_id = p.id
WHERE p.parent_id IS NULL
ORDER BY p.sort_order, c.sort_order;
