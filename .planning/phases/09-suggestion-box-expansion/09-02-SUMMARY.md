---
phase: 09-suggestion-box-expansion
plan: 02
subsystem: suggestions
tags: [api, conversations, notifications, suggestions]
depends_on:
  requires: ["09-01"]
  provides: ["suggestion-conversation-api", "suggestion-notifications"]
  affects: ["09-03"]
tech-stack:
  added: []
  patterns: ["suggestion-conversation-query", "status-change-notification"]
key-files:
  created: []
  modified:
    - lib/api/suggestions.ts
    - lib/api/conversations.ts
    - lib/api/conversations.shared.ts
    - lib/actions/suggestions.ts
decisions:
  - id: suggestion-query-pattern
    choice: "Follow existing getInquiryConversations pattern for getSuggestionConversations"
    rationale: "Consistency with codebase patterns, proven approach"
  - id: notification-on-status-change
    choice: "Trigger notification only when status field is included in update input"
    rationale: "Prevents duplicate notifications on admin_notes-only updates"
metrics:
  duration: "8 minutes"
  completed: "2026-01-20"
---

# Phase 09 Plan 02: Suggestion Conversation API Summary

API functions for suggestion conversations and notification triggers for status changes.

## One-liner

Added getSuggestionConversation/getSuggestionConversations API functions and status change notifications for suggestion authors.

## What Was Built

### Task 1: Suggestion Conversation Query Functions

**Files modified:**
- `lib/api/suggestions.ts` - Added `getSuggestionConversation()` function
- `lib/api/conversations.ts` - Added `getSuggestionConversations()` function
- `lib/api/conversations.shared.ts` - Added `suggestion` virtual field to Conversation interface

**Key implementation details:**

1. **getSuggestionConversation(suggestionId)** in suggestions.ts:
   - Takes a suggestion ID and returns both the conversation and suggestion objects
   - Verifies user has access to the suggestion first
   - Handles not-found cases gracefully (returns null)
   - Returns typed result: `{ conversation: Conversation | null, suggestion: Suggestion | null }`

2. **getSuggestionConversations()** in conversations.ts:
   - Returns all suggestion conversations with joined suggestion data
   - Includes unread counts and last message for each conversation
   - Sorts by most recent activity (last message or creation date)
   - Follows established pattern from `getInquiryConversations()`

3. **Conversation interface update:**
   - Added `suggestion?` virtual field with shape: `{ id, title, status, user_id }`
   - Enables UI components to display suggestion context in conversation lists

**Commit:** f5d8678

### Task 2: Notification Triggers for Status Changes

**Files modified:**
- `lib/actions/suggestions.ts` - Updated `updateSuggestionAction()` with notification logic

**Key implementation details:**

1. **Notification trigger logic:**
   - Only triggers when `input.status` is provided (not on admin_notes-only updates)
   - Fetches suggestion details (user_id, title) for notification message
   - Uses `suggestion_status_change` notification type (already defined in 09-01)
   - Includes actor_id (admin who made the change)

2. **Status labels:**
   - `reviewed` -> "marked as reviewed"
   - `implemented` -> "marked as implemented"
   - `declined` -> "declined"
   - Default fallback: "updated"

3. **Notification message format:**
   - Title: `Suggestion {status_label}`
   - Message: `Your suggestion "{title}" has been {status_label}`

**Commit:** adf98f3

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Query pattern | Follow getInquiryConversations pattern | Consistency with existing codebase |
| Notification trigger | Only on status field changes | Prevents duplicate notifications for admin notes updates |
| Status labels | Human-readable past-tense phrases | Clear user feedback ("marked as reviewed" vs "reviewed") |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All verification checks passed:
- `getMySuggestions` exists (already present): OK
- `getSuggestionConversation` exists: OK
- `getSuggestionConversations` exists: OK
- `createNotification` import: OK
- `suggestion_status_change` notification trigger: OK
- `pnpm tsc --noEmit`: OK (no TypeScript errors)

## What This Enables

1. **My Suggestions page** can now:
   - Display list of user's own suggestions via `getMySuggestions()`
   - Show conversation thread for each suggestion via `getSuggestionConversation()`

2. **Conversations inbox** can now:
   - Include suggestion conversations in listing via `getSuggestionConversations()`
   - Display suggestion context (title, status) alongside messages

3. **User notifications**:
   - Suggestion authors receive notifications when admins change status
   - Notifications link to `/my-suggestions` (configured in 09-01)

## Next Phase Readiness

Plan 09-03 (UI components) can now:
- Build My Suggestions page using `getMySuggestions()` and `getSuggestionConversation()`
- Users will see notifications when their suggestions are reviewed/implemented/declined

**Note:** Admin reply notifications are deferred to Phase 11 (Notification System Audit) where conversation notification hooks will be audited and extended.
