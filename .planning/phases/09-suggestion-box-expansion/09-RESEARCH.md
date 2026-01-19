# Phase 09: Suggestion Box Expansion - Research

**Researched:** 2026-01-19
**Domain:** Suggestion management system with conversation threads and notifications
**Confidence:** HIGH

## Summary

This phase expands the existing suggestion box feature for DFY (Done-For-You) and Dev users. The current implementation stores suggestions in a `suggestions` table with basic CRUD operations and admin-only list viewing. The goal is to create a full suggestion management experience with:

1. A dedicated suggestion list page for DFY/Dev users to view their own submissions
2. Per-suggestion conversation threads enabling back-and-forth with admins
3. Scoped notifications that don't pollute the general notification stream

The codebase already has mature implementations of all three underlying systems:
- **Suggestions table** with status workflow (new -> reviewed -> implemented/declined)
- **Conversation system** with multiple conversation types (project, workspace, partner, direct, inquiry)
- **Notification system** with typed notifications and push support

**Primary recommendation:** Extend the existing conversation system by adding a new `suggestion` conversation type, auto-created when a suggestion is submitted. This follows the established pattern used for inquiry conversations.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 15.x | Page routing and server components | Already in use |
| Supabase | 2.x | Database, RLS, realtime subscriptions | Already in use |
| React Server Actions | - | Form submissions and mutations | Pattern used throughout codebase |

### Supporting (Already in Codebase)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui | - | UI components (Card, Badge, Tabs, Dialog) | All UI elements |
| lucide-react | - | Icons | Suggestion status indicators |
| date-fns | - | Date formatting | Timestamps in list/thread views |
| @/features/conversations | - | Existing chat components | Reuse ChatPanel, MessageList, MessageInput |

### No New Dependencies Required
This feature can be built entirely with existing codebase patterns and libraries.

## Architecture Patterns

### Recommended Project Structure
```
features/
  suggestions/
    components/
      SuggestionsList.tsx          # Existing - enhance for user view
      SuggestionListPage.tsx       # New - full page component
      SuggestionDetailSheet.tsx    # New - sheet with conversation
      SuggestionStatusBadge.tsx    # New - reusable status indicator
    actions/
      suggestionActions.ts         # New - server actions
    hooks/
      use-suggestion-conversation.ts  # New - load conversation for suggestion

lib/
  api/
    suggestions.ts                 # Existing - add getMySuggestions, getOrCreateSuggestionConversation
  actions/
    suggestions.ts                 # Existing - may need updates

supabase/migrations/
  YYYYMMDD_suggestion_conversations.sql  # New - conversation type + trigger

app/(dashboard)/
  my-suggestions/                  # New route for DFY/Dev users
    page.tsx
```

### Pattern 1: Suggestion Conversation Type (Follow Inquiry Pattern)
**What:** Add `suggestion` as a new conversation_type enum value with auto-creation trigger
**When to use:** Every new suggestion needs a dedicated conversation thread
**Example:**
```sql
-- Source: Based on existing 20260103000002_conversations_dm_inquiry.sql pattern
ALTER TYPE conversation_type ADD VALUE IF NOT EXISTS 'suggestion';

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS suggestion_id UUID REFERENCES suggestions(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS conversations_suggestion_unique
  ON conversations(suggestion_id)
  WHERE suggestion_id IS NOT NULL;

-- Auto-create conversation when suggestion is created
CREATE OR REPLACE FUNCTION public.create_suggestion_conversation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO conversations (suggestion_id, type)
  VALUES (NEW.id, 'suggestion')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER suggestions_create_conversation
  AFTER INSERT ON suggestions
  FOR EACH ROW EXECUTE FUNCTION create_suggestion_conversation();
```

### Pattern 2: RLS for Suggestion Conversations
**What:** Extend can_access_conversation() to handle suggestion type
**When to use:** Users should only access conversations for their own suggestions, admins see all
**Example:**
```sql
-- Add to can_access_conversation() function
IF v_conv_type = 'suggestion' THEN
  RETURN EXISTS (
    SELECT 1 FROM suggestions s
    WHERE s.id = v_suggestion_id
      AND (
        -- Admin/internal can see all
        v_user_role IN ('admin', 'internal')
        -- Suggestion author
        OR s.user_id = v_user_id
      )
  );
END IF;
```

### Pattern 3: User Suggestion List Page
**What:** A dedicated page for DFY/Dev users showing their own suggestions
**When to use:** `requireRole(['dev', 'dfy'])` access
**Example:**
```typescript
// Source: Based on existing /app/(dashboard)/inquiries/page.tsx pattern
export default async function MySuggestionsPage() {
  await requireRole(['dev', 'dfy'])
  const suggestions = await getMySuggestions()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">My Suggestions</h1>
        <p className="text-muted-foreground">
          Track your submitted suggestions and communicate with the team
        </p>
      </div>

      <MySuggestionsList suggestions={suggestions} />
    </div>
  )
}
```

### Pattern 4: Scoped Notifications (Suggestion-Specific Type)
**What:** Add suggestion-specific notification types that appear in context
**When to use:** New messages on suggestion conversations, status changes
**Example:**
```typescript
// Add to notification_type enum
export type NotificationType =
  | ... // existing types
  | 'suggestion_reply'        // Admin replied to your suggestion
  | 'suggestion_status_change' // Suggestion status updated
```

### Anti-Patterns to Avoid
- **Creating a separate messaging system:** Reuse existing conversation infrastructure
- **Mixing suggestion notifications with general inbox:** Use distinct notification types for filtering
- **Polling for updates:** Use existing Supabase realtime subscriptions
- **Custom RLS logic:** Extend existing can_access_conversation() function

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Real-time messages | Custom WebSocket | `useMessagesRealtime` hook | Already handles subscriptions, refetch, optimistic updates |
| Message UI | Custom chat components | `ChatPanel`, `MessageList`, `MessageInput` | Battle-tested, handles reactions, mentions, attachments |
| Conversation list | Custom list component | `ConversationList` | Handles search, filtering, unread badges |
| Notifications | Custom notification system | Existing `createNotification()` | Handles push notifications, realtime |
| Status workflow | Custom state machine | Database enum + RLS | Simpler, consistent with existing patterns |

**Key insight:** The entire conversation and notification infrastructure already exists. This phase is primarily about connecting suggestions to existing systems.

## Common Pitfalls

### Pitfall 1: Forgetting RLS on Suggestion Conversations
**What goes wrong:** Users can see conversation threads for suggestions they didn't create
**Why it happens:** Only updating can_access_conversation() without testing
**How to avoid:** Add explicit tests for DFY user accessing own vs other's suggestions
**Warning signs:** User can see suggestion details/messages they shouldn't

### Pitfall 2: Notification Pollution
**What goes wrong:** Suggestion replies appear alongside critical project notifications
**Why it happens:** Using generic notification types like 'mention' or 'admin_comment'
**How to avoid:** Create dedicated `suggestion_reply` type, add filtering in notification UI
**Warning signs:** Users complaining about notification noise

### Pitfall 3: Missing Conversation Backfill
**What goes wrong:** Existing suggestions have no conversation threads
**Why it happens:** Only adding trigger for new suggestions
**How to avoid:** Include backfill SQL in migration (see inquiry migration pattern)
**Warning signs:** Old suggestions show "no conversation" error

### Pitfall 4: Duplicate Routes for Different Roles
**What goes wrong:** `/suggestions` shows admin view, need `/my-suggestions` for users
**Why it happens:** Not planning URL structure upfront
**How to avoid:** Keep `/suggestions` for admin, add `/my-suggestions` for DFY/Dev
**Warning signs:** Confusing navigation, role-based redirects needed

## Code Examples

Verified patterns from existing codebase:

### Get User's Own Suggestions (Already Exists)
```typescript
// Source: /Users/aymanbaig/Desktop/hexos-main/lib/api/suggestions.ts
export async function getMySuggestions(): Promise<Suggestion[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('suggestions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw new Error('Failed to fetch suggestions')
  return (data || []) as Suggestion[]
}
```

### Conversation Auto-Creation Pattern (From Inquiries)
```typescript
// Source: /Users/aymanbaig/Desktop/hexos-main/supabase/migrations/20260103000002_conversations_dm_inquiry.sql
CREATE OR REPLACE FUNCTION public.create_inquiry_conversation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO conversations (inquiry_id, type)
  VALUES (NEW.id, 'inquiry')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER inquiries_create_conversation
  AFTER INSERT ON inquiries
  FOR EACH ROW EXECUTE FUNCTION create_inquiry_conversation();
```

### Loading Conversation for Entity
```typescript
// Pattern: Get or create conversation for a suggestion
export async function getSuggestionConversation(suggestionId: string): Promise<Conversation | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('suggestion_id', suggestionId)
    .eq('type', 'suggestion')
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  return data
}
```

### Notification Creation for Suggestion Events
```typescript
// Source: Based on /Users/aymanbaig/Desktop/hexos-main/lib/api/notifications.ts
export async function notifySuggestionReply(
  suggestionUserId: string,
  suggestionTitle: string,
  actorId: string
): Promise<void> {
  await createNotification({
    userId: suggestionUserId,
    type: 'suggestion_reply',
    title: 'New reply on your suggestion',
    message: `Someone replied to "${suggestionTitle}"`,
    actorId,
  })
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Admin notes field only | Conversation threads | This phase | Full back-and-forth communication |
| Status changes without notification | Status change notifications | This phase | Users stay informed |
| Admin-only suggestion view | User can view own suggestions | This phase | Better user experience |

**Deprecated/outdated:**
- `admin_notes` field: Will be superseded by conversation thread, but keep for backward compatibility

## Open Questions

Things that couldn't be fully resolved:

1. **Should suggestion status changes auto-message?**
   - What we know: Notification will be sent
   - What's unclear: Should a system message also appear in the conversation thread?
   - Recommendation: Yes, add system message for status changes to keep conversation context

2. **Sidebar navigation for "My Suggestions"**
   - What we know: Current suggestion box is a sidebar dialog/trigger
   - What's unclear: Where should "My Suggestions" link appear?
   - Recommendation: Add to sidebar menu for DFY/Dev roles, near existing Suggestion Box button

3. **Image attachments in conversation vs original suggestion image**
   - What we know: Suggestions can have screenshot, conversations have attachments
   - What's unclear: How to handle the original suggestion image in thread context
   - Recommendation: Show original suggestion image at top of conversation thread as context

## Sources

### Primary (HIGH confidence)
- `/Users/aymanbaig/Desktop/hexos-main/lib/api/suggestions.ts` - Existing suggestion API
- `/Users/aymanbaig/Desktop/hexos-main/lib/api/conversations.ts` - Conversation system
- `/Users/aymanbaig/Desktop/hexos-main/supabase/migrations/20260103000002_conversations_dm_inquiry.sql` - Inquiry conversation pattern
- `/Users/aymanbaig/Desktop/hexos-main/features/conversations/components/ChatPanel.tsx` - Reusable chat component

### Secondary (MEDIUM confidence)
- `/Users/aymanbaig/Desktop/hexos-main/features/suggestions/components/SuggestionsList.tsx` - Current admin UI (will need user variant)

### Tertiary (LOW confidence)
- None - all findings verified from codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All components already exist in codebase
- Architecture: HIGH - Following established patterns (inquiry conversations)
- Pitfalls: HIGH - Based on actual codebase patterns and edge cases

**Research date:** 2026-01-19
**Valid until:** 2026-03-19 (60 days - stable internal patterns)
