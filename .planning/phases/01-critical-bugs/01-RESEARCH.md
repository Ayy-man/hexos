# Phase 01: Critical Bugs - Storage & Server Actions - Research

**Researched:** 2026-01-19
**Domain:** Supabase Storage RLS, Next.js Server Actions, OpenRouter AI
**Confidence:** HIGH

## Summary

This research investigates three blocking production bugs:

1. **Storage RLS 403 errors** - The `general-purpose` bucket has NO RLS policies configured, causing all uploads to fail for authenticated users. The `payout-invoices` bucket shows the correct pattern.

2. **Server action error hiding** - Next.js production builds strip error details from server components, showing only generic messages. The `parseDeliverablesWithAI` function errors are swallowed without proper feedback.

3. **OpenRouter tool call parsing** - The deliverable extraction uses OpenRouter's function calling correctly, but lacks defensive error handling for malformed AI responses.

**Primary recommendation:** Create a migration to add RLS policies to the `general-purpose` storage bucket following the same pattern as `payout-invoices`, then add comprehensive error logging to the AI parsing function.

## Standard Stack

The project already uses the correct stack for these problems:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | 2.89.0 | Database + Storage client | Official SDK |
| `@supabase/ssr` | 0.8.0 | Server-side Supabase client | Next.js App Router support |
| Next.js Server Actions | 16.x | Server-side mutations | Built-in, secure by default |
| OpenRouter API | v1 | AI completions with tools | Multi-model routing |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `sonner` | (installed) | Toast notifications | User feedback on errors |

## Architecture Patterns

### Storage RLS Pattern (from working payout-invoices bucket)

```sql
-- Source: supabase/migrations/20260109000015_payouts_dev_workflow.sql

-- Create bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('bucket-name', 'bucket-name', true)  -- public=true for public URL access
ON CONFLICT (id) DO NOTHING;

-- Upload policy: authenticated users can upload to their folder
CREATE POLICY "Users upload to own folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'bucket-name'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Read policy: users can read their own files, admins can read all
CREATE POLICY "Users view own files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'bucket-name'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'internal')
      )
    )
  );

-- Admin full access
CREATE POLICY "Admins manage all files" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'bucket-name'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'internal')
    )
  );
```

### Server Action Error Pattern

```typescript
// Source: Next.js 15 docs + project conventions

// BAD: Error details lost in production
export async function myAction() {
  try {
    const result = await riskyOperation()
    return result
  } catch (error) {
    console.error('Operation failed:', error)
    throw error  // Generic "An error occurred" in production
  }
}

// GOOD: Return structured result with error info
export async function myAction(): Promise<{ data?: T; error?: string }> {
  try {
    const result = await riskyOperation()
    return { data: result }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[myAction] Error:', message, error)
    return { error: message }
  }
}
```

### OpenRouter Tool Call Pattern

```typescript
// Source: Current deliverableActions.ts + OpenRouter docs

const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://hexos.app',
    'X-Title': 'App Name',
  },
  body: JSON.stringify({
    model: 'anthropic/claude-3.5-haiku',
    messages: [...],
    tools: [{
      type: 'function',
      function: {
        name: 'my_function',
        description: '...',
        parameters: { type: 'object', properties: {...} },
      },
    }],
    tool_choice: { type: 'function', function: { name: 'my_function' } },
  }),
})

// Handle response
const data = await response.json()
const toolCall = data.choices?.[0]?.message?.tool_calls?.[0]

// Defensive parsing
if (!toolCall || toolCall.function.name !== 'my_function') {
  throw new Error('AI did not return expected tool call')
}

let parsed
try {
  parsed = JSON.parse(toolCall.function.arguments)
} catch {
  throw new Error('Failed to parse AI response')
}
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Storage auth | Custom auth middleware | Supabase RLS policies | Database-level security, consistent across clients |
| Error serialization | Custom error classes | Structured return objects | Works across server/client boundary |
| AI response validation | Manual JSON parsing | Try-catch + null checks | AI responses are unpredictable |

## Common Pitfalls

### Pitfall 1: Missing Storage RLS Policies

**What goes wrong:** Uploads fail with 403 `row violates row-level security policy` even for authenticated users.

**Why it happens:** Supabase Storage requires explicit RLS policies on `storage.objects` table. Unlike database tables which might have permissive defaults, storage starts with deny-all.

**How to avoid:**
1. Always create RLS policies when creating buckets
2. Use `storage.foldername(name)[1]` to check folder ownership
3. Grant INSERT for uploads, SELECT for reads, ALL for admin management

**Warning signs:**
- "StorageApiError: new row violates row-level security policy"
- Upload works with service role key but not anon key

### Pitfall 2: Production Error Scrubbing in Server Actions

**What goes wrong:** Errors show as "An error occurred in the Server Components render" in production, hiding the actual cause.

**Why it happens:** Next.js intentionally scrubs server-side error details in production to prevent leaking sensitive information.

**How to avoid:**
1. Return errors as structured data, not thrown exceptions
2. Log detailed errors server-side before returning generic message
3. Use `digest` property to correlate production errors with server logs

**Warning signs:**
- Works in dev, fails silently in prod
- Toast shows generic error but console.error has details

### Pitfall 3: Null/Undefined in AI Tool Call Responses

**What goes wrong:** `JSON.parse(toolCall.function.arguments)` throws when AI response is malformed.

**Why it happens:** AI models can return unexpected structures, empty arguments, or no tool call at all.

**How to avoid:**
1. Check `response.ok` before parsing
2. Verify `tool_calls` array exists and has expected structure
3. Wrap `JSON.parse` in try-catch
4. Validate parsed structure matches expected schema

**Warning signs:**
- Intermittent failures with same input
- "Cannot read property of undefined" errors
- Empty deliverables array when there should be items

### Pitfall 4: Recursive RLS (Project-Specific)

**What goes wrong:** Database becomes unresponsive and crashes.

**Why it happens:** RLS functions that query the same table they protect create infinite loops.

**How to avoid:**
1. NEVER create functions that query the table being protected
2. Pass column values as parameters, don't look them up by ID
3. See `docs/DATABASE_RECOVERY_2026-01-05.md` for full guidelines

**Warning signs:**
- Database shows "Unhealthy" in Supabase dashboard
- Queries timeout indefinitely
- App becomes extremely slow

## Code Examples

### General-Purpose Bucket RLS Policy (Recommended Fix)

```sql
-- Source: Pattern from 20260109000015_payouts_dev_workflow.sql
-- Adapted for general-purpose bucket

-- Bucket already exists, ensure it's public for URL access
UPDATE storage.buckets
SET public = true
WHERE id = 'general-purpose';

-- Policy 1: Authenticated users can upload to organized folder paths
-- Covers: case-studies/*, suggestions/{user_id}/*, avatars/*, dfy-logos/*, editor-images/*, project-files/*
DROP POLICY IF EXISTS "Authenticated users upload to general-purpose" ON storage.objects;
CREATE POLICY "Authenticated users upload to general-purpose" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'general-purpose');

-- Policy 2: Anyone can read public bucket files (bucket is public)
DROP POLICY IF EXISTS "Public read access for general-purpose" ON storage.objects;
CREATE POLICY "Public read access for general-purpose" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'general-purpose');

-- Policy 3: Authenticated users can update their uploads
DROP POLICY IF EXISTS "Authenticated users update in general-purpose" ON storage.objects;
CREATE POLICY "Authenticated users update in general-purpose" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'general-purpose');

-- Policy 4: Admin/Internal can delete any file
DROP POLICY IF EXISTS "Admins delete from general-purpose" ON storage.objects;
CREATE POLICY "Admins delete from general-purpose" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'general-purpose'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'internal')
    )
  );
```

### Improved Server Action Error Handling

```typescript
// In features/inquiries/actions/deliverableActions.ts

export async function triggerParseDeliverablesAction(
  inquiryId: string,
  proposalContent: unknown
): Promise<{ deliverables?: ProposalDeliverable[]; error?: string }> {
  console.log('[triggerParse] Starting for inquiry:', inquiryId)

  try {
    // Update status to parsing
    await updateDeliverablesStatus(inquiryId, 'parsing')

    const parsedDeliverables = await parseDeliverablesWithAI(proposalContent)

    if (!parsedDeliverables.length) {
      console.log('[triggerParse] No deliverables found in proposal')
      await updateDeliverablesStatus(inquiryId, 'none')
      revalidatePath(`/inquiries/${inquiryId}`)
      return { deliverables: [] }
    }

    const deliverables = await bulkCreateDeliverablesFromAI(
      inquiryId,
      parsedDeliverables
    )

    await updateDeliverablesStatus(inquiryId, 'dfy_editing')
    revalidatePath(`/inquiries/${inquiryId}`)

    return { deliverables }
  } catch (error) {
    // Log full error for debugging
    console.error('[triggerParse] Error:', {
      inquiryId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })

    // Reset status on error
    await updateDeliverablesStatus(inquiryId, 'none')

    // Return user-friendly error message
    const message = error instanceof Error ? error.message : 'Failed to extract deliverables'
    return { error: message }
  }
}
```

### Defensive AI Response Parsing

```typescript
async function parseDeliverablesWithAI(proposalContent: unknown): Promise<ParsedDeliverable[]> {
  // ... existing validation ...

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    // ... existing config ...
  })

  // Check HTTP status
  if (!response.ok) {
    const errorText = await response.text()
    console.error('[parseDeliverables] OpenRouter error:', response.status, errorText)
    throw new Error(`AI service error (${response.status})`)
  }

  const data = await response.json()

  // Log full response for debugging (remove in production)
  console.log('[parseDeliverables] Response structure:', {
    hasChoices: !!data.choices,
    choicesLength: data.choices?.length,
    hasMessage: !!data.choices?.[0]?.message,
    hasToolCalls: !!data.choices?.[0]?.message?.tool_calls,
  })

  // Defensive extraction
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0]
  if (!toolCall) {
    console.error('[parseDeliverables] No tool call in response:', JSON.stringify(data, null, 2))
    throw new Error('AI did not return structured deliverables')
  }

  if (toolCall.function?.name !== 'extracted_deliverables') {
    console.error('[parseDeliverables] Wrong function:', toolCall.function?.name)
    throw new Error('AI returned unexpected function call')
  }

  // Safe JSON parsing
  let parsed: { deliverables: ParsedDeliverable[] }
  try {
    const args = toolCall.function.arguments
    if (!args || typeof args !== 'string') {
      throw new Error('Arguments missing or not a string')
    }
    parsed = JSON.parse(args)
  } catch (parseErr) {
    console.error('[parseDeliverables] Parse error:', parseErr, 'Raw:', toolCall.function?.arguments)
    throw new Error('Failed to parse AI response')
  }

  // Validate structure
  if (!parsed.deliverables || !Array.isArray(parsed.deliverables)) {
    console.error('[parseDeliverables] Invalid structure:', parsed)
    throw new Error('AI response missing deliverables array')
  }

  return parsed.deliverables.filter(d => d.name && d.name.trim().length > 0)
}
```

## Specific Bug Fixes

### Bug 1: Case Study Cover Image Upload (RLS 403)

**Root Cause:** `general-purpose` bucket has no RLS policies.

**Current Code (lib/api/case-studies.ts):**
```typescript
const { data, error } = await supabase.storage
  .from('general-purpose')
  .upload(fileName, file, { cacheControl: '3600', upsert: false })
```

**Fix:** Add RLS policies via migration (see Code Examples above). No code changes needed.

**Upload path:** `case-studies/${Date.now()}.${fileExt}` - general path, not user-scoped.

### Bug 2: Suggestion Box Upload + Submit

**Root Cause:** Same as Bug 1 - missing RLS policies on `general-purpose` bucket.

**Current Code (lib/actions/suggestions.ts):**
```typescript
const fileName = `suggestions/${user.id}/${Date.now()}.${fileExt}`
// Upload to general-purpose bucket
```

**Fix:** Same migration fixes this. Path uses user folder which is good practice.

### Bug 3: DFY "Suggest Changes" Fails

**Root Cause:** Multiple potential issues:
1. Server action errors are hidden in production
2. AI parsing may fail silently
3. No user feedback mechanism for parsing errors

**Current Flow:**
1. `SuggestChangesButton.tsx` calls `onStartNegotiation()`
2. `boundStartNegotiation` calls `triggerParseDeliverablesAction(id, inquiry.proposal_content)`
3. `triggerParseDeliverablesAction` calls `parseDeliverablesWithAI(proposalContent)`
4. If AI fails, error is caught and thrown again
5. Toast shows "Failed to extract deliverables" but no details

**Fixes Needed:**
1. Return structured error instead of throwing
2. Add detailed logging at each step
3. Show specific error message to user
4. Handle empty proposal content gracefully

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Throwing errors in server actions | Returning structured results | Next.js 15 | Errors visible to users |
| Bucket-level public access | RLS policies on storage.objects | Supabase Storage v1 | Fine-grained control |
| Raw JSON.parse on AI | Defensive parsing with validation | AI reliability lessons | Fewer crashes |

## Open Questions

1. **User-specific folder enforcement:**
   - Current code: Case studies don't use user folders (`case-studies/${Date.now()}.${fileExt}`)
   - Question: Should case studies be user-scoped? (Answer: Probably not - admin feature)
   - Recommendation: Keep permissive INSERT policy for authenticated users

2. **Error detail level in production:**
   - Question: How much error detail is safe to show users?
   - Recommendation: Show specific AI errors ("No deliverables found", "AI service unavailable") but not stack traces

3. **AI rate limits:**
   - OpenRouter may rate limit
   - Current code handles 429 status
   - Recommendation: Add retry logic with exponential backoff (future enhancement)

## Sources

### Primary (HIGH confidence)
- `supabase/migrations/20260109000015_payouts_dev_workflow.sql` - Working storage RLS pattern
- `docs/INCIDENT_2026-01-03_RLS_CRASH.md` - RLS safety rules
- `docs/DATABASE_RECOVERY_2026-01-05.md` - Safe function patterns
- [Supabase Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control) - Official docs

### Secondary (MEDIUM confidence)
- [Next.js Error Handling](https://nextjs.org/docs/app/getting-started/error-handling) - Official docs
- [OpenRouter Tool Calling](https://openrouter.ai/docs/guides/features/tool-calling) - Official docs

### Tertiary (LOW confidence)
- Community discussions on storage RLS patterns

## Metadata

**Confidence breakdown:**
- Storage RLS fix: HIGH - Pattern verified from working bucket in same codebase
- Server action errors: HIGH - Well-documented Next.js behavior
- AI parsing: MEDIUM - OpenRouter docs verified, but AI responses are inherently variable

**Research date:** 2026-01-19
**Valid until:** 2026-02-19 (30 days - stable patterns)
