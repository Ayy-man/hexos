-- hexOS Seed Data
-- Test users for each role (requires matching auth.users entries)
-- NOTE: In production, users are created via Supabase Auth, which auto-creates profiles via trigger

-- Admin accounts (Hexona team)
INSERT INTO profiles (id, email, name, role) VALUES
  ('11111111-1111-1111-1111-111111111111', 'ayman@hexona.io', 'Ayman', 'admin'),
  ('22222222-2222-2222-2222-222222222222', 'hamza@hexona.io', 'Hamza', 'admin');

-- Test accounts for each role
INSERT INTO profiles (id, email, name, role) VALUES
  ('33333333-3333-3333-3333-333333333333', 'dev@test.hexos', 'Test Dev', 'dev'),
  ('44444444-4444-4444-4444-444444444444', 'dfy@test.hexos', 'Test DFY', 'dfy'),
  ('55555555-5555-5555-5555-555555555555', 'client@test.hexos', 'Test Client', 'client'),
  ('66666666-6666-6666-6666-666666666666', 'internal@test.hexos', 'Test Internal', 'internal');

-- Sample blueprint
INSERT INTO blueprints (id, name, description, estimated_hours, base_price, default_deliverables) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'CRM Dashboard', 'Customer relationship management dashboard with lead tracking, pipeline view, and analytics.', 40, 4000.00, '[
    {"title": "Database schema design", "estimated_hours": 4},
    {"title": "Authentication setup", "estimated_hours": 3},
    {"title": "Lead management CRUD", "estimated_hours": 8},
    {"title": "Pipeline Kanban view", "estimated_hours": 10},
    {"title": "Analytics dashboard", "estimated_hours": 8},
    {"title": "Email integration", "estimated_hours": 4},
    {"title": "Testing & QA", "estimated_hours": 3}
  ]'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Booking System', 'Appointment booking system with calendar, availability management, and notifications.', 35, 3500.00, '[
    {"title": "Database schema design", "estimated_hours": 3},
    {"title": "Calendar component", "estimated_hours": 8},
    {"title": "Availability management", "estimated_hours": 6},
    {"title": "Booking flow", "estimated_hours": 8},
    {"title": "Email notifications", "estimated_hours": 4},
    {"title": "Admin dashboard", "estimated_hours": 4},
    {"title": "Testing & QA", "estimated_hours": 2}
  ]');

-- Sample project (assigned to test dev, from test DFY, for test client)
INSERT INTO projects (
  id, project_name, client_name, client_email, client_business,
  status, project_type, operational_mode,
  dfy_partner_id, assigned_dev_id, client_id,
  matched_blueprint_id, blueprint_match_score,
  quoted_price, dev_cost, dfy_commission_pct, payment_structure,
  target_delivery_date
) VALUES (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'Acme CRM Dashboard',
  'John Smith',
  'john@acmecorp.com',
  'Acme Corp - B2B SaaS',
  'in_progress',
  'blueprint_custom',
  'hexona_devs_dfy',
  '44444444-4444-4444-4444-444444444444', -- Test DFY
  '33333333-3333-3333-3333-333333333333', -- Test Dev
  '55555555-5555-5555-5555-555555555555', -- Test Client
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', -- CRM Blueprint
  85,
  4500.00,
  2000.00,
  20.00,
  '50_50',
  CURRENT_DATE + INTERVAL '30 days'
);

-- Sample deliverables for the project
INSERT INTO deliverables (project_id, title, description, status, estimated_hours, start_date, due_date, sort_order) VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Database schema design', 'Design and implement Supabase schema for CRM', 'done', 4, CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE - INTERVAL '12 days', 1),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Authentication setup', 'Implement Supabase Auth with role-based access', 'done', 3, CURRENT_DATE - INTERVAL '12 days', CURRENT_DATE - INTERVAL '10 days', 2),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Lead management CRUD', 'Create, read, update, delete operations for leads', 'in_progress', 8, CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE - INTERVAL '5 days', 3),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Pipeline Kanban view', 'Drag-and-drop pipeline board for leads', 'pending', 10, CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '5 days', 4),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Analytics dashboard', 'Charts and metrics for sales performance', 'pending', 8, CURRENT_DATE + INTERVAL '5 days', CURRENT_DATE + INTERVAL '12 days', 5),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Custom: Slack integration', 'Client-requested Slack notifications (scope add)', 'pending', 6, CURRENT_DATE + INTERVAL '12 days', CURRENT_DATE + INTERVAL '15 days', 6),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Testing & QA', 'End-to-end testing and bug fixes', 'pending', 3, CURRENT_DATE + INTERVAL '15 days', CURRENT_DATE + INTERVAL '18 days', 7);

-- Sample payment milestones
INSERT INTO payment_milestones (project_id, label, amount, due_date, paid_at, sort_order) VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Deposit (50%)', 2250.00, CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE - INTERVAL '14 days', 1),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Final (50%)', 2250.00, CURRENT_DATE + INTERVAL '18 days', NULL, 2);

-- Sample scope change
INSERT INTO scope_changes (project_id, trigger_type, description, status, price_adjustment) VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'client_request', 'Client requested Slack integration for lead notifications. Added as new deliverable.', 'approved', 500.00);
