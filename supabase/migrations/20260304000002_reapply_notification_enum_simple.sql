-- Re-apply notification enum values using simpler syntax (no DO blocks)
-- PostgreSQL 12+ supports ADD VALUE IF NOT EXISTS natively
-- This avoids potential issues with ALTER TYPE inside DO blocks

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'stage_changed';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'invoice_sent';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'invoice_paid';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'invoice_payment_failed';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'scope_change_flagged';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'scope_change_approved';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'scope_change_rejected';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'proposal_ready';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'assigned';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'requirement_unblocked';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'testing_ready_dev';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'testing_ready_admin_int';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'testing_ready_client';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'testing_passed';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'testing_failed';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'testing_escalated';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'suggestion_reply';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'suggestion_status_change';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'meeting_ready';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'retainer_check_in_due';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'retainer_check_in_overdue';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'retainer_task_assigned';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'retainer_health_warning';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'project_completed';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'project_moved_to_retainer';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'inquiry_created';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'proposal_sent';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'inquiry_won';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'inquiry_lost';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'escalation_admin';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'project_created';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'deliverable_status_change';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'deliverables_confirmed';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'send_for_signoff';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'signed_off';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'check_in_submitted';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'blocker_raised';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'meeting_scheduled';
