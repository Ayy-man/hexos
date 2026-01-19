# Payment Integration Plan: Stripe (Inbound) + Mercury (Outbound)

## Executive Summary

hexOS needs a complete payment system with two distinct flows:
- **Stripe** — Receive payments from clients (invoices, payment milestones)
- **Mercury** — Send payments out (DFY commissions, dev payouts, contractor payments)

---

## Database Schema ✅ CREATED

Migration: `supabase/migrations/20260108000010_payment_system.sql`

**Tables created:**
- `invoices` — Stripe inbound (client payments)
- `payout_recipients` — DFY partners, devs, contractors with bank info
- `payouts` — Mercury outbound with invoice upload workflow

---

## Current State Analysis

### What Exists ✅

| Component | Status | Notes |
|-----------|--------|-------|
| `payment_milestones` table | ✅ Complete | id, project_id, label, amount, due_date, paid_at, stripe_payment_id |
| `expenses` table | ✅ Complete | Full expense tracking with categories |
| `payment_sources` table | ✅ Complete | Credit card, debit, bank account types |
| Payment structures | ✅ Complete | 100_upfront, 50_50, 40_30_30, custom |
| Financial metrics API | ✅ Complete | Hero metrics, timeline, overdue tracking |
| Auto-milestone creation | ✅ Complete | DB function creates milestones from structure |
| `stripe_payment_id` field | ✅ Placeholder | Ready for Stripe integration |
| Project financial fields | ✅ Complete | price_dfy, price_hexona, price_dev, dfy_commission_pct |

### What's Missing ❌

| Component | Priority | Notes |
|-----------|----------|-------|
| Stripe API integration | P0 | No SDK, no keys, no webhooks |
| Invoice generation | P0 | No invoice table, no PDF generation |
| Client payment portal | P0 | Clients can't pay online |
| Mercury API integration | P1 | No payout system |
| DFY commission payouts | P1 | Calculation exists, no execution |
| Dev payout tracking | P1 | No dev payment records |
| Payment notifications | P2 | No emails for invoices/receipts |

---

## Money Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              INBOUND (STRIPE)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Client Invoice                                                            │
│        │                                                                    │
│        ▼                                                                    │
│   ┌─────────┐    ┌──────────────┐    ┌─────────────┐    ┌───────────────┐  │
│   │ Invoice │───▶│ Stripe       │───▶│ Webhook     │───▶│ Mark          │  │
│   │ Created │    │ Checkout     │    │ Handler     │    │ Milestone     │  │
│   └─────────┘    └──────────────┘    └─────────────┘    │ as Paid       │  │
│                                                          └───────────────┘  │
│                                                                 │           │
│                                                                 ▼           │
│                                                          ┌───────────────┐  │
│                                                          │ Update        │  │
│                                                          │ Project       │  │
│                                                          │ Status        │  │
│                                                          └───────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              OUTBOUND (MERCURY)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Project Completed (payment_paid status)                                   │
│        │                                                                    │
│        ▼                                                                    │
│   ┌─────────────────────────────────────────────────────────────────┐      │
│   │                    PAYOUT CALCULATION                            │      │
│   ├─────────────────────────────────────────────────────────────────┤      │
│   │  DFY Commission = price_dfy × dfy_commission_pct                │      │
│   │  Dev Payout     = price_dev (or dev_hours × rate)               │      │
│   │  Hexona Profit  = price_hexona - price_dev - expenses           │      │
│   └─────────────────────────────────────────────────────────────────┘      │
│        │                                                                    │
│        ▼                                                                    │
│   ┌─────────────┐    ┌──────────────┐    ┌─────────────────────────┐      │
│   │ Payout      │───▶│ Mercury API  │───▶│ Bank Transfer           │      │
│   │ Queue       │    │ ACH/Wire     │    │ (DFY/Dev/Contractor)    │      │
│   └─────────────┘    └──────────────┘    └─────────────────────────┘      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Stripe Integration (Inbound Payments)

### 1.1 Database Schema

```sql
-- Invoices table
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Links
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  milestone_id UUID REFERENCES payment_milestones(id) ON DELETE SET NULL,

  -- Invoice details
  invoice_number TEXT NOT NULL UNIQUE, -- INV-2026-0001
  status TEXT NOT NULL DEFAULT 'draft', -- draft, sent, paid, void, overdue

  -- Amounts
  subtotal NUMERIC(10,2) NOT NULL,
  tax_rate NUMERIC(5,4) DEFAULT 0,
  tax_amount NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,

  -- Dates
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,

  -- Stripe
  stripe_invoice_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_hosted_url TEXT,
  stripe_pdf_url TEXT,

  -- Recipient
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_company TEXT,

  -- Line items stored as JSONB
  line_items JSONB NOT NULL DEFAULT '[]',
  -- [{ description, quantity, unit_price, amount }]

  notes TEXT,

  CONSTRAINT valid_status CHECK (status IN ('draft', 'sent', 'paid', 'void', 'overdue'))
);

-- Payout recipients (DFY partners, devs, contractors)
CREATE TABLE payout_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Link to profile if internal user
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Recipient details
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  type TEXT NOT NULL, -- dfy_partner, developer, contractor

  -- Bank details (encrypted in production)
  bank_account_number TEXT, -- Last 4 shown, full encrypted
  bank_routing_number TEXT,
  bank_name TEXT,

  -- Mercury
  mercury_recipient_id TEXT,

  is_active BOOLEAN DEFAULT true,

  CONSTRAINT valid_type CHECK (type IN ('dfy_partner', 'developer', 'contractor'))
);

-- Payouts table
CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Links
  recipient_id UUID REFERENCES payout_recipients(id) ON DELETE RESTRICT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  -- Payout details
  type TEXT NOT NULL, -- commission, dev_payment, contractor, reimbursement
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, processing, completed, failed

  -- Dates
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Mercury
  mercury_payment_id TEXT,
  mercury_status TEXT,

  -- For commission calculations
  source_payment_id UUID REFERENCES payment_milestones(id),
  commission_rate NUMERIC(5,4),

  notes TEXT,

  CONSTRAINT valid_type CHECK (type IN ('commission', 'dev_payment', 'contractor', 'reimbursement')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'failed'))
);
```

### 1.2 Stripe Setup

**Dependencies:**
```bash
pnpm add stripe @stripe/stripe-js
```

**Environment Variables:**
```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Server Client (`lib/stripe/server.ts`):**
```typescript
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});
```

### 1.3 Invoice Flow

```
1. Admin creates invoice from milestone
   └─▶ POST /api/invoices { milestoneId, clientEmail }
       └─▶ Creates invoice record (status: draft)
       └─▶ Creates Stripe Invoice
       └─▶ Returns stripe_hosted_url

2. Admin sends invoice
   └─▶ PATCH /api/invoices/[id]/send
       └─▶ Sends via Stripe (or email with payment link)
       └─▶ Updates status to 'sent'

3. Client pays via Stripe Checkout
   └─▶ Stripe hosted page
   └─▶ Webhook: invoice.paid

4. Webhook handler
   └─▶ POST /api/webhooks/stripe
       └─▶ Updates invoice status to 'paid'
       └─▶ Marks payment_milestone as paid
       └─▶ Updates project status if all milestones paid
       └─▶ Creates notification for admin
       └─▶ Triggers payout queue (if applicable)
```

### 1.4 Key API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/invoices` | POST | Create invoice |
| `/api/invoices/[id]` | GET | Get invoice details |
| `/api/invoices/[id]/send` | POST | Send to client |
| `/api/invoices/[id]/void` | POST | Void invoice |
| `/api/webhooks/stripe` | POST | Stripe webhook handler |
| `/api/payments/checkout` | POST | Create checkout session |

---

## Phase 2: Mercury Integration (Outbound Payments)

### 2.1 Mercury API Setup

**Dependencies:**
```bash
# Mercury doesn't have an official SDK, use fetch
# Store API key securely
```

**Environment Variables:**
```env
MERCURY_API_KEY=...
MERCURY_ACCOUNT_ID=...
MERCURY_WEBHOOK_SECRET=...
```

**Mercury Client (`lib/mercury/server.ts`):**
```typescript
const MERCURY_BASE_URL = 'https://api.mercury.com/api/v1';

export async function mercuryRequest(
  endpoint: string,
  options: RequestInit = {}
) {
  const response = await fetch(`${MERCURY_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${process.env.MERCURY_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Mercury API error: ${response.statusText}`);
  }

  return response.json();
}

// Create ACH payment
export async function createACHPayment(params: {
  recipientId: string;
  amount: number; // in cents
  description: string;
  idempotencyKey: string;
}) {
  return mercuryRequest('/payments/ach', {
    method: 'POST',
    body: JSON.stringify({
      accountId: process.env.MERCURY_ACCOUNT_ID,
      recipientId: params.recipientId,
      amount: params.amount,
      paymentMethod: 'ach',
      idempotencyKey: params.idempotencyKey,
      memo: params.description,
    }),
  });
}
```

### 2.2 Payout Flow

```
1. Project reaches 'payment_paid' status
   └─▶ Trigger: Status change or manual action

2. Calculate payouts
   └─▶ DFY Commission: price_dfy × dfy_commission_pct
   └─▶ Dev Payment: price_dev (based on agreement)
   └─▶ Creates payout records (status: pending)

3. Admin reviews & approves
   └─▶ Dashboard shows pending payouts
   └─▶ Bulk approve or individual
   └─▶ Updates status to 'approved'

4. Execute payouts
   └─▶ Cron job or manual trigger
   └─▶ Calls Mercury API for each approved payout
   └─▶ Updates status to 'processing'

5. Mercury webhook confirms
   └─▶ POST /api/webhooks/mercury
   └─▶ Updates status to 'completed'
   └─▶ Notifies recipient
```

### 2.3 Commission Calculation Logic

```typescript
interface PayoutCalculation {
  dfyCommission: number;
  devPayout: number;
  hexonaProfit: number;
  totalExpenses: number;
}

function calculatePayouts(project: Project, expenses: number): PayoutCalculation {
  // DFY gets commission on the client price
  const dfyCommission = project.price_dfy * (project.dfy_commission_pct / 100);

  // Dev gets their rate
  const devPayout = project.price_dev;

  // Hexona profit = what we charge DFY - what we pay dev - expenses
  const hexonaProfit = project.price_hexona - project.price_dev - expenses;

  return {
    dfyCommission,
    devPayout,
    hexonaProfit,
    totalExpenses: expenses,
  };
}
```

### 2.4 Payout Dashboard UI

**Admin Payouts Page (`/dashboard/admin/payouts`):**
- Pending payouts table (grouped by type)
- Bulk approve/reject
- Payment history with status
- Mercury balance display
- Scheduled payouts calendar

---

## Phase 3: Client Payment Portal

### 3.1 Client-Facing Invoice View

**Route:** `/pay/[invoiceId]` (public, no auth required)

**Features:**
- Invoice details with line items
- Pay Now button → Stripe Checkout
- Download PDF
- Payment history for project
- Contact support link

### 3.2 Client Dashboard Payment Tab

**Route:** `/dashboard/client/[projectId]/payments`

**Features:**
- Payment milestones timeline
- Outstanding invoices
- Payment history
- Receipts download

---

## Phase 4: Automation & Notifications

### 4.1 Automated Triggers

| Trigger | Action |
|---------|--------|
| Milestone due in 7 days | Send payment reminder email |
| Milestone overdue | Notify admin + send client reminder |
| Payment received | Send receipt, notify admin, update status |
| Payout completed | Send confirmation to recipient |
| All milestones paid | Trigger payout calculation |

### 4.2 Email Templates

- Invoice sent
- Payment reminder (7 days, 3 days, overdue)
- Payment receipt
- Payout notification
- Commission statement (monthly)

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Add Stripe SDK and configuration
- [ ] Create invoices, payout_recipients, payouts tables
- [ ] Build invoice CRUD API
- [ ] Create Stripe webhook handler
- [ ] Build admin invoice management UI

### Phase 2: Client Portal (Week 2-3)
- [ ] Build `/pay/[invoiceId]` public page
- [ ] Integrate Stripe Checkout
- [ ] Add PDF generation for invoices
- [ ] Client payments dashboard tab

### Phase 3: Mercury Integration (Week 3-4)
- [ ] Set up Mercury API client
- [ ] Create payout recipient management
- [ ] Build payout calculation logic
- [ ] Admin payout approval workflow
- [ ] Mercury webhook handler

### Phase 4: Automation (Week 4-5)
- [ ] Payment reminder cron job
- [ ] Auto-payout trigger on project completion
- [ ] Email notification templates
- [ ] Commission statements

---

## Security Considerations

### PCI Compliance
- Never store full card numbers (Stripe handles this)
- Use Stripe Elements or Checkout for card input
- Webhook signature verification required

### Bank Account Security
- Encrypt bank routing/account numbers at rest
- Never log sensitive data
- Use Mercury's recipient IDs instead of raw bank details
- Audit logging for all payout actions

### API Security
- Webhook signature verification (Stripe & Mercury)
- Rate limiting on payment endpoints
- Admin-only access for payout approval
- Idempotency keys for all payment operations

---

## File Structure

```
lib/
├── stripe/
│   ├── server.ts           # Stripe client
│   ├── checkout.ts         # Checkout session helpers
│   └── webhooks.ts         # Webhook verification
├── mercury/
│   ├── server.ts           # Mercury API client
│   ├── payouts.ts          # Payout helpers
│   └── webhooks.ts         # Webhook verification
├── api/
│   ├── invoices.ts         # Invoice CRUD
│   └── payouts.ts          # Payout CRUD
app/
├── api/
│   ├── webhooks/
│   │   ├── stripe/route.ts
│   │   └── mercury/route.ts
│   ├── invoices/
│   │   └── [...]/route.ts
│   └── payouts/
│       └── [...]/route.ts
├── pay/
│   └── [invoiceId]/page.tsx    # Public payment page
├── dashboard/
│   └── admin/
│       ├── invoices/page.tsx   # Invoice management
│       └── payouts/page.tsx    # Payout management
features/
├── payments/
│   ├── components/
│   │   ├── InvoiceForm.tsx
│   │   ├── InvoicePreview.tsx
│   │   ├── PayoutApprovalTable.tsx
│   │   └── PaymentMilestoneCard.tsx
│   └── actions/
│       ├── invoiceActions.ts
│       └── payoutActions.ts
```

---

## API Reference

### Stripe Endpoints

| Endpoint | Purpose |
|----------|---------|
| `stripe.invoices.create()` | Create invoice |
| `stripe.invoices.sendInvoice()` | Email invoice |
| `stripe.checkout.sessions.create()` | Payment link |
| `stripe.paymentIntents.retrieve()` | Check payment status |

### Mercury Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /accounts/{id}` | Get account balance |
| `POST /recipients` | Create payout recipient |
| `POST /payments/ach` | Send ACH payment |
| `GET /payments/{id}` | Check payment status |

---

## Success Metrics

- [ ] Clients can pay invoices online via Stripe
- [ ] Admin can create/send invoices from milestones
- [ ] Webhook updates payment status automatically
- [ ] DFY commissions calculate correctly
- [ ] Payouts execute via Mercury API
- [ ] All transactions have audit trail
- [ ] Payment reminders send on schedule

---

## API Research Findings (2026-01-07)

### Stripe API ✅ Ready

| Feature | Details |
|---------|---------|
| **Current API Version** | `2025-12-15.clover` |
| **SDK** | `stripe` (Node.js) |
| **Invoice API** | Full support - create, send, finalize, void |
| **Checkout Sessions** | Hosted payment pages, up to 20 line items |
| **Webhooks** | Signature verification via `constructEvent()` |

**Key Webhook Events:**
- `checkout.session.completed` — Payment successful
- `invoice.paid` — Invoice marked paid
- `invoice.payment_failed` — Payment failed

### Mercury API ⚠️ Requires Setup

| Feature | Details |
|---------|---------|
| **Base URL** | `https://api.mercury.com/api/v1/` |
| **Auth** | Basic auth (API key as username, empty password) |
| **Free Tier** | 100 programmatic ACH payments/month |

**Key Endpoints:**
- `GET /accounts` — List accounts
- `GET /account/{id}/transactions` — Transaction history
- `POST /account/{id}/transactions` — Create payment (requires IP whitelist)
- `POST /account/{id}/request-send-money` — Create payment (requires admin approval)

**IP Whitelisting Requirement:**
Mercury requires IP whitelisting for direct payments. Two options:
1. **Vercel Pro + Static IPs** ($20/mo) — Direct payments
2. **Use `request-send-money`** (Free) — Each payout needs manual approval in Mercury

**No Native Webhooks:**
Mercury uses a pull-based Events API. Solution: Cron job polls every 15 minutes to sync payout status.

---

## Dev Invoice Upload Workflow

### Flow
```
Project Completed
      │
      ▼
Dev sees "Upload Invoice" prompt in dashboard
      │
      ▼
Dev uploads PDF/image of their invoice
      │
      ▼
Admin reviews invoice → Approves payout
      │
      ▼
Mercury sends payment (via request-send-money)
      │
      ▼
Admin approves in Mercury dashboard
      │
      ▼
Cron syncs → Payout marked complete
      │
      ▼
Dev sees "Paid ✓" with receipt link
```

### Payout Status Flow
```
pending → invoice_required → invoice_uploaded → verified → approved → processing → completed
                                    ↓
                            revision_needed
```

### Dev Dashboard View
```
┌─────────────────────────────────────────────────────┐
│ Payments                                             │
├─────────────────────────────────────────────────────┤
│ Project: Restaurant AI Chatbot                       │
│ Status: ⚠️ Invoice Required                          │
│ [Upload Invoice]                                     │
├─────────────────────────────────────────────────────┤
│ Project: Dental Booking System                       │
│ Status: 🕐 Processing                                │
│ Invoice: invoice-dec-2025.pdf ✓                      │
├─────────────────────────────────────────────────────┤
│ Project: Gym Management App                          │
│ Status: ✅ Paid (Jan 3, 2026)                        │
└─────────────────────────────────────────────────────┘
```

### Admin Payout View
```
┌──────────────────────────────────────────────────────────────┐
│ Pending Payouts                                    [Sync 🔄] │
├──────────────────────────────────────────────────────────────┤
│ Dev: @john_dev                                               │
│ Project: Restaurant AI Chatbot | Amount: $2,500              │
│ Invoice: invoice-jan-2026.pdf [View]                         │
│ [✓ Verify & Approve]  [✗ Request Revision]                   │
└──────────────────────────────────────────────────────────────┘
```

---

## Cron Job: Mercury Sync

```typescript
// Vercel Cron: /api/cron/sync-mercury-payouts
// vercel.json: { "crons": [{ "path": "/api/cron/sync-mercury-payouts", "schedule": "*/15 * * * *" }] }

export async function GET() {
  // 1. Get all hexOS payouts in 'processing' status
  const pendingPayouts = await getPayoutsByStatus('processing');

  // 2. Query Mercury Events API for updates
  for (const payout of pendingPayouts) {
    const mercuryStatus = await getMercuryTransactionStatus(payout.mercury_payment_id);

    if (mercuryStatus === 'sent' || mercuryStatus === 'completed') {
      await updatePayoutStatus(payout.id, 'completed', { completed_at: new Date() });
      await createNotification({ type: 'payout_completed', recipientId: payout.recipient_id });
    }
  }

  return Response.json({ synced: pendingPayouts.length });
}
```
