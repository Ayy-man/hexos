# Phase 15: Meeting Assistant - Research

**Researched:** 2026-02-09
**Domain:** Meeting bot infrastructure, transcription APIs, webhook processing, CSV parsing
**Confidence:** HIGH

## Summary

Phase 15 implements an integrated meeting notetaker using Recall.ai's bot infrastructure. The bot joins Zoom/Google Meet/Teams calls, records audio/video, generates diarized transcripts, and uses Claude AI to extract structured meeting notes with tasks.

Research confirms all locked technical decisions are sound:
- **Recall.ai** provides robust bot infrastructure with pay-as-you-go pricing (~$0.70/meeting total cost)
- **OpenRouter + Claude** integration already exists in Hexos for AI processing
- **Webhook processing** follows established Hexos patterns (Stripe webhook as reference)
- **CSV parsing/generation** has a clear standard library (papaparse)

The implementation follows existing Hexos patterns closely: server action results with `{data?, error?}`, singleton client pattern for external services, manual type definitions, and feature module structure. Webhook processing should be async-first due to Vercel serverless constraints.

**Primary recommendation:** Build webhook processing pipeline to handle post-meeting AI extraction asynchronously. Use Svix library for webhook signature verification. Structure as feature module at `features/meetings/` following established patterns.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Recall.ai API | v1 | Meeting bot infrastructure, recording, transcription | Industry-leading meeting bot API, used by major companies, Svix-powered webhooks, SOC 2 Type II certified |
| OpenRouter | Latest | AI API gateway for Claude | Already integrated in Hexos (see `/api/generate-brief`, `/api/copilot`) |
| Supabase PostgreSQL | 2.89.0 | Database with RLS | Existing Hexos backend, JSONB support for transcript storage |
| papaparse | 5.x | CSV parsing and generation | Fastest in-browser CSV parser, RFC 4180 compliant, 700k weekly downloads |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| svix | Latest | Webhook signature verification | Required for Recall.ai Svix-based webhooks |
| react-papaparse | Latest | React wrapper for papaparse | Optional if building CSV upload UI components |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recall.ai | Fireflies/Fathom | Would require hosting own bot infrastructure, higher complexity, less reliable |
| papaparse | csv-parser/fast-csv | Lower performance, not browser-compatible, less battle-tested |

**Installation:**
```bash
npm install papaparse svix
npm install -D @types/papaparse
```

## Architecture Patterns

### Recommended Project Structure
```
features/meetings/
├── components/              # UI components
│   ├── meeting-list.tsx
│   ├── meeting-detail.tsx
│   ├── meeting-transcript.tsx
│   ├── task-list.tsx
│   ├── task-import-dialog.tsx
│   └── task-export-button.tsx
├── actions/                 # Server actions (CRUD operations)
│   ├── meetingActions.ts
│   └── taskActions.ts
├── lib/                     # Feature-specific utilities
│   ├── csv-utils.ts
│   └── types.ts
└── hooks/                   # Client hooks (optional)
    └── use-tasks.ts

lib/
├── recall/
│   └── client.ts           # Singleton Recall.ai client
└── api/
    ├── meetings.ts         # Meeting CRUD helpers
    └── meeting-tasks.ts    # Task CRUD helpers

app/api/
├── meetings/
│   └── route.ts            # POST /api/meetings - create meeting, dispatch bot
└── webhooks/
    └── recall/
        └── route.ts        # POST /api/webhooks/recall - process Recall.ai events
```

### Pattern 1: Recall.ai Client Singleton

**What:** Lazy-initialized Recall.ai client following the same pattern as Resend email client

**When to use:** All Recall.ai API calls (create bot, retrieve transcript, etc.)

**Example:**
```typescript
// lib/recall/client.ts
// Based on lib/email/resend.ts pattern

export const RECALL_API_BASE_URL =
  process.env.RECALL_REGION
    ? `https://${process.env.RECALL_REGION}.recall.ai/api/v1`
    : 'https://us-west-2.recall.ai/api/v1'

let recallClient: RecallClient | null = null

function getRecallClient(): RecallClient {
  if (!recallClient) {
    if (!process.env.RECALL_API_KEY) {
      throw new Error('RECALL_API_KEY is not set')
    }
    recallClient = new RecallClient({
      apiKey: process.env.RECALL_API_KEY,
      baseUrl: RECALL_API_BASE_URL
    })
  }
  return recallClient
}

export const recall = new Proxy({} as RecallClient, {
  get(_, prop) {
    return getRecallClient()[prop as keyof RecallClient]
  }
})
```

### Pattern 2: Webhook Processing Pipeline

**What:** Async processing after webhook receives `bot.done` event

**When to use:** When Recall.ai webhook delivers meeting end notification

**Example:**
```typescript
// app/api/webhooks/recall/route.ts
// Based on app/api/webhooks/stripe/route.ts pattern

export async function POST(req: NextRequest) {
  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get('svix-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  // Verify webhook with Svix
  let event: RecallWebhookEvent
  try {
    const wh = new Webhook(process.env.RECALL_WEBHOOK_SECRET!)
    event = wh.verify(body, {
      'svix-id': headersList.get('svix-id')!,
      'svix-timestamp': headersList.get('svix-timestamp')!,
      'svix-signature': signature,
    }) as RecallWebhookEvent
  } catch (err: any) {
    console.error('Recall webhook verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Process event
  switch (event.type) {
    case 'bot.done':
      // Update meeting status to 'processing'
      // Fetch transcript from Recall.ai
      // Call Claude via OpenRouter for AI extraction
      // Save results
      // Send notification
      break
    case 'bot.fatal':
      // Update meeting status to 'failed'
      break
  }

  return NextResponse.json({ received: true })
}
```

**CRITICAL:** Vercel serverless functions timeout at 60 seconds (10 seconds on Hobby). The webhook handler must:
1. Respond immediately with `{ received: true }`
2. Process AI extraction asynchronously (or accept that it may timeout and need retry)
3. Alternatively: Queue processing via external service (Inngest, etc.) if AI processing takes >30 seconds

### Pattern 3: Structured Server Action Returns

**What:** Return `{data?, error?}` instead of throwing errors

**When to use:** All server actions and API helpers

**Example:**
```typescript
// lib/api/meetings.ts
// Based on lib/api/invoices.ts pattern

export async function createMeeting(
  input: CreateMeetingInput
): Promise<{ success: boolean; data?: Meeting; error?: string }> {
  const supabase = createClient()

  // Validate meeting URL
  const platform = detectPlatform(input.meeting_url)
  if (!platform) {
    return { success: false, error: 'Invalid meeting URL' }
  }

  // Create meeting record
  const { data: meeting, error } = await supabase
    .from('meetings')
    .insert({
      title: input.title,
      meeting_url: input.meeting_url,
      platform,
      status: 'pending',
      created_by: user.id
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  // Dispatch Recall.ai bot
  try {
    const bot = await recall.createBot({
      meeting_url: input.meeting_url,
      bot_name: 'Hexos Notetaker',
      // ... config
    })

    await supabase
      .from('meetings')
      .update({
        recall_bot_id: bot.id,
        status: 'joining'
      })
      .eq('id', meeting.id)

    return { success: true, data: meeting }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
```

### Pattern 4: AI Processing with OpenRouter

**What:** Call Claude via OpenRouter for structured extraction

**When to use:** Extract summary, tasks, decisions from transcript

**Example:**
```typescript
// Based on app/api/generate-brief/route.ts pattern

const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://hexos.app',
    'X-Title': 'hexOS Meeting Assistant',
  },
  body: JSON.stringify({
    model: 'anthropic/claude-3.5-haiku',  // or sonnet for higher quality
    messages: [
      { role: 'system', content: MEETING_ANALYSIS_PROMPT },
      { role: 'user', content: `Transcript:\n${transcript}` }
    ],
    tools: [{
      type: 'function',
      function: {
        name: 'extract_meeting_data',
        parameters: {
          type: 'object',
          properties: {
            summary: { type: 'array', items: { type: 'string' } },
            tasks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  assigned_to: { type: 'string', nullable: true },
                  due_date: { type: 'string', nullable: true },
                  priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] }
                }
              }
            },
            key_decisions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  decision: { type: 'string' },
                  context: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }],
    tool_choice: { type: 'function', function: { name: 'extract_meeting_data' } }
  })
})
```

### Pattern 5: CSV Import/Export

**What:** Use papaparse for bidirectional CSV conversion

**When to use:** Task import/export endpoints

**Example:**
```typescript
// lib/meetings/csv-utils.ts

import Papa from 'papaparse'

export function generateTasksCSV(tasks: MeetingTask[]): string {
  const data = tasks.map(task => ({
    title: task.title,
    description: task.description || '',
    assigned_to: task.assigned_to_name || '',
    due_date: task.due_date || '',
    priority: task.priority,
    status: task.status,
    source: task.source,
    meeting_title: task.meeting?.title || '',
    project_name: task.project?.name || ''
  }))

  return Papa.unparse(data)
}

export function parseTasksCSV(csvText: string): {
  success: boolean
  tasks?: Array<{ title: string; description?: string; /* ... */ }>
  error?: string
} {
  const result = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.toLowerCase().trim()
  })

  if (result.errors.length > 0) {
    return { success: false, error: result.errors[0].message }
  }

  // Validate required fields
  const tasks = result.data.map((row: any) => {
    if (!row.title) {
      throw new Error('CSV must have a "title" column')
    }
    return {
      title: row.title,
      description: row.description || null,
      assigned_to: row.assigned_to || null,
      due_date: row.due_date || null,
      priority: row.priority || 'normal',
      status: row.status || 'pending'
    }
  })

  return { success: true, tasks }
}
```

### Anti-Patterns to Avoid

- **Don't use generated Supabase types**: Hexos uses manual type definitions in API layer for flexibility
- **Don't throw errors in server actions**: Return `{data?, error?}` for consistent error handling
- **Don't use raw body parsing in webhook without verification**: Always verify Svix signature first
- **Don't process long-running tasks synchronously in webhooks**: Return 200 quickly, process async

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV parsing with edge cases | Custom string.split() parser | papaparse | Handles quotes, newlines in fields, malformed data, RFC 4180 compliance |
| Webhook signature verification | Custom HMAC comparison | Svix SDK | Timing-safe comparison, automatic header parsing, production-tested |
| Meeting bot infrastructure | Custom Zoom/Meet/Teams integrations | Recall.ai API | Handles OAuth, bot provisioning, platform updates, compliance, recording storage |
| Transcript diarization | Custom speaker detection ML | Recall.ai built-in | Pre-trained models, multiple fallback strategies (speaker timeline + machine learning) |
| Background job processing | setTimeout/setInterval | Vercel serverless compatible: respond fast, process inline OR use external queue (Inngest) | Serverless timeout constraints require proper architecture |

**Key insight:** Meeting bot infrastructure is extraordinarily complex (OAuth flows, platform-specific quirks, recording storage, compliance). Recall.ai handles all of this. Building custom would be 6+ months of engineering work for inferior results.

## Common Pitfalls

### Pitfall 1: Webhook Timeout on Long AI Processing

**What goes wrong:** Claude API call takes 15-30 seconds to process transcript. Webhook handler times out before responding, causing Recall.ai to retry repeatedly.

**Why it happens:** Vercel serverless functions have 60-second timeout (10 on Hobby). Webhook must respond within timeout AND before Svix retry kicks in.

**How to avoid:**
1. **Option A (simple):** Accept inline processing risk, optimize for speed (use claude-3.5-haiku), respond after processing completes
2. **Option B (robust):** Respond immediately with 200, queue processing via Vercel's `unstable_after()` API (Next.js 15.1+) or external job queue

**Warning signs:**
- Webhook endpoint logs show multiple identical events
- Meetings stuck in "processing" status
- Vercel function execution logs show timeouts

### Pitfall 2: Transcript Speaker Matching

**What goes wrong:** AI extracts tasks with assigned names like "John", but meeting has 3 Johns. Or speaker labels are "Speaker 0", "Speaker 1" with no real names.

**Why it happens:** Recall.ai diarization strategy depends on how participants join:
- **Individual devices → Speaker Timeline Diarization → Real names** ✅
- **Shared device/conference room → Machine Diarization → Generic labels (Speaker 0, Speaker 1)** ⚠️

**How to avoid:**
1. Store both `assigned_to_name` (raw string from transcript) AND `assigned_to_profile` (matched UUID) separately
2. Show UI to manually match unmatched names to Hexos profiles
3. Match participant emails from Recall.ai API to Hexos profiles first, then use speaker labels to connect

**Warning signs:**
- Tasks show "Speaker 0" as assigned user
- Multiple people with same first name cause wrong assignments
- No profile match for task assignments

### Pitfall 3: CSV Import Data Validation

**What goes wrong:** User imports CSV with invalid data (future due dates, unknown status values, malformed emails), causing database constraint violations.

**Why it happens:** papaparse only parses structure, doesn't validate data semantics.

**How to avoid:**
1. Validate each row after parsing, before insertion
2. Return detailed error report: `{imported: 15, skipped: 3, errors: ["Row 5: Invalid priority 'super-high'"]}`
3. Use Zod schema validation on parsed CSV data

**Example:**
```typescript
const TaskImportSchema = z.object({
  title: z.string().min(1),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  status: z.enum(['pending', 'in_progress', 'done', 'cancelled']).default('pending'),
  due_date: z.string().date().optional()
})

const validated = result.data.map((row, i) => {
  try {
    return TaskImportSchema.parse(row)
  } catch (err) {
    errors.push(`Row ${i + 1}: ${err.message}`)
    return null
  }
}).filter(Boolean)
```

**Warning signs:**
- Import succeeds but no tasks created
- Database constraint errors in logs
- Users report "some tasks didn't import"

### Pitfall 4: Webhook Signature Verification with Body Parsing

**What goes wrong:** Webhook signature verification fails even with correct secret.

**Why it happens:** Framework middleware parses JSON body before verification, breaking HMAC signature which depends on exact raw bytes.

**How to avoid:**
1. Read request body as text with `await req.text()`, NOT `await req.json()`
2. Pass raw text to `wh.verify()`
3. Parse JSON AFTER verification succeeds

**Example (WRONG):**
```typescript
const body = await req.json()  // ❌ Body already parsed
const event = wh.verify(JSON.stringify(body), headers)  // ❌ Re-stringified doesn't match original
```

**Example (CORRECT):**
```typescript
const rawBody = await req.text()  // ✅ Raw bytes preserved
const event = wh.verify(rawBody, headers) as RecallEvent  // ✅ Verify raw
const parsed = JSON.parse(rawBody)  // ✅ Parse after verification
```

**Warning signs:**
- Webhook endpoint always returns 400 "Invalid signature"
- Works in testing with Svix CLI, fails in production
- Error: "signature verification failed"

### Pitfall 5: Forgetting Meeting → Project/Inquiry Links

**What goes wrong:** Meetings exist but have no context about which project they relate to. Tasks extracted have no project association.

**Why it happens:** Many-to-many linking via `meeting_links` table requires explicit creation, easily forgotten.

**How to avoid:**
1. Accept `links` array in POST /api/meetings request
2. Create `meeting_links` rows in same transaction as meeting creation
3. When AI suggests project links, show UI to confirm and create links
4. Add "Link to project" action in meeting detail view

**Warning signs:**
- Meetings list shows orphaned meetings with no project chips
- Tasks have no `project_id` even though meeting was about that project
- Users manually copy/paste meeting links into project notes

## Code Examples

Verified patterns from official sources:

### Creating a Recall.ai Bot

```typescript
// Source: https://docs.recall.ai/reference/bot_create

const bot = await fetch('https://us-west-2.recall.ai/api/v1/bot/', {
  method: 'POST',
  headers: {
    'Authorization': `Token ${process.env.RECALL_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    meeting_url: meetingUrl,
    bot_name: 'Hexos Notetaker',
    recording_config: {
      transcript: {
        provider: {
          meeting_captions: {}  // Use platform's built-in captions
        }
      }
    }
  })
})

const { id: botId } = await bot.json()
```

### Retrieving Transcript After Meeting

```typescript
// Source: https://docs.recall.ai/reference/bot_retrieve

const botData = await fetch(`https://us-west-2.recall.ai/api/v1/bot/${botId}/`, {
  headers: {
    'Authorization': `Token ${process.env.RECALL_API_KEY}`
  }
})

const bot = await botData.json()

// Get transcript download URL
const transcriptUrl = bot.media_shortcuts?.transcript?.download_url

if (transcriptUrl) {
  const transcriptData = await fetch(transcriptUrl)
  const transcript = await transcriptData.json()

  // transcript.data contains diarized segments:
  // [{ speaker: "John Smith", text: "...", start: 0.0, end: 5.2 }, ...]
}
```

### CSV Export in Next.js API Route

```typescript
// Source: https://www.papaparse.com/

export async function GET(req: NextRequest) {
  const tasks = await getMeetingTasks(/* filters */)

  const csv = Papa.unparse(tasks.map(t => ({
    title: t.title,
    description: t.description,
    assigned_to: t.assigned_to_name,
    due_date: t.due_date,
    status: t.status,
    priority: t.priority,
    meeting_title: t.meeting?.title,
    created_at: t.created_at
  })))

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="meeting-tasks-${new Date().toISOString().split('T')[0]}.csv"`
    }
  })
}
```

### Webhook Signature Verification with Svix

```typescript
// Source: https://docs.svix.com/receiving/verifying-payloads/how

import { Webhook } from 'svix'

const wh = new Webhook(process.env.RECALL_WEBHOOK_SECRET!)

const payload = await req.text()  // MUST be raw text
const headers = {
  'svix-id': req.headers.get('svix-id')!,
  'svix-timestamp': req.headers.get('svix-timestamp')!,
  'svix-signature': req.headers.get('svix-signature')!
}

try {
  const event = wh.verify(payload, headers)
  // event is now verified and safe to process
} catch (err) {
  return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
}
```

## Recall.ai API Specifics

### Authentication
- **Method:** API Key via `Authorization: Token YOUR_API_KEY` header
- **Storage:** Environment variable `RECALL_API_KEY`

### Base URLs (Regional)
- US West: `https://us-west-2.recall.ai/api/v1`
- US East: `https://us-east-1.recall.ai/api/v1`
- EU: `https://eu-central-1.recall.ai/api/v1`
- Japan: `https://ap-northeast-1.recall.ai/api/v1`

**Recommendation:** Use `us-west-2` (default) unless compliance requires specific region.

### Bot Configuration Options
- `bot_name` (string): Display name in meeting (default: "Meeting Notetaker")
- `join_at` (ISO datetime): Schedule bot to join later, or omit for immediate join
- `recording_config.transcript.provider`: `meeting_captions` (platform built-in, free, fast) OR third-party (Assembly AI, Deepgram, Rev for higher quality)
- `automatic_leave`: Auto-leave after X seconds of silence/waiting room

### Webhook Events (Svix-delivered)

| Event | When | Payload Fields |
|-------|------|----------------|
| `bot.joining_call` | Bot acknowledged join request | `data.bot.id`, `data.code` |
| `bot.in_waiting_room` | Bot in waiting room, needs admit | `data.bot.id` |
| `bot.recording_permission_denied` | Host denied recording | `data.sub_code` (reason) |
| `bot.in_call_recording` | Bot recording audio/video | `data.bot.id`, `data.bot.status.created_at` |
| `bot.call_ended` | Meeting ended, bot left | `data.sub_code` (why ended) |
| `bot.done` | **KEY EVENT** - Bot shutdown, media uploaded | `data.bot.id`, recordings available |
| `bot.fatal` | Bot crashed/failed | `data.code`, `data.sub_code`, `data.message` |

**Source:** [Recall.ai Bot Webhooks](https://docs.recall.ai/docs/bot-status-change-events)

### Transcript Format (Diarized)

```json
{
  "data": [
    {
      "speaker": "John Smith",      // Real name (if speaker timeline diarization)
      "speaker_id": "participant_xyz",
      "text": "Let's review the action items.",
      "start_time": 125.4,
      "end_time": 128.7,
      "words": [
        { "word": "Let's", "start": 125.4, "end": 125.6 },
        // ...
      ]
    },
    {
      "speaker": "Speaker 1",       // Generic label (if machine diarization)
      "text": "I'll take care of the database migration.",
      "start_time": 129.0,
      "end_time": 132.5
    }
  ]
}
```

**Sources:**
- [Recall.ai Diarization](https://docs.recall.ai/docs/diarization)
- [Meeting Caption Transcription](https://docs.recall.ai/docs/meeting-caption-transcription)

### Rate Limits
- Create Bot: 60 requests/min per workspace
- Retrieve Bot: 300 requests/min per workspace

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom Zoom SDK bots | Recall.ai universal API | 2023-2024 | Eliminates platform-specific code, handles all major platforms |
| Manual HMAC webhook verification | Svix SDK | 2024+ | Reduces security vulnerabilities, simpler implementation |
| csv-parser (Node streams) | papaparse (browser + server) | Ongoing | Universal library, works client-side for file upload UX |
| Throwing errors in server actions | Returning `{data, error}` objects | Next.js 13+ | Better TypeScript inference, clearer client error handling |
| Long polling for async jobs | `unstable_after()` API | Next.js 15.1 (Nov 2024) | Serverless-native background tasks without external services |

**Deprecated/outdated:**
- **csv-parse** (Node-only): Use papaparse for universal browser+server support
- **Custom transcript parsing**: Recall.ai provides structured JSON output, don't parse raw text
- **@vercel/edge**: Vercel Edge Runtime features now built into Next.js

## Open Questions

1. **Vercel timeout handling for AI processing**
   - What we know: Vercel Pro allows 60-second max, Hobby 10 seconds. Claude API typically responds in 10-20 seconds for transcript analysis.
   - What's unclear: Whether to use Next.js 15.1's `unstable_after()` or accept inline processing risk
   - Recommendation: Start with inline processing (respond after Claude completes). Monitor webhook retries. If timeouts occur, refactor to use `unstable_after()` or queue service

2. **Bot avatar customization**
   - What we know: Recall.ai supports custom bot avatars via "signed-in bots" or "output media" features
   - What's unclear: Exact API parameters for custom avatar URL in basic bot mode
   - Recommendation: Start with default bot (uses `bot_name` only). Custom avatar is V2 enhancement if needed

3. **Participant email matching**
   - What we know: Recall.ai provides participant list with emails via `/api/v1/participant_events/`
   - What's unclear: Whether participant emails are reliably present for all platforms (Zoom yes, Google Meet sometimes, Teams unclear)
   - Recommendation: Build profile matching as best-effort. Store both raw `display_name` and matched `profile_id`, allow manual matching in UI

## Sources

### Primary (HIGH confidence)
- [Recall.ai Getting Started](https://docs.recall.ai/docs/getting-started) - Authentication, API setup
- [Recall.ai Create Bot](https://docs.recall.ai/reference/bot_create) - Bot creation endpoint
- [Recall.ai Bot Webhooks](https://docs.recall.ai/docs/bot-status-change-events) - Event types
- [Recall.ai Webhook Configuration](https://docs.recall.ai/reference/webhooks-overview) - Svix setup
- [Recall.ai Diarization](https://docs.recall.ai/docs/diarization) - Transcript format
- [Svix Webhook Verification](https://docs.svix.com/receiving/verifying-payloads/how) - Signature verification
- [Papa Parse Documentation](https://www.papaparse.com/) - CSV parsing/generation

### Secondary (MEDIUM confidence)
- [Next.js Server Actions Error Handling (2026)](https://medium.com/@pawantripathi648/next-js-server-actions-error-handling-the-pattern-i-wish-i-knew-earlier-e717f28f2f75) - `{data, error}` pattern
- [Next.js 15.1 after() API](https://medium.com/@alamdar.hussain0007/the-after-api-in-next-js-15-1-a-game-changer-for-background-tasks-1a1ffd79684e) - Background processing
- [React-papaparse](https://react-papaparse.js.org/) - React wrapper for papaparse

### Tertiary (LOW confidence)
- Community discussions on Recall.ai webhook retry behavior - anecdotal, not officially documented

## Metadata

**Confidence breakdown:**
- Recall.ai API: HIGH - Official documentation verified, multiple sources cross-referenced
- Webhook processing: HIGH - Existing Hexos Stripe webhook provides reference implementation
- CSV parsing: HIGH - papaparse is de facto standard with extensive documentation
- OpenRouter integration: HIGH - Already implemented in Hexos codebase
- Async processing: MEDIUM - Next.js 15.1 `after()` API is new, production usage limited

**Research date:** 2026-02-09
**Valid until:** 2026-03-09 (30 days - Recall.ai API is stable, unlikely to change)
