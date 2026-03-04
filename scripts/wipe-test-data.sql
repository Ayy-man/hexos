-- ============================================
-- WIPE ALL TEST DATA
-- ============================================
-- Run this in Supabase SQL Editor to reset the database
-- Preserves: profiles, organizations, blueprints, templates, payment_sources
-- Deletes: projects, inquiries, deliverables, and all related data
-- ============================================

-- Disable triggers temporarily for faster deletion
SET session_replication_role = 'replica';

-- ============================================
-- 1. Delete child tables first (deepest dependencies)
-- ============================================

-- Time tracking
TRUNCATE TABLE time_entries CASCADE;
TRUNCATE TABLE active_timers CASCADE;

-- Hill chart history
TRUNCATE TABLE deliverable_position_history CASCADE;

-- Deliverable related
TRUNCATE TABLE deliverable_notes CASCADE;
TRUNCATE TABLE dev_task_queue CASCADE;

-- Blockers
TRUNCATE TABLE blocker_comments CASCADE;
TRUNCATE TABLE blockers CASCADE;

-- Messages & Conversations
TRUNCATE TABLE message_reactions CASCADE;
TRUNCATE TABLE message_mentions CASCADE;
TRUNCATE TABLE message_attachments CASCADE;
TRUNCATE TABLE messages CASCADE;
TRUNCATE TABLE conversation_read_status CASCADE;
TRUNCATE TABLE direct_conversation_participants CASCADE;
TRUNCATE TABLE conversations CASCADE;

-- Requirements
TRUNCATE TABLE requirement_attachments CASCADE;
TRUNCATE TABLE requirement_dependencies CASCADE;
TRUNCATE TABLE onboarding_requirements CASCADE;
TRUNCATE TABLE project_requirements CASCADE;

-- Project files
TRUNCATE TABLE project_files CASCADE;

-- Scope monitoring
TRUNCATE TABLE scope_changes CASCADE;

-- Notifications
TRUNCATE TABLE notifications CASCADE;

-- Activity logs
TRUNCATE TABLE activity_log CASCADE;
-- Keep activity_logs for audit trail, or uncomment to delete:
-- TRUNCATE TABLE activity_logs CASCADE;

-- ============================================
-- 2. Delete proposal/inquiry related
-- ============================================

-- Proposal deliverables
TRUNCATE TABLE proposal_deliverable_comments CASCADE;
TRUNCATE TABLE proposal_deliverable_history CASCADE;
TRUNCATE TABLE proposal_deliverables CASCADE;

-- ============================================
-- 3. Delete project related
-- ============================================

-- Dev opportunities & applications
TRUNCATE TABLE dev_opportunity_preferences CASCADE;
TRUNCATE TABLE project_applications CASCADE;
TRUNCATE TABLE project_invitations CASCADE;
TRUNCATE TABLE project_opportunities CASCADE;

-- Financials
TRUNCATE TABLE payouts CASCADE;
TRUNCATE TABLE expenses CASCADE;
TRUNCATE TABLE invoices CASCADE;
TRUNCATE TABLE payment_milestones CASCADE;

-- Deliverables (must be before projects due to FK)
TRUNCATE TABLE deliverables CASCADE;

-- ============================================
-- 4. Delete main entities
-- ============================================

-- Projects (set source_inquiry_id to null first to break circular ref)
UPDATE projects SET source_inquiry_id = NULL;
UPDATE inquiries SET converted_to_project_id = NULL;

-- Now delete
TRUNCATE TABLE projects CASCADE;
TRUNCATE TABLE inquiries CASCADE;

-- ============================================
-- 5. Clean up Pulse data (optional - comment out to keep)
-- ============================================
TRUNCATE TABLE pulse_events CASCADE;
TRUNCATE TABLE pulse_daily_tasks CASCADE;
TRUNCATE TABLE pulse_actions CASCADE;
TRUNCATE TABLE pulse_target_owners CASCADE;
TRUNCATE TABLE pulse_targets CASCADE;
TRUNCATE TABLE pulse_goals CASCADE;
-- Keep pulse_settings per user

-- ============================================
-- 6. Clean up weekly reviews & suggestions
-- ============================================
TRUNCATE TABLE weekly_reviews CASCADE;
TRUNCATE TABLE suggestions CASCADE;

-- ============================================
-- Re-enable triggers
-- ============================================
SET session_replication_role = 'origin';

-- ============================================
-- Verification
-- ============================================
SELECT 'Projects' as table_name, count(*) as count FROM projects
UNION ALL SELECT 'Inquiries', count(*) FROM inquiries
UNION ALL SELECT 'Deliverables', count(*) FROM deliverables
UNION ALL SELECT 'Proposal Deliverables', count(*) FROM proposal_deliverables
UNION ALL SELECT 'Conversations', count(*) FROM conversations
UNION ALL SELECT 'Messages', count(*) FROM messages
UNION ALL SELECT 'Activity Log', count(*) FROM activity_log;

-- ============================================
-- Summary
-- ============================================
-- Tables PRESERVED:
--   - profiles (users)
--   - organizations, organization_members
--   - blueprints, case_studies
--   - requirement_templates, skill_templates
--   - payment_sources, payout_recipients
--   - dev_availability, dev_skills
--   - push_subscriptions
--   - invitations
--
-- Tables DELETED:
--   - All projects and related data
--   - All inquiries and proposals
--   - All deliverables
--   - All conversations and messages
--   - All time entries
--   - All pulse data (goals, targets, tasks)
-- ============================================
