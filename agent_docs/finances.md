# Finances System

Developer payouts, invoices, and expense tracking.

## Overview

The finances system handles:
1. **Payouts** - Developer payment requests and processing
2. **Invoices** - Client billing via Stripe (Phase 7)
3. **Expenses** - Auto-created when payouts are marked as paid

## Payouts

### Database Table: `payouts`

```sql
payouts (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,

  -- Core fields
  recipient_id UUID,           -- FK to profiles (who gets paid)
  project_id UUID,             -- FK to projects (optional)
  type payout_type,            -- 'commission' | 'dev_payment' | 'contractor' | 'reimbursement'
  amount INT,                  -- Amount in CENTS
  description TEXT,

  -- Status workflow
  status payout_status,        -- See status enum below

  -- Submission (dev)
  submitted_by UUID,           -- FK to profiles
  submitted_at TIMESTAMPTZ,

  -- Invoice details
  contractor_invoice_url TEXT, -- Uploaded invoice file URL
  invoice_number TEXT,
  invoice_date DATE,

  -- Payment preference
  payment_preference TEXT,     -- 'wire_transfer' | 'emailed_invoice'

  -- Wire transfer details (if wire_transfer)
  wire_recipient_name TEXT,
  wire_swift_code TEXT,
  wire_account_number TEXT,
  wire_bank_name TEXT,
  wire_bank_address TEXT,
  wire_recipient_address TEXT,
  wire_recipient_country TEXT,

  -- Admin actions
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  rejection_reason TEXT,
  rejected_at TIMESTAMPTZ,
  rejected_by UUID,

  -- Payment completion
  paid_at TIMESTAMPTZ,
  paid_by UUID,
  payment_method TEXT,         -- 'bank_transfer' | 'paypal' | 'wise' | 'crypto' | 'other'
  payment_reference TEXT,
  expense_id UUID,             -- Auto-created expense
  notes TEXT
)
```

### Status Workflow

```
Dev submits    Admin reviews      Admin pays
    ↓              ↓                  ↓
[pending] → [approved] → [paid/completed]
    ↓              ↓
[rejected]    [rejected]
```

**All statuses:**
- `pending` - Submitted, awaiting admin review
- `approved` - Approved, awaiting payment
- `paid` - Payment sent
- `rejected` - Request denied (with reason)
- `invoice_required` - Need invoice upload
- `invoice_uploaded` - Invoice provided
- `revision_needed` - Changes requested
- `verified` - Invoice verified
- `processing` - Payment in progress
- `completed` - Fully complete
- `failed` - Payment failed

### Payment Preferences

1. **Wire Transfer** (`wire_transfer`)
   - Requires: invoice file upload
   - Requires: banking details (recipient name, SWIFT, IBAN, bank name, country)
   - Optional: bank address, recipient address

2. **Emailed Invoice** (`emailed_invoice`)
   - Dev will email invoice separately
   - Invoice file upload optional

## API Layer

### Files
- `lib/api/payouts.ts` - Server-side functions (admin client)
- `lib/api/payouts.shared.ts` - Types and helpers (client-safe)
- `lib/types/payouts.ts` - Additional client-safe exports
- `features/finances/actions/payoutActions.ts` - Server actions

### Key Functions

**Admin functions:**
```typescript
getPayouts(filters?)         // List all payouts
getPayout(id)                // Get single payout with details
approvePayout(id, userId)    // Approve pending payout
rejectPayout(id, reason, userId)  // Reject with reason
markPayoutPaid(id, payment, userId)  // Mark as paid + create expense
getPayoutMetrics()           // Dashboard stats
```

**Dev functions:**
```typescript
getMyPayouts(userId)         // List user's own payouts
submitPayout(input)          // Submit new payout request
```

### Server Actions

```typescript
// Admin
approvePayoutAction(id)
rejectPayoutAction(id, reason)
markPayoutPaidAction(id, method, reference, notes?)

// Dev
submitPayoutAction(formData)
getAssignedProjectsAction()
```

## File Uploads

Invoice files stored in Supabase Storage.

**Bucket:** `payout-invoices`
**Path:** `{user_id}/{timestamp}_{filename}`

**Accepted types:** PDF, JPG, PNG, WebP
**Max size:** 5MB

```typescript
// lib/api/payout-attachments.ts
uploadPayoutInvoice({ userId, file })
isValidInvoiceType(mimeType)
isValidInvoiceSize(bytes)
```

## UI Components

### Admin
- `/finances/payouts` - Payout management list
- `PayoutManagement.tsx` - Main list with filters, actions
- `PayoutCard.tsx` - Individual payout display
- `PayoutDetailsDrawer.tsx` - Side drawer with full details

### Dev
- `/dashboard/dev/payouts` - Dev's payout history
- `SubmitPayoutForm.tsx` - Submission form with file upload
- Payment preference toggle (wire vs emailed invoice)
- Bank details form (for wire transfer)

## Notifications

Payout events trigger notifications:
- `payout_submitted` → Admins notified
- `payout_approved` → Dev notified
- `payout_rejected` → Dev notified with reason
- `payout_paid` → Dev notified with payment method

## Integration with Expenses

When a payout is marked as paid:
1. Creates expense record in `expenses` table
2. Links expense back to payout via `expense_id`
3. Category set to `contractor`
4. Amount converted from cents to dollars

## Migrations

- `20260109000010_payouts_dev_workflow.sql` - Core payouts table
- `20260109000012_payouts_payment_preferences.sql` - Wire transfer fields

## Common Issues

### "Payout not found"
- Payout ID doesn't exist
- Check if payout was deleted
- Verify ID format is valid UUID

### Amount Display
- **Database:** Amount stored in CENTS (integer)
- **Display:** Convert to dollars: `amount / 100`
- **Input:** Convert to cents: `Math.round(parseFloat(input) * 100)`

### File Upload Fails
- Check file type (PDF, JPG, PNG, WebP only)
- Check file size (< 5MB)
- Verify Supabase Storage bucket exists and has correct RLS
