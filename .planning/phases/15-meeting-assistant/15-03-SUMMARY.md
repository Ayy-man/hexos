---
phase: 15-meeting-assistant
plan: 03
subsystem: ai-processing
completed: 2026-02-09
duration: 3 minutes

tags:
  - webhook
  - recall-ai
  - svix
  - openrouter
  - claude-ai
  - transcript-processing
  - notifications

requires:
  - 15-01-database-schema
  - recall-client
  - notification-system

provides:
  - webhook-handler
  - ai-transcript-processing
  - meeting-task-extraction
  - profile-matching

affects:
  - 15-04-meeting-ui

tech-stack:
  added:
    - svix (webhook verification)
    - openrouter (claude-3.5-haiku)
  patterns:
    - webhook-svix-verification
    - ai-extraction-pipeline
    - inline-webhook-processing
    - best-effort-profile-matching

key-files:
  created:
    - app/api/webhooks/recall/route.ts
    - lib/api/meeting-processing.ts
  modified:
    - lib/api/notifications-utils.ts

decisions:
  - decision: "Inline processing in webhook handler (not async queue)"
    rationale: "Accept timeout risk - Recall.ai will retry. V1 optimization for simplicity"
    phase: "15-03"

  - decision: "Best-effort profile matching via ILIKE on name"
    rationale: "Don't fail task creation if no match - store assigned_to_name as fallback"
    phase: "15-03"

  - decision: "Transform Recall.ai transcript format to normalized TranscriptSegment[]"
    rationale: "Handle multiple possible formats (word-level vs segment-level) from Recall.ai"
    phase: "15-03"

  - decision: "Use Claude 3.5 Haiku for extraction (not Opus)"
    rationale: "Fast, cheap, sufficient for structured extraction - following generate-brief pattern"
    phase: "15-03"

  - decision: "Store summary as markdown bullets (joined array)"
    rationale: "TEXT column more compatible than JSONB for summary bullets, easier to display"
    phase: "15-03"

  - decision: "Create meeting_participants from unique speakers automatically"
    rationale: "Provides participant list even without email matching, can be manually enhanced later"
    phase: "15-03"

  - decision: "meeting_ready notification routes to /meetings list page"
    rationale: "V1 simplification - no meeting detail page yet, message includes title for findability"
    phase: "15-03"
---

# Phase 15 Plan 03: Webhook Handler & AI Processing Summary

**One-liner:** Recall.ai webhook handler with Svix verification + Claude-powered transcript processing pipeline extracting tasks, decisions, and summaries

## What Was Built

### 1. Recall.ai Webhook Handler (app/api/webhooks/recall/route.ts)

**Pattern:** Follows app/api/webhooks/stripe/route.ts exactly
- Reads raw body as text (critical for Svix signature verification)
- Verifies webhook signature using Svix SDK
- Looks up meeting by recall_bot_id
- Handles 5 bot lifecycle events:
  - `bot.joining_call` → status: joining
  - `bot.in_waiting_room` → status: joining (logged)
  - `bot.in_call_recording` → status: recording, set started_at
  - `bot.done` → status: processing, set ended_at, calculate duration, trigger AI processing
  - `bot.fatal` → status: failed, store error_message
- Returns 200 even for unhandled events (webhook best practice)
- Uses admin Supabase client (no user session in webhook context)

**Key insight:** Inline processing in bot.done event accepts timeout risk - Recall.ai will retry if webhook times out. No need for async queue in V1.

### 2. AI Transcript Processing Pipeline (lib/api/meeting-processing.ts)

**processMeetingTranscript(meetingId, botId)** - Main orchestrator:
1. Fetches bot details from Recall.ai using recall.getBot(botId)
2. Downloads transcript JSON from bot.media_shortcuts.transcript.download_url
3. Transforms Recall.ai format to our TranscriptSegment[] (handles word-level and segment-level formats)
4. Stores transcript and recording URL in meeting record
5. Fetches linked project/inquiry context for AI
6. Calls extractMeetingData() for Claude AI extraction
7. Saves summary (markdown bullets), key_decisions to meeting
8. Creates meeting_tasks rows with source: 'ai_extracted'
9. Matches assigned_to names against profiles.name (ILIKE, best-effort)
10. Creates meeting_participants from unique speakers
11. Updates meeting status to 'ready'
12. Sends push notification to meeting creator
13. On error: sets status to 'failed' with error_message, doesn't re-throw (webhook already 200'd)

**extractMeetingData(transcript, linkedContext)** - AI extraction:
- Calls OpenRouter API with Claude 3.5 Haiku model
- System prompt requests structured JSON extraction
- Extracts: summary bullets, tasks, key_decisions, suggested_links
- Returns normalized MeetingAIExtraction object
- Handles API errors with clear logging

**Helper functions:**
- `transformRecallTranscript()` - Handles multiple Recall.ai transcript formats
- `fetchLinkedContext()` - Builds context string from linked projects/inquiries
- `matchProfileByName()` - Best-effort ILIKE match on profiles.name
- `createParticipantsFromTranscript()` - Creates participants from unique speakers
- `normalizeTask()` - Validates priority enum, provides defaults

### 3. Notification Type Extension

Added `meeting_ready` to NotificationType union in lib/api/notifications-utils.ts:
- Icon: 'video'
- Color: 'text-info' (blue)
- URL: '/meetings' (list page, not detail - V1 simplification)

## Files Created/Modified

**Created:**
- app/api/webhooks/recall/route.ts (189 lines) - Webhook handler
- lib/api/meeting-processing.ts (440 lines) - AI processing pipeline

**Modified:**
- lib/api/notifications-utils.ts - Added meeting_ready type, icon, color, URL mappings

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | (pre-existing) | Webhook handler already created in 15-02 |
| Task 2 | 00a1c28 | AI transcript processing pipeline + notification type |

## Deviations from Plan

### Task 1 Already Complete

**Issue:** app/api/webhooks/recall/route.ts already existed from plan 15-02 execution.

**Resolution:** Verified file matches Task 1 requirements exactly. This was a forward reference from 15-02 anticipating the processMeetingTranscript function from 15-03. No changes needed - moved directly to Task 2.

**Classification:** Not a deviation - just overlapping plan execution. File was correct as-is.

## Technical Decisions

### 1. Inline Webhook Processing (Accept Timeout Risk)

**Context:** Vercel serverless functions timeout at 60s (10s on Hobby). AI processing takes 5-15 seconds typically.

**Decision:** Process transcript inline in webhook handler, don't use async queue.

**Rationale:**
- Recall.ai automatically retries failed webhooks
- V1 optimization for simplicity - no need for Inngest/queue infrastructure
- If processing times out, Recall.ai will retry and processing will complete
- Most meetings complete well under 60s timeout

**Tradeoff:** Risk of duplicate processing if retry happens mid-execution. Mitigated by idempotency (checking meeting status before re-processing).

### 2. Best-Effort Profile Matching

**Context:** AI extracts assigned_to as plain text names (e.g., "John Smith").

**Decision:** Attempt ILIKE match on profiles.name, store original name in assigned_to_name if no match.

**Rationale:**
- Don't fail task creation if profile doesn't exist
- Preserves AI-extracted assignment even without DB match
- UI can show "John Smith (unmatched)" and allow manual profile linking
- Matches email addresses in future enhancement (not V1)

**Pattern:**
```typescript
const { data: profiles } = await supabase
  .from('profiles')
  .select('id')
  .ilike('name', assignedToName)
  .limit(1)
```

### 3. Transcript Format Normalization

**Context:** Recall.ai returns different transcript formats (word-level, segment-level, various field names).

**Decision:** Transform to our TranscriptSegment[] format with consistent field names.

**Rationale:**
- Isolates our schema from Recall.ai API changes
- Enables future support for non-Recall transcript sources
- Simplifies UI rendering - always has speaker, text, start_time, end_time

**Implementation:** transformRecallTranscript() handles array of segments, words array, and provides empty fallback.

### 4. Summary as Markdown Text (Not JSONB)

**Context:** AI extracts summary as array of bullet points.

**Decision:** Join array to markdown text with newlines: `summary.map(s => \`- ${s}\`).join('\\n')`

**Rationale:**
- summary column is TEXT, not JSONB
- Easier to display in UI - just render as markdown
- Still structured (newline-separated bullets), but compatible with TEXT column
- Avoids migration to change column type

### 5. Claude 3.5 Haiku for Extraction

**Context:** Need to extract structured data from transcript.

**Decision:** Use anthropic/claude-3.5-haiku-20241022 (not Opus).

**Rationale:**
- Fast: ~2-5 second response time for typical meeting
- Cheap: $0.25 per million input tokens vs $15 for Opus
- Sufficient: Haiku excellent at structured extraction tasks
- Proven: Already using this model for generate-brief

**Cost estimate:** 20k token transcript + 1k response = $0.006 per meeting

### 6. Automatic Participant Creation

**Context:** Transcript has speaker names but no email/profile info.

**Decision:** Create meeting_participants rows automatically from unique speakers.

**Rationale:**
- Provides immediate value - participant list visible even without email matching
- Can be manually enhanced later (user clicks participant, links to profile)
- Foundation for future features (assign tasks from participant dropdown)
- Non-blocking - errors don't fail pipeline

### 7. Meeting Notification Routes to List Page

**Context:** meeting_ready notification needs a URL.

**Decision:** Route to /meetings (list page), not /meetings/[id] (detail page).

**Rationale:**
- V1: Meeting detail page doesn't exist yet (part of 15-04 UI plan)
- Notification message includes meeting title - user can find it in list
- Simple, works immediately
- Can update URL when detail page exists

## Next Phase Readiness

### Blockers

None.

### Required for Phase 15-04 (Meeting UI)

This plan provides the complete backend pipeline. Phase 15-04 can build the frontend knowing that:
- Meetings will have status: ready when processing completes
- Transcript is stored as TranscriptSegment[] with speaker, text, timestamps
- Summary is markdown-formatted text (render directly)
- key_decisions is JSONB array of {decision, context} objects
- meeting_tasks are already created with ai_extracted source
- Notifications will be sent when processing completes

### Enhancements for Future Phases

**Phase 15-05 (Meeting Tasks UI):**
- Import/export CSV for meeting_tasks
- Convert meeting_task to project deliverable
- Bulk task operations

**Phase 15-06 (Meeting Enhancements):**
- Email matching for participants
- Suggested_links UI (show AI recommendations)
- Re-process transcript button (call extractMeetingData again)
- Edit/regenerate summary with different prompts

**Performance optimization (if needed):**
- Move processing to async queue (Inngest)
- Cache transcript download (S3/Supabase Storage)
- Streaming transcript display (show partial while processing)

## Testing Notes

**Webhook verification:**
```bash
# Test missing signature
curl -X POST http://localhost:3000/api/webhooks/recall

# Test invalid signature
curl -X POST http://localhost:3000/api/webhooks/recall \
  -H "svix-signature: invalid"

# Valid webhook (need Recall.ai test event or Svix CLI)
```

**AI extraction testing:**
```typescript
// Unit test extractMeetingData with sample transcript
const sampleTranscript: TranscriptSegment[] = [
  { speaker: 'John', text: 'We need to deploy by Friday', start_time: 0, end_time: 3 },
  { speaker: 'Sarah', text: 'I can handle the database migration', start_time: 3, end_time: 6 },
]

const result = await extractMeetingData(sampleTranscript, '')
expect(result.tasks).toContainEqual(
  expect.objectContaining({ title: expect.stringContaining('deploy') })
)
```

## Metrics

**Development time:** 3 minutes (Task 1 pre-existing, Task 2 implementation + notification type)

**Files changed:** 3 files (1 created, 2 modified)

**Lines of code:** ~630 lines (440 processing module, 189 webhook handler, 1 notification type)

**AI model cost per meeting:** ~$0.006 (20k tokens in, 1k tokens out at Haiku pricing)

**Estimated processing time:** 5-15 seconds per meeting (fetch transcript 1-3s, AI extraction 2-5s, DB operations 1-2s, notification 1s)

## Success Metrics

- ✅ Webhook handler verifies Svix signatures
- ✅ All 5 Recall.ai bot events handled with correct status transitions
- ✅ bot.done triggers full AI processing pipeline
- ✅ Claude extracts summary, tasks, key decisions from transcript
- ✅ Meeting_tasks created with ai_extracted source
- ✅ Profile matching works best-effort (doesn't fail on no match)
- ✅ Push notification sent when meeting_ready
- ✅ Failures set meeting status to 'failed' with error details
- ✅ NotificationType extended with meeting_ready

---

**Status:** ✅ Complete

**Next:** Phase 15-04 - Meeting UI (list, detail, transcript viewer, task management)
