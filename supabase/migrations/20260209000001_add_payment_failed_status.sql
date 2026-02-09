-- Migration: Add 'payment_failed' to invoice status constraint
-- Reason: Stripe webhook needs to record payment failures

ALTER TABLE invoices DROP CONSTRAINT valid_invoice_status;
ALTER TABLE invoices ADD CONSTRAINT valid_invoice_status
  CHECK (status IN ('draft', 'sent', 'paid', 'void', 'overdue', 'payment_failed'));
