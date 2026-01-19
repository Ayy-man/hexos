# Finances System Implementation Plan

**Status:** In Progress
**Created:** 2026-01-08
**Spec:** Complete (see below)

---

## Executive Summary

Move finances from a buried tab in Metrics to a first-class citizen at `/finances`. Add retainers, receipt OCR, project-level P&L, and workflow automation.

---

## Current State

| Component | Location | Status |
|-----------|----------|--------|
| InvoiceManagement | Metrics → Financials tab | Working (RLS fixed) |
| ExpenseLedger | Metrics → Financials tab | Working |
| Payment charts | FinancialsTab.tsx | Working (needs empty states) |
| Stripe integration | lib/stripe/, webhooks | Complete |
| Payment milestones | lib/api/financial-metrics.ts | Complete |

---

## Implementation Phases

### Phase 1: Route Structure & Navigation
**Priority:** Critical
**Effort:** 2 hours

- [ ] Create `/finances` route group
- [ ] Create sub-routes: `/invoices`, `/expenses`, `/schedule`, `/reports`, `/retainers`
- [ ] Update sidebar navigation with Finances section
- [ ] Add layout.tsx for finances section

**Files to create:**
```
app/(dashboard)/finances/
  layout.tsx
  page.tsx                    → Overview (redirect or content)
  invoices/page.tsx
  invoices/[id]/page.tsx
  expenses/page.tsx
  schedule/page.tsx
  reports/page.tsx
  retainers/page.tsx
```

---

### Phase 2: Overview Page
**Priority:** Critical
**Effort:** 4 hours

- [ ] Create FinancialOverview component
- [ ] Hero metrics with period selector (month/quarter/year/all)
- [ ] Cash flow chart (6-month projection)
- [ ] Outstanding section (unpaid/overdue)
- [ ] Recent activity feed
- [ ] Action required section

**Data functions needed:**
```typescript
getFinancialOverview(period)
getCashFlowProjection(months)
getFinancialActions()
getFinancialActivity(limit)
```

**Empty state handling:**
- Charts: Show message instead of empty bars
- Actions: "All caught up!" with checkmark

---

### Phase 3: Invoices Page
**Priority:** High
**Effort:** 3 hours

- [ ] Move InvoiceManagement to `/finances/invoices`
- [ ] Add invoice detail page `/finances/invoices/[id]`
- [ ] Improve invoice creation flow (from milestone/project/standalone)
- [ ] Add invoice activity logging
- [ ] Add reminder functionality

**Database changes:**
```sql
CREATE TABLE invoice_activity (
  id UUID PRIMARY KEY,
  invoice_id UUID REFERENCES invoices(id),
  action TEXT NOT NULL,
  actor_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE invoices ADD COLUMN last_reminder_sent_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN reminder_count INTEGER DEFAULT 0;
```

---

### Phase 4: Expenses Page
**Priority:** High
**Effort:** 2 hours

- [ ] Move ExpenseLedger to `/finances/expenses`
- [ ] Add category breakdown chart
- [ ] Add CSV export
- [ ] Improve filtering (date range, category, project)

---

### Phase 5: Payment Schedule Page
**Priority:** Medium
**Effort:** 3 hours

- [ ] Create PaymentSchedule component
- [ ] Group milestones by month
- [ ] Show 90-day projection
- [ ] Add "Create Invoice" action per milestone
- [ ] Add "Mark Paid" for manual tracking

---

### Phase 6: Reports Pages
**Priority:** Medium
**Effort:** 4 hours

- [ ] Reports index page with report cards
- [ ] P&L report with period selector
- [ ] Revenue by client report
- [ ] Aging report (30/60/90 days)
- [ ] PDF export capability

**Reports:**
| Report | Data Source |
|--------|-------------|
| P&L | paid invoices - expenses |
| Revenue by Client | invoices grouped by client |
| Aging | unpaid invoices by due_date |

---

### Phase 7: Project Financials Tab
**Priority:** Medium
**Effort:** 3 hours

- [ ] Add Financials tab to project detail page
- [ ] Show project P&L (value - collected - expenses = profit)
- [ ] List payment milestones with invoice links
- [ ] List project expenses with add button
- [ ] Create `project_financials` database view

**Database view:**
```sql
CREATE VIEW project_financials AS
SELECT
  p.id, p.name,
  p.price_dfy as total_value,
  SUM(CASE WHEN pm.paid_at IS NOT NULL THEN pm.amount ELSE 0 END) as collected,
  COALESCE(exp.total, 0) as expenses,
  collected - expenses as profit
FROM projects p
LEFT JOIN payment_milestones pm ON pm.project_id = p.id
LEFT JOIN (SELECT project_id, SUM(amount) as total FROM expenses GROUP BY project_id) exp
  ON exp.project_id = p.id
GROUP BY p.id, exp.total;
```

---

### Phase 8: Retainer System
**Priority:** Low (future)
**Effort:** 6 hours

- [ ] Create `retainers` table
- [ ] Retainer creation modal on project close
- [ ] Retainers list page
- [ ] Retainer detail/edit panel
- [ ] Cron job for auto-invoice generation
- [ ] Link retainer invoices back to retainer

**Database:**
```sql
CREATE TABLE retainers (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  client_id UUID,
  dfy_partner_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  amount INTEGER NOT NULL,
  frequency TEXT DEFAULT 'monthly',
  billing_day INTEGER DEFAULT 1,
  next_invoice_date DATE NOT NULL,
  auto_send BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'active',
  invoices_generated INTEGER DEFAULT 0,
  total_collected INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Cron setup (vercel.json):**
```json
{
  "crons": [{
    "path": "/api/cron/retainer-invoices",
    "schedule": "0 11 * * *"
  }]
}
```

---

### Phase 9: Receipt OCR & Auto-categorization
**Priority:** Low (future)
**Effort:** 4 hours

- [ ] Receipt upload component with drag/drop
- [ ] OpenAI Vision API integration
- [ ] Extract: vendor, date, amount, description
- [ ] Pre-fill expense form from OCR
- [ ] Category suggestion from description keywords

**Category patterns:**
```typescript
const patterns = {
  contractor: ['contractor', 'dev', 'freelance', 'designer'],
  tools_ops: ['supabase', 'vercel', 'openai', 'api', 'hosting'],
  direct_cost: ['design', 'asset', 'stock', 'license'],
};
```

---

## File Structure (Final)

```
app/(dashboard)/finances/
  layout.tsx
  page.tsx
  invoices/
    page.tsx
    [id]/page.tsx
  expenses/page.tsx
  schedule/page.tsx
  reports/
    page.tsx
    profit-loss/page.tsx
    revenue-by-client/page.tsx
    aging/page.tsx
  retainers/page.tsx

features/finances/
  components/
    FinancialOverview.tsx
    HeroMetrics.tsx
    CashFlowChart.tsx
    OutstandingCard.tsx
    RecentActivity.tsx
    ActionRequired.tsx
    InvoiceList.tsx
    InvoiceDetail.tsx
    InvoiceForm.tsx
    ExpenseList.tsx
    ExpenseForm.tsx
    PaymentSchedule.tsx
    RetainerList.tsx
    RetainerForm.tsx
    ReceiptUploader.tsx
    ProjectFinancialsTab.tsx
  hooks/
    useFinancialOverview.ts
    useInvoices.ts
    useExpenses.ts
    useCashFlow.ts
    useRetainers.ts
  actions/
    financeActions.ts
  types/
    index.ts

lib/api/
  finances.ts (new)
  retainers.ts (new)
```

---

## Database Migrations

### Migration 1: Invoice Activity
```sql
-- 20260108000020_invoice_activity.sql
CREATE TABLE invoice_activity (...);
ALTER TABLE invoices ADD COLUMN last_reminder_sent_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN reminder_count INTEGER DEFAULT 0;
ALTER TABLE invoices ADD COLUMN recipient_type TEXT DEFAULT 'client';
ALTER TABLE invoices ADD COLUMN retainer_id UUID;
```

### Migration 2: Retainers
```sql
-- 20260108000021_retainers.sql
CREATE TABLE retainers (...);
CREATE INDEX idx_retainers_next_invoice ON retainers(next_invoice_date);
```

### Migration 3: Views
```sql
-- 20260108000022_financial_views.sql
CREATE VIEW project_financials AS ...;
CREATE VIEW financial_activity AS ...;
```

---

## Acceptance Criteria

### Phase 1-2 (MVP)
- [ ] `/finances` route exists and shows overview
- [ ] Hero metrics calculate correctly
- [ ] Cash flow chart shows projection or empty state
- [ ] Sidebar shows Finances section

### Phase 3-4 (Core)
- [ ] Invoices page lists all invoices
- [ ] Can create invoice from milestone
- [ ] Expenses page lists and filters
- [ ] Can add expense with receipt

### Phase 5-6 (Reports)
- [ ] Payment schedule shows milestones by month
- [ ] P&L report generates correctly
- [ ] Can export reports

### Phase 7 (Integration)
- [ ] Project detail has Financials tab
- [ ] Shows project P&L

### Phase 8-9 (Advanced)
- [ ] Retainer system works end-to-end
- [ ] Receipt OCR extracts data correctly

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking existing invoice system | Keep old components working during migration |
| RLS issues continue | Using admin client for now, fix RLS later |
| OCR accuracy | Manual verification required before save |
| Cron reliability | Notification on failure, manual fallback |

---

## Timeline

| Phase | Estimated |
|-------|-----------|
| 1-2 | Today |
| 3-4 | Today |
| 5-6 | Tomorrow |
| 7 | Tomorrow |
| 8-9 | Future sprint |

---

## Notes

- Keep Financials tab in Metrics until new system is stable
- Use admin client (bypasses RLS) until auth cookies fixed
- Charts must handle empty data gracefully
- All amounts stored in cents for precision
