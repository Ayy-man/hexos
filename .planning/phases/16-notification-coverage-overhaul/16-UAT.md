---
status: testing
phase: 16-notification-coverage-overhaul
source: [16-01-SUMMARY.md, 16-02-SUMMARY.md, 16-03-SUMMARY.md, 16-04-SUMMARY.md, 16-05-SUMMARY.md]
started: 2026-02-22T21:50:00Z
updated: 2026-02-22T21:50:00Z
---

## Current Test

number: 1
name: Admin notified on new inquiry
expected: |
  As a DFY partner, submit a new inquiry. An admin user should receive an in-app notification with the company name and project type.
awaiting: user response

## Tests

### 1. Admin notified on new inquiry
expected: As a DFY partner, submit a new inquiry. An admin user should receive an in-app notification with the company name and project type.
result: [pending]

### 2. Admin notified when DFY marks deal as WON
expected: As a DFY partner, open an expired proposal's status popup and mark it as "Won". An admin user should receive an in-app notification saying the deal was closed/won with the company name.
result: [pending]

### 3. Admin notified when DFY marks deal as LOST
expected: As a DFY partner, open an expired proposal's status popup and mark it as "Lost" with a reason. An admin user should receive a notification with the company name and loss reason.
result: [pending]

### 4. Escalation actually notifies admin (lying toast fixed)
expected: As a DFY partner, click "Need Help" on a stale proposal. The toast "Admin has been notified" should now be TRUE — admin should actually receive an escalation_admin notification.
result: [pending]

### 5. @mention creates notification
expected: In a conversation, @mention another user. That user should receive a "mention" notification with a preview of the message. Mentioning yourself should NOT create a notification.
result: [pending]

### 6. Stakeholders notified on project creation
expected: When a won inquiry is converted to a project via the initiation flow, all project stakeholders (admin, DFY, assigned dev) should receive a "project_created" notification.
result: [pending]

### 7. Deliverable status change notification
expected: Change a deliverable's status (e.g., pending → in_progress). Project stakeholders should receive a "deliverable_status_change" notification with the deliverable name and new status.
result: [pending]

### 8. Client notified on invoice sent
expected: Send an invoice from the finance tab. The client (if linked to the project) and all admins should receive notifications in addition to the DFY partner.
result: [pending]

### 9. Client notified on payment received
expected: When a payment is marked as paid (or Stripe webhook fires), the client and admins should receive a notification in addition to the DFY partner.
result: [pending]

### 10. Admin notified on dev check-in
expected: As a dev, submit a check-in for a retainer project. Admin users should receive a "check_in_submitted" notification with the dev's name and project.
result: [pending]

### 11. Admin notified on blocker raised
expected: As a dev, report a new blocker on a project. Admin users should receive a "blocker_raised" notification with the blocker title and project name.
result: [pending]

### 12. Extension notifications include push
expected: Request a project extension. The notification should be created via createNotification() (not raw insert), meaning push notification delivery is now included.
result: [pending]

### 13. Scope notifications type-safe
expected: Flag a scope change on a project. The notification should be created without any TypeScript errors — no more `as never` casts. Check that scope_change_flagged/approved/rejected notifications appear correctly.
result: [pending]

### 14. Cron: check-in overdue endpoint works
expected: Call GET /api/cron/check-in-overdue with Bearer CRON_SECRET header. Should return 200 with a JSON summary of overdue check-ins processed and notifications sent.
result: [pending]

### 15. Cron: deadline reminders endpoint works
expected: Call GET /api/cron/deadline-reminders with Bearer CRON_SECRET header. Should return 200 with a JSON summary of upcoming deadlines processed and notifications sent.
result: [pending]

### 16. Cron: proposal expiry endpoint works
expected: Call GET /api/cron/proposal-expiry with Bearer CRON_SECRET header. Should return 200 with a JSON summary of stale proposals found and notifications sent.
result: [pending]

## Summary

total: 16
passed: 0
issues: 0
pending: 16
skipped: 0

## Gaps

[none yet]
