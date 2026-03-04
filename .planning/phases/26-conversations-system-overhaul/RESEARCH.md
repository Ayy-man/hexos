# Phase 26 Research: Conversations System Overhaul

**Date:** 2026-03-04
**Researchers:** 6 parallel agents (visibility, UI/UX, API errors, inquiry comments, UX patterns, DFY roles)

---

## Root Causes Identified

### 1. DFY 500 Errors on Message Send
- `syncMessageToInquiryComment()` in `lib/api/conversations.ts:621-681` attempts to sync messages to `inquiry_comments` table
- RLS policy `inquiry_comments_dfy_insert` requires `submitted_by = auth.uid()` — DFY can only comment on inquiries they submitted
- If DFY messages in another user's inquiry conversation, RLS rejects → 500 error
- **Fix:** Nuke inquiry comments entirely (removes root cause)

### 2. DFY Sees All Conversation Types
- RLS (`can_access_conversation()`) correctly enforces: Workspace=admin/internal/dev, Partner=admin/internal/dfy, Project=all
- But UI shows all 3 tabs (Inbox/Projects/Inquiries) regardless of role
- `getAccessibleTypes()` exists in `ConversationTabs.tsx` but isn't used in `ConversationsView`
- DFY sees empty Workspace conversations they can't interact with
- **Fix:** Wire role-based tab filtering into ConversationsView

### 3. "No Messages Yet" Everywhere
- Conversations auto-created via DB triggers when projects are created
- `batchGetLastMessages()` returns null for empty conversations → falls through to "No messages yet"
- Working as designed, but UX is poor
- **Fix:** Context-aware empty states per conversation type

### 4. Weak Unread Indicators
- Only `UnreadBadge` (numeric) used; `UnreadDot` defined but unused
- No bold text treatment for unread conversations
- No distinction between "unread messages" and "@mentions"
- **Fix:** Tiered indicator system (bold + dot for unread, numeric badge for @mentions)

### 5. Inquiry Comments System (Dead Feature)
- ~2000+ lines across 12 files
- Bidirectional sync with conversations adds complexity
- Root cause of DFY 500 errors
- User decision: nuke entirely, revisit in hexOS 2.0

---

## Files Audit

### Files to DELETE
- `features/inquiries/components/CommentsSidebar.tsx` (~490 lines)
- `lib/api/inquiry-comments.ts` (~264 lines)

### Files to MODIFY (comment removal)
- `app/(dashboard)/inquiries/[id]/page.tsx` — remove comment fetching, bound actions, badge counts
- `features/inquiries/components/InquiryDocumentTab.tsx` — remove CommentsSidebar import/rendering
- `features/inquiries/components/FullscreenDocument.tsx` — remove comment props/rendering
- `features/inquiries/components/ProposalTab.tsx` — remove ProposalCommentsSidebar (~300 lines)
- `features/inquiries/actions/documentActions.ts` — remove 3 comment actions
- `features/inquiries/actions/proposalActions.ts` — remove 3 proposal comment actions
- `lib/api/conversations.ts` — remove syncMessageToInquiryComment()
- `lib/api/index.ts` — remove inquiry-comments export
- `features/admin/components/ComprehensiveMetricsDashboard.tsx` — remove comment stats
- `scripts/wipe-test-data.sql` — remove inquiry_comments truncate

### Files to MODIFY (UX improvements)
- `app/(dashboard)/conversations/ConversationsView.tsx` — role-based tab filtering, empty states
- `features/conversations/components/ConversationItem.tsx` — bold unread, "You:" prefix, tiered timestamps
- `features/conversations/components/ConversationList.tsx` — context-aware empty states
- `features/conversations/components/UnreadBadge.tsx` — already has UnreadDot (just unused)
- `lib/api/conversations.ts` — add mention_count to enrichment
- `lib/api/conversations.shared.ts` — add mention_count to Conversation type
- `app/(dashboard)/conversations/page.tsx` — pass userRole properly

---

## UX Research: Platform Patterns

### Tiered Unread Indicators (Slack/Discord pattern)
| Signal | Visual | When |
|--------|--------|------|
| Read | Normal text, muted color | No unread messages |
| Unread | **Bold text** + subtle dot | New messages, not @mentioned |
| @Mention/DM | **Bold text** + numeric badge | User was specifically mentioned |
| Muted | Dimmed text, no indicators (except @mention) | User muted conversation |

### Last Message Preview (Teams/WhatsApp pattern)
- DMs: no sender name (the conversation IS with that person)
- Group: `Sender: message...` truncated to ~50 chars
- Own message: `You: message...` prefix
- Attachments: paperclip icon or "Attachment" text

### Tiered Timestamps (WhatsApp/Telegram pattern)
| Timeframe | Display |
|-----------|---------|
| Today | `2:45 PM` |
| Yesterday | `Yesterday` |
| This week | `Tuesday` |
| This year | `Mar 4` |
| Older | `3/4/25` |

### Empty States
- Formula: [What's missing] + [Why] + [What to do]
- Conversation-type-specific welcome messages reinforcing visibility scope

---

## Database Considerations

### Inquiry Comments Table (to drop)
- New migration needed: `DROP TABLE IF EXISTS inquiry_comments CASCADE`
- Remove `synced_inquiry_comment_id` from messages table
- Remove `synced_message_id` concept
- Don't modify old migrations — create new one

### Mention Count Enrichment
- `message_mentions` table already exists
- Add `mention_count` alongside `unread_count` in `batchGetUnreadCounts()`
- Count messages where user is in `message_mentions` AND after `last_read_at`
