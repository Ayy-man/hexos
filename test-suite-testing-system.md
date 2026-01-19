# Test Suite: Deliverable Testing System

## Purpose
Verify that deliverables moved to 90%+ on the hill chart automatically create test records and appear correctly in the Testing tab.

## Prerequisites
- A project with at least one deliverable below 90%
- User is logged in with appropriate permissions

---

## Test 1: Initial State - Testing Tab Hidden

**Goal:** Verify Testing tab doesn't appear when no deliverables are in testing zone.

### Steps
1. Navigate to a project page
2. Observe the tabs at the top of the project view

### Expected Results
- Tabs visible: **Overview**, **Hill Chart**, **Progress**, **Files**
- **Testing tab should NOT be visible**
- No deliverables at 90%+ should exist

---

## Test 2: Move Deliverable to 90% - Auto-Create Test Record

**Goal:** Verify moving a deliverable to 90% automatically creates a `deliverable_tests` record.

### Steps
1. Navigate to the **Hill Chart** tab
2. Find a deliverable with position < 90%
3. Click the **+10%** button OR drag the deliverable dot to 90%

### Expected Results
- Deliverable position updates to 90%
- Deliverable shows a **lock indicator** (ring around the dot)
- Deliverable shows a **testing stage badge** (D for Dev)
- A new `deliverable_tests` record is created in the database:
  - `stage = 'dev'`
  - `status = 'pending'`
  - `deliverable_id` matches the moved deliverable

---

## Test 3: Testing Tab Appears - Ready for Dev Testing

**Goal:** Verify deliverable appears in Testing tab after entering 90%+ zone.

### Steps
1. After completing Test 2, look at the project tabs
2. Click on the **Testing** tab (should now be visible with TestTube icon)

### Expected Results
- **Testing tab is now visible** between Progress and Files tabs
- Testing tab shows a section titled **"Ready for Dev Testing"**
- The deliverable moved to 90% appears in this section
- Deliverable shows:
  - Title
  - Status badges: Dev (○ pending), QA (—), Client (—)
  - **"Start Testing" button** is enabled and clickable

---

## Test 4: Verify Lock Behavior at 90%

**Goal:** Verify deliverable cannot be moved past 90% without completing dev tests.

### Steps
1. On the Hill Chart tab, find the deliverable at 90%
2. Try to click the **+5%** or **+10%** button
3. Try to drag the dot past 90%

### Expected Results
- **Quick update buttons (+5%, +10%) are disabled or hidden**
- Dragging the dot should **snap back to 90%** if released past 90%
- A tooltip or message indicates the deliverable is **locked until dev tests pass**
- Lock indicator is visible on the deliverable dot

---

## Test 5: Start Dev Testing - Open Modal

**Goal:** Verify the testing modal opens correctly.

### Steps
1. Navigate to the **Testing** tab
2. Find the deliverable in "Ready for Dev Testing"
3. Click the **"Start Testing"** button

### Expected Results
- **Testing modal opens**
- Modal title shows deliverable name and "Dev Testing"
- Modal shows two tabs: **"Checklist"** and **"Notes & Summary"**
- Checklist tab is active by default
- Status shows: **"Pending"**
- A **"Generate Checklist"** button is visible
- Categories are shown but empty (or pre-filled if auto-generated):
  - Functional
  - Edge Cases
  - Integration
  - Security
  - UI/Responsive
  - Custom

---

## Test 6: Generate and Complete Test Checklist

**Goal:** Verify checklist generation and test submission.

### Steps
1. In the Testing modal, click **"Generate Checklist"** (or add manual items)
2. Wait for AI-generated test items to appear
3. Mark all items as **Pass** (click each checkbox/radio)
4. Optionally add notes in the **"Notes & Summary"** tab
5. Click **"Submit Test Results"**

### Expected Results
- Test items are generated and categorized
- Each item shows:
  - Description
  - Category badge
  - Pass/Fail radio buttons
  - Failure reason input (shows when Fail selected)
- After marking all items:
  - **Submit button becomes enabled**
  - Status updates to **"In Progress"** during testing
- After submission:
  - Modal closes
  - Test status updates to **"Passed"**
  - Deliverable moves to **"In Progress"** or is removed from "Ready for Dev Testing"

---

## Test 7: Verify Unlock to 95% After Dev Tests Pass

**Goal:** Verify deliverable unlocks to 95% after dev testing passes.

### Steps
1. After completing Test 6, navigate to **Hill Chart** tab
2. Find the deliverable that just passed dev tests
3. Observe the lock indicator and available buttons

### Expected Results
- Deliverable is **now locked at 95%** (not 90%)
- Lock indicator shows unlock position as 95
- **+5% button is disabled** (can only go to 95%)
- Testing stage badge shows **"A" for Admin/QA**
- Deliverable shows:
  - Dev status: ✓ (passed)
  - QA status: ○ (pending)
  - Client status: — (not started)

---

## Test 8: Admin Testing - Ready for Admin Testing

**Goal:** Verify deliverable appears in admin testing queue.

### Steps
1. Navigate to the **Testing** tab
2. Look for the **"Ready for Admin Testing"** section

### Expected Results
- **"Ready for Admin Testing"** section is visible
- The deliverable appears in this section
- Deliverable shows:
  - Title
  - Status badges: Dev (✓ passed), QA (○ pending), Client (—)
  - **"Start Testing" button** is enabled (for admin users)

---

## Test 9: Move Deliverable to 95% - Verify No Duplicate Test Record

**Goal:** Verify moving to 95% doesn't create duplicate dev test records.

### Steps
1. Navigate to **Hill Chart** tab
2. Click the deliverable to expand it (if not already)
3. Use quick update buttons or drag to move it to 95%

### Expected Results
- Deliverable position updates to 95%
- **No new test records are created**
- Only the original dev test record exists (status='passed')
- A new admin_int test record may be created when testing starts

---

## Test 10: Complete Admin Testing

**Goal:** Verify admin testing flow works correctly.

### Steps
1. In **Testing** tab, click **"Start Testing"** for the deliverable in "Ready for Admin Testing"
2. In the modal, click **"Generate Checklist"** or add items
3. Mark all items as **Pass**
4. Click **"Submit Test Results"**

### Expected Results
- Modal opens for **"Admin QA Testing"**
- Test submission succeeds
- Admin test status updates to **"Passed"**
- Deliverable now shows:
  - Dev: ✓ (passed)
  - QA: ✓ (passed)
  - Client: ○ (pending)

---

## Test 11: Verify Unlock to 100% After QA Passes

**Goal:** Verify deliverable unlocks to 100% after admin testing passes.

### Steps
1. Navigate to **Hill Chart** tab
2. Find the deliverable that passed admin testing
3. Observe lock position and testing badges

### Expected Results
- Deliverable is **locked at 100%**
- Lock indicator shows unlock position as 100
- Testing stage badge shows **"C" for Client**
- Status shows:
  - Dev: ✓ (passed)
  - QA: ✓ (passed)
  - Client: ○ (pending)

---

## Test 12: Client Testing - Ready for Client Testing

**Goal:** Verify deliverable appears in client testing queue.

### Steps
1. Navigate to **Testing** tab
2. Look for the **"Ready for Client Testing"** section

### Expected Results
- **"Ready for Client Testing"** section is visible
- The deliverable appears in this section
- Status badges show: Dev (✓), QA (✓), Client (○)
- **"Start Testing"** button is enabled

---

## Test 13: Complete Client Testing - Final Stage

**Goal:** Verify client UAT testing flow.

### Steps
1. Click **"Start Testing"** for the deliverable
2. Generate or add test items
3. Mark all items as **Pass**
4. Click **"Submit Test Results"**

### Expected Results
- Modal opens for **"Client UAT"**
- Test submission succeeds
- Client test status updates to **"Passed"**

---

## Test 14: Verify All Tests Passed - Deliverable Complete

**Goal:** Verify deliverable is complete after all testing stages pass.

### Steps
1. Navigate to **Hill Chart** tab
2. Find the fully tested deliverable
3. Navigate to **Testing** tab

### Expected Results
**Hill Chart:**
- Deliverable shows at **100%**
- **No lock indicator** (or all locks removed)
- Testing stage badge shows **"Done"** or similar
- Status shows all stages: ✓ ✓ ✓

**Testing Tab:**
- Deliverable **does NOT appear** in any queue
- Or appears in a **"Completed"** section if one exists
- All testing sections (Dev, QA, Client) show the deliverable as passed

---

## Test 15: Failed Test - Create Blocker

**Goal:** Verify failed tests create blockers correctly.

### Steps
1. Move a fresh deliverable to 90%
2. Start testing and mark at least one item as **Fail**
3. Add a failure reason
4. Submit test results with **"Create Blockers"** enabled

### Expected Results
- Test status updates to **"Failed"**
- A **blocker is created** in the project:
  - Title includes "Test failed: [item description]"
  - Description includes the failure reason
  - Linked to the test item
- Deliverable remains **locked** at current milestone
- Deliverable does NOT progress to next testing stage

---

## Test 16: Batch Update - Multiple Deliverables to 90%

**Goal:** Verify batch drag creates test records for all deliverables.

### Steps
1. On Hill Chart, select multiple deliverables below 90%
2. Drag all of them to 90%+ simultaneously
3. Check the database for `deliverable_tests` records

### Expected Results
- All deliverables update to new positions
- **Each deliverable gets its own test record** created
- Testing tab shows all deliverables in appropriate queues
- No duplicate test records are created

---

## Test 17: Quick Update Buttons - Test Record Creation

**Goal:** Verify quick update buttons also create test records.

### Steps
1. Find a deliverable at 85%
2. Click the **+10%** button (moves to 95%)
3. Check for test record creation

### Expected Results
- Deliverable moves from 85% to 95%
- **A test record is created** when crossing 90%
- Deliverable appears in Testing tab (dev stage, pending)

---

## Test 18: Edge Case - Moving from 89% to 91%

**Goal:** Verify test creation when jumping over 90% threshold.

### Steps
1. Find a deliverable at exactly 89%
2. Drag or update to 91% (skipping 90%)

### Expected Results
- Deliverable updates to 91%
- **Test record IS created** (because 91 >= 90)
- Deliverable appears in Testing tab

---

## Test 19: Role-Based Access - Dev vs Admin

**Goal:** Verify role-based visibility in Testing tab.

### Steps
1. As a **Dev user**, navigate to Testing tab
2. Observe which sections are visible
3. As an **Admin user**, navigate to Testing tab
4. Observe which sections are visible

### Expected Results
**Dev User:**
- Sees: "Ready for Dev Testing", "In Progress"
- Does NOT see: "Ready for Admin Testing", "Ready for Client Testing"

**Admin User:**
- Sees: "Ready for Admin Testing", "Ready for Client Testing", "In Progress"
- May or may not see dev testing depending on configuration

---

## Test 20: Regression - Existing Deliverable at 90%

**Goal:** Verify existing deliverables at 90% get test records on next update.

### Setup
- Have a deliverable already at 90% with no test record (simulate old data)

### Steps
1. Find deliverable at 90% (not in Testing tab)
2. Make any position update (even -1% then +1%)
3. Check Testing tab

### Expected Results
- After the update, a test record is created
- Deliverable appears in Testing tab
- Fix resolves the "ghost deliverable" issue

---

## Test Checklist Summary

| Test | Description | Status |
|------|-------------|--------|
| 1 | Testing tab hidden when < 90% | ☐ |
| 2 | Auto-create test record at 90% | ☐ |
| 3 | Testing tab appears with deliverable | ☐ |
| 4 | Lock behavior at 90% | ☐ |
| 5 | Open testing modal | ☐ |
| 6 | Generate and complete checklist | ☐ |
| 7 | Unlock to 95% after dev pass | ☐ |
| 8 | Admin testing queue | ☐ |
| 9 | No duplicate records at 95% | ☐ |
| 10 | Complete admin testing | ☐ |
| 11 | Unlock to 100% after QA pass | ☐ |
| 12 | Client testing queue | ☐ |
| 13 | Complete client testing | ☐ |
| 14 | All tests passed - complete | ☐ |
| 15 | Failed test creates blocker | ☐ |
| 16 | Batch update creates records | ☐ |
| 17 | Quick update creates records | ☐ |
| 18 | Edge case 89% → 91% | ☐ |
| 19 | Role-based access | ☐ |
| 20 | Regression fix | ☐ |

---

## Database Verification Queries

Run these to verify the fix is working:

```sql
-- 1. Check deliverables at 90%+ without test records (should be empty after fix)
SELECT d.id, d.title, d.hill_position
FROM deliverables d
LEFT JOIN deliverable_tests dt ON d.id = dt.deliverable_id
WHERE d.hill_position >= 90
  AND dt.id IS NULL;

-- 2. Count test records by stage
SELECT stage, status, COUNT(*) as count
FROM deliverable_tests
GROUP BY stage, status
ORDER BY stage, status;

-- 3. Verify test records link to deliverables
SELECT d.title, d.hill_position, dt.stage, dt.status
FROM deliverables d
INNER JOIN deliverable_tests dt ON d.id = dt.deliverable_id
WHERE d.hill_position >= 90
ORDER BY d.hill_position, dt.stage;
```

---

## Chrome Browser Automation Commands

Reference for running these tests with the chrome MCP tool:

```javascript
// Navigate to project
{ action: "navigate", payload: "https://your-app.com/projects/{project_id}" }

// Click Hill Chart tab
{ action: "click", selector: "button[data-tab='hill-chart']" }

// Find deliverable position
{ action: "extract", selector: ".deliverable-card[data-id='{id}'] .position", payload: "text" }

// Click +10% button
{ action: "click", selector: ".deliverable-card[data-id='{id}'] .btn-plus-10" }

// Navigate to Testing tab
{ action: "click", selector: "button[data-tab='testing']" }

// Verify deliverable in queue
{ action: "extract", selector: ".testing-queue .queue-item[data-id='{id}']", payload: "text" }

// Start testing
{ action: "click", selector: ".testing-queue .btn-start-test[data-id='{id}']" }

// Generate checklist
{ action: "click", selector: ".testing-modal .btn-generate-checklist" }

// Mark first item as pass
{ action: "click", selector: ".checklist-item:first-child .radio-pass" }

// Submit tests
{ action: "click", selector: ".testing-modal .btn-submit" }
```
