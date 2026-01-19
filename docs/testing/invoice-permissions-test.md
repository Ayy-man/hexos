# Invoice Permissions Testing Framework

## Navigation

### Getting to Invoice Management
1. Login as **admin** user (required - only admins can access)
2. Navigate: **Dashboard** → **Admin** → **Metrics**
3. URL: `/dashboard/admin/metrics`
4. Scroll down to find **"Invoice Management"** card (has FileText icon)

### Direct URL
```
https://[your-domain]/dashboard/admin/metrics
```

---

## Test Cases

### TC-001: Create Invoice (Critical Path)
**Purpose:** Verify the permission fix works for invoice creation

**Prerequisites:**
- Logged in as admin
- On Invoice Management section

**Steps:**
1. Click **"+ New Invoice"** button (top right of Invoice Management card)
2. Fill in required fields:
   - **Client Name:** `Test Client`
   - **Client Email:** `test@example.com`
   - **Due Date:** Select a future date
3. Add line item:
   - **Description:** `Test Service`
   - **Qty:** `1`
   - **Price:** `100`
4. Click **"Create Invoice"**

**Expected Result:**
- Toast: "Invoice created"
- Dialog closes
- Invoice appears in table with status "Draft"
- Invoice number format: `INV-2026-XXXX`

**Failure Indicators:**
- Toast: "Failed to create invoice"
- Console error: "permission denied for table users"
- Dialog stays open

---

### TC-002: View Invoice List
**Purpose:** Verify SELECT permissions work

**Steps:**
1. Navigate to Invoice Management section
2. Observe the invoice table

**Expected Result:**
- Table loads without errors
- Stats show correct counts (Total, Drafts, Sent, Outstanding)
- Previously created invoices are visible

**Failure Indicators:**
- Empty table when invoices exist
- Console errors about permissions

---

### TC-003: Edit Draft Invoice
**Purpose:** Verify UPDATE permissions work

**Prerequisites:**
- At least one draft invoice exists

**Steps:**
1. Find a draft invoice in the table
2. Click the **"..."** menu (MoreHorizontal icon)
3. Select **"Edit"**
4. Modify the client name to `Updated Client`
5. Click **"Update"**

**Expected Result:**
- Toast: "Invoice updated"
- Client name updates in table

**Failure Indicators:**
- Toast: "Failed to update invoice"
- Changes not reflected

---

### TC-004: Delete Draft Invoice
**Purpose:** Verify DELETE permissions work

**Prerequisites:**
- At least one draft invoice exists (create one for this test)

**Steps:**
1. Find a draft invoice in the table
2. Click the **"..."** menu
3. Select **"Delete"** (red text)

**Expected Result:**
- Toast: "Invoice deleted"
- Invoice removed from table

**Failure Indicators:**
- Toast: "Failed to delete invoice"
- Invoice still visible

---

### TC-005: Send Invoice (Stripe Integration)
**Purpose:** Verify send workflow works

**Prerequisites:**
- Draft invoice exists
- Stripe keys configured in environment

**Steps:**
1. Find a draft invoice
2. Click **"..."** menu → **"Send to Client"**

**Expected Result:**
- Toast: "Invoice sent to client"
- Status changes from "Draft" to "Sent"
- Stripe hosted URL becomes available

**Failure Indicators:**
- Toast: "Failed to send invoice"
- Status unchanged

---

### TC-006: Void Sent Invoice
**Purpose:** Verify void workflow works

**Prerequisites:**
- Sent invoice exists

**Steps:**
1. Find a sent invoice
2. Click **"..."** menu → **"Void Invoice"**

**Expected Result:**
- Toast: "Invoice voided"
- Status changes to "Void"

---

### TC-007: Filter Invoices
**Purpose:** Verify filter UI works

**Steps:**
1. Use status dropdown to filter by "Draft"
2. Use project dropdown to filter by specific project

**Expected Result:**
- Table updates to show only matching invoices
- Counts remain accurate

---

## UI Element Reference

### Invoice Management Card Structure
```
┌─────────────────────────────────────────────────────┐
│ [FileText] Invoice Management    [+ New Invoice]    │
│ Create and manage client invoices                   │
├─────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────┐│
│ │ Total   │ │ Drafts  │ │ Sent    │ │ Outstanding ││
│ │   X     │ │   X     │ │   X     │ │   $X.XX     ││
│ └─────────┘ └─────────┘ └─────────┘ └─────────────┘│
├─────────────────────────────────────────────────────┤
│ [Status ▼]  [Project ▼]                             │
├─────────────────────────────────────────────────────┤
│ Invoice#   │ Client  │ Project │ Status │ Due │ $  │
│ INV-2026-X │ Name    │ Proj    │ [Draft]│ 1/1 │ $X │
│            │ email   │         │        │     │[⋮] │
└─────────────────────────────────────────────────────┘
```

### New Invoice Dialog Fields
| Field | Selector Hint | Required | Example Value |
|-------|---------------|----------|---------------|
| Client Name | `input#client_name` | Yes | "Test Client" |
| Client Email | `input#client_email` | Yes | "test@example.com" |
| Company | `input#client_company` | No | "Acme Inc" |
| Project | Select dropdown | No | Select from list |
| Line Item Description | First text input in line items | Yes | "Service" |
| Line Item Qty | Number input (w-20) | Yes | 1 |
| Line Item Price | Number input (w-28) | Yes | 100 |
| Due Date | `input#due_date` | Yes | Future date |
| Notes | `textarea#notes` | No | "Notes here" |

### Buttons
| Button | Location | Action |
|--------|----------|--------|
| "+ New Invoice" | Card header, right side | Opens create dialog |
| "Add Line Item" | Inside dialog, after line items | Adds new line item row |
| "Create Invoice" | Dialog footer, right | Submits form |
| "Cancel" | Dialog footer | Closes dialog |
| "..." (actions) | Each table row, right | Opens action menu |

---

## Console Debugging

### Check for Permission Errors
Open browser DevTools (F12) → Console tab

**Error to watch for:**
```
permission denied for table users
```

If you see this, the migration was NOT applied correctly.

### Network Tab
Filter by `invoices` to see API calls:
- `POST /api/invoices` - Create
- `GET /api/invoices` - List
- `PATCH /api/invoices/[id]` - Update
- `DELETE /api/invoices/[id]` - Delete
- `POST /api/invoices/[id]/send` - Send
- `POST /api/invoices/[id]/void` - Void

---

## Quick Smoke Test

**1-minute test to verify fix works:**

1. Go to `/dashboard/admin/metrics`
2. Scroll to Invoice Management
3. Click "+ New Invoice"
4. Fill: Name=`Test`, Email=`t@t.com`, Description=`Test`, Qty=1, Price=100, Due=tomorrow
5. Click "Create Invoice"
6. **PASS:** Toast says "Invoice created", invoice appears in table
7. **FAIL:** Error toast or console shows "permission denied for table users"

---

## Rollback Verification

If the fix didn't work, check:

1. **Migration applied?**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'invoices';
   ```
   Should see "Clients view own invoices" policy without `auth.users` reference

2. **Grants exist?**
   ```sql
   SELECT grantee, privilege_type
   FROM information_schema.table_privileges
   WHERE table_name = 'invoices';
   ```
   Should see `authenticated` with SELECT, INSERT, UPDATE, DELETE

3. **Function exists with SECURITY DEFINER?**
   ```sql
   SELECT prosecdef FROM pg_proc WHERE proname = 'generate_invoice_number';
   ```
   Should return `true`
