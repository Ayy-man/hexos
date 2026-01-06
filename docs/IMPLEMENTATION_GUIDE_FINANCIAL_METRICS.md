# Financial Metrics Implementation Guide

## 🎯 What You Asked For

You requested:
1. **Pending Payments**: Track remaining payments for projects (50%, 30%, etc.)
2. **Payment Milestones**: Show when payments are expected (linked to project end dates)
3. **Payable This Month / Next Month**: Expected payments by month
4. **Projected Revenue**: Dynamic calculation using:
   - Pending payments (actual)
   - Pipeline estimation (avg sales cycle × avg ticket size × active inquiries × win rate)

## ✅ What I Built

### 1. Database Migration
**File:** `/supabase/migrations/20260107000100_financial_metrics_system.sql`

**Functions Created:**
- `create_payment_milestones()` - Auto-generate milestones based on payment structure
- `get_financial_hero_metrics()` - All key metrics in one query
- `get_payment_timeline()` - Expected payments by month
- `get_revenue_trend()` - Historical revenue
- `get_overdue_payments()` - Overdue payment alerts
- `get_sales_cycle_stats()` - Sales cycle analytics
- `get_projected_revenue_timeline()` - Future revenue forecast

**View Created:**
- `financial_overview` - Pending payments by project

### 2. TypeScript API Layer
**File:** `/lib/api/financial-metrics.ts`

**Functions:**
- All database function wrappers
- Payment milestone CRUD operations
- Utility functions (formatCurrency, getPaymentUrgency, etc.)
- TypeScript types for all responses

### 3. Server Actions
**File:** `/features/admin/actions/financialActions.ts`

**Actions:**
- `fetchFinancialHeroMetrics()` - Get all hero metrics
- `fetchPaymentTimeline()` - Payment schedule
- `fetchRevenueTrend()` - Revenue history
- `fetchOverduePayments()` - Overdue alerts
- `createProjectPaymentMilestones()` - Auto-create milestones
- `markPaymentMilestoneAsPaid()` - Mark as paid
- And more...

### 4. Example Dashboard Component
**File:** `/features/admin/components/FinancialDashboardExample.tsx`

Complete example showing:
- Hero metrics cards
- Revenue trend chart
- Payment timeline
- Projected revenue breakdown
- Overdue payments alert
- Pending payments by project

### 5. Documentation
**File:** `/docs/ADMIN_FINANCIAL_METRICS.md`

Complete documentation with:
- All SQL queries
- Chart recommendations
- Implementation checklist
- Future enhancement ideas

---

## 📊 Key Metrics Available

### Hero Metrics (Top Cards)
1. **Total Revenue** - All time revenue
2. **Revenue This Month** - Projects started this month
3. **Pending Payments** - Unpaid milestones
4. **Payable This Month** - Due this month
5. **Payable Next Month** - Due next month
6. **Projected Revenue** - Next 3 months (pending + pipeline estimate)

### Sales Metrics
- **Win Rate** - Closed / (Closed + Lost) %
- **Avg Ticket Size** - Average deal value
- **Avg Sales Cycle** - Days to close deals
- **Active Inquiries** - In pipeline count

### Charts
- Revenue Trend (last 12 months)
- Payment Collection Timeline (next 12 months)
- Projected Revenue Breakdown
- Overdue Payments Table
- Pending by Project Table

---

## 🚀 How to Implement

### Step 1: Run the Migration
```bash
cd /home/user/hexos
pnpm supabase db push
```

This will:
- Create all database functions
- Create the financial_overview view
- Add necessary indexes

### Step 2: Update Project Conversion Logic

Add payment milestone creation when converting inquiry to project:

```typescript
// In your convertToProject function
import { createPaymentMilestones } from '@/lib/api/financial-metrics';

// After creating project
await createPaymentMilestones(
  projectId,
  quotedPrice,
  paymentStructure, // '100_upfront', '50_50', '40_30_30', or 'custom'
  targetDeliveryDate
);
```

### Step 3: Create Admin Financial Dashboard Page

```typescript
// app/(dashboard)/dashboard/admin/financial/page.tsx

import { FinancialDashboardExample } from '@/features/admin/components/FinancialDashboardExample';

export default function AdminFinancialPage() {
  return <FinancialDashboardExample />;
}
```

Or build your own using the server actions:

```typescript
import {
  fetchFinancialHeroMetrics,
  fetchPaymentTimeline,
  fetchRevenueTrend,
} from '@/features/admin/actions/financialActions';

export default async function CustomFinancialDashboard() {
  const metrics = await fetchFinancialHeroMetrics();

  return (
    <div>
      <h1>Total Revenue: ${metrics.data.total_revenue}</h1>
      <h2>Pending: ${metrics.data.pending_payments}</h2>
      <h2>Projected: ${metrics.data.projected_revenue}</h2>
    </div>
  );
}
```

### Step 4: Add Payment Milestone Management

Create UI to:
- View payment milestones for a project
- Mark milestones as paid
- Adjust due dates

```typescript
import { markPaymentMilestoneAsPaid } from '@/features/admin/actions/financialActions';

// In your component
async function handleMarkAsPaid(milestoneId: string) {
  await markPaymentMilestoneAsPaid(milestoneId);
  // UI will revalidate automatically
}
```

---

## 💡 Understanding Projected Revenue

### Formula
```
Projected Revenue = Pending Payments + Estimated Pipeline Revenue

Where:
  Pending Payments = SUM(unpaid payment_milestones.amount)

  Estimated Pipeline = Active Inquiries × Win Rate × Avg Ticket Size

  Active Inquiries = COUNT(inquiries NOT IN ('closed', 'lost', 'unopened'))

  Win Rate = Closed / (Closed + Lost) from last 6 months

  Avg Ticket Size = AVG(price_dfy) from closed deals in last 6 months
```

### Dynamic Calculation
The calculation is **always up-to-date** because:
- It queries live data from your database
- Win rate updates as you close/lose deals
- Avg ticket size updates as deal values change
- Active inquiry count updates in real-time

### Example
```
Active Inquiries: 10
Win Rate: 40% (40 closed / 100 total decisions in last 6 months)
Avg Ticket Size: $25,000 (from closed deals)

Estimated Pipeline = 10 × 0.4 × $25,000 = $100,000

Pending Payments: $150,000 (from existing projects)

Total Projected Revenue = $150,000 + $100,000 = $250,000
```

---

## 📈 Timeline-Based Projections

The system also provides **month-by-month** projections:

```sql
-- Shows which month each active inquiry is likely to close
-- Based on: inquiry created_at + avg sales cycle days
```

This gives you:
- Expected deals to close this month
- Expected deals to close next month
- 3-month forward projection

---

## 🔧 Payment Structures Explained

### 100% Upfront (`100_upfront`)
- Creates 1 milestone: Full payment due on project start

### 50/50 (`50_50`)
- Milestone 1: 50% due on project start
- Milestone 2: 50% due on target delivery date

### 40/30/30 (`40_30_30`)
- Milestone 1: 40% due on project start
- Milestone 2: 30% due at project midpoint
- Milestone 3: 30% due on target delivery date

### Custom (`custom`)
- Admin manually creates milestones

---

## 📊 Available Chart Data

All functions return data ready for charts:

### Revenue Trend (Line Chart)
```typescript
const trend = await fetchRevenueTrend(12); // Last 12 months
// Returns: [{ month: '2025-01-01', revenue: 50000, projects_started: 5 }, ...]
```

### Payment Timeline (Bar Chart)
```typescript
const timeline = await fetchPaymentTimeline(12); // Next 12 months
// Returns: [{ month: '2026-02-01', expected_revenue: 75000, milestone_count: 8 }, ...]
```

### Projected Revenue (Stacked Bar)
```typescript
const projected = await fetchProjectedRevenueTimeline();
// Returns: [{ month: '2026-02-01', expected_deals: 3, projected_revenue: 45000 }, ...]
```

Use with Recharts, Chart.js, or any charting library.

---

## 🎨 UI Component Recommendations

### Hero Metrics Cards
Use shadcn/ui `Card` component with:
- Icon (DollarSign, TrendingUp, Calendar, Target)
- Large number display
- Small subtitle text

### Charts
Recommended library: **Recharts** (already popular with Next.js)

```bash
npm install recharts
```

Example:
```typescript
import { LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

<LineChart data={revenueTrend}>
  <XAxis dataKey="month" />
  <YAxis />
  <Line type="monotone" dataKey="revenue" stroke="#8884d8" />
  <Tooltip />
</LineChart>
```

### Tables
Use shadcn/ui `Table` component for:
- Overdue payments
- Pending payments by project
- Payment milestones

---

## 🚨 Important Notes

### 1. Historical Data Required
The projected revenue calculation needs at least some historical data to work well. If you're just starting:
- Win rate defaults to 30% if no historical data
- Avg ticket size defaults to 0 if no closed deals
- System looks back 6 months for calculations

### 2. Payment Milestone Auto-Creation
Only happens when you call `createPaymentMilestones()`. Update your project conversion logic to call this function.

### 3. Marking Milestones as Paid
Currently manual. Future enhancement: Stripe webhook integration to auto-mark as paid.

### 4. RLS Policies
All financial data is admin-only (already handled by existing RLS policies on `projects` and `payment_milestones` tables).

---

## 🔮 Future Enhancements

### Phase 2: Stripe Integration
- Auto-create Stripe invoices for milestones
- Auto-mark as paid via webhook
- Payment link generation

### Phase 3: Notifications
- Email clients when payment is due
- Alert admins when payments are overdue
- Weekly financial summary email

### Phase 4: Advanced Analytics
- Cash flow forecast (income - expenses)
- Revenue recognition (GAAP-compliant)
- Budget vs actual tracking
- Client payment behavior analysis

---

## ✅ Quick Test Script

Test all functions work correctly:

```sql
-- Run in Supabase SQL Editor

-- Test hero metrics
SELECT * FROM get_financial_hero_metrics();

-- Test payment timeline
SELECT * FROM get_payment_timeline(12);

-- Test revenue trend
SELECT * FROM get_revenue_trend(12);

-- Test overdue payments
SELECT * FROM get_overdue_payments();

-- Test sales cycle stats
SELECT * FROM get_sales_cycle_stats();

-- Test projected revenue timeline
SELECT * FROM get_projected_revenue_timeline();

-- Test financial overview view
SELECT * FROM financial_overview LIMIT 10;
```

---

## 📁 File Reference

All files created:
1. `/supabase/migrations/20260107000100_financial_metrics_system.sql`
2. `/lib/api/financial-metrics.ts`
3. `/features/admin/actions/financialActions.ts`
4. `/features/admin/components/FinancialDashboardExample.tsx`
5. `/docs/ADMIN_FINANCIAL_METRICS.md` (comprehensive reference)
6. `/docs/IMPLEMENTATION_GUIDE_FINANCIAL_METRICS.md` (this file)

---

You now have a complete financial metrics system with:
- ✅ Pending payments tracking
- ✅ Payment milestones (auto-created by payment structure)
- ✅ Payable this month / next month
- ✅ Projected revenue (dynamic, always up-to-date)
- ✅ Revenue trends and analytics
- ✅ Sales cycle metrics

**Next step:** Run the migration and start building the UI!
