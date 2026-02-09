import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { recall } from '@/lib/recall/client'
import { createNotification } from '@/lib/api/notifications'
import type { TranscriptSegment, MeetingAIExtraction, KeyDecision, MeetingTaskPriority } from '@/lib/types/meetings'

/**
 * AI Processing System Prompt for Meeting Analysis
 * Based on design doc AI Processing Prompt section
 */
const MEETING_ANALYSIS_SYSTEM_PROMPT = `You are analyzing a meeting transcript for a project management tool.

## Instructions
Extract the following as JSON:

1. "summary": Array of 3-5 bullet points (strings) capturing the key topics discussed
2. "tasks": Array of {title (string), description (string or null), assigned_to (name or null), due_date (ISO date string or null), priority ("low"|"normal"|"high"|"urgent")} — every action item, follow-up, commitment, or task mentioned in the meeting
3. "key_decisions": Array of {decision (string), context (string)}
4. "suggested_links": Array of {type: "project"|"inquiry", name (string), reason (string)} — suggest any Hexos projects/inquiries that seem relevant based on names, clients, or topics mentioned

Return valid JSON only.`

/**
 * Main orchestrator: fetches transcript from Recall.ai and processes with Claude
 */
export async function processMeetingTranscript(
  meetingId: string,
  botId: string
): Promise<void> {
  const supabase = createAdminClient()

  try {
    console.log(`[processMeetingTranscript] Starting for meeting ${meetingId}, bot ${botId}`)

    // 1. Fetch bot details from Recall.ai
    const botDetails = await recall.getBot(botId)

    // Extract media URLs
    const transcriptUrl = botDetails.media_shortcuts?.transcript?.download_url
    const recordingUrl = botDetails.media_shortcuts?.video?.download_url

    if (!transcriptUrl) {
      throw new Error('No transcript URL available from Recall.ai bot')
    }

    console.log(`[processMeetingTranscript] Fetching transcript from ${transcriptUrl}`)

    // 2. Download transcript JSON
    const transcriptResponse = await fetch(transcriptUrl)
    if (!transcriptResponse.ok) {
      throw new Error(`Failed to download transcript: ${transcriptResponse.statusText}`)
    }

    const rawTranscript = await transcriptResponse.json()

    // 3. Transform to our TranscriptSegment format
    const transcript: TranscriptSegment[] = transformRecallTranscript(rawTranscript)

    console.log(`[processMeetingTranscript] Transcript has ${transcript.length} segments`)

    // 4. Store raw transcript and recording URL
    await supabase
      .from('meetings')
      .update({
        transcript,
        recall_recording_url: recordingUrl || null,
      })
      .eq('id', meetingId)

    // 5. Fetch linked project/inquiry context
    const linkedContext = await fetchLinkedContext(meetingId)

    console.log(`[processMeetingTranscript] Linked context: ${linkedContext || 'None'}`)

    // 6. Call AI extraction
    const extraction = await extractMeetingData(transcript, linkedContext)

    console.log(`[processMeetingTranscript] AI extracted ${extraction.tasks.length} tasks, ${extraction.key_decisions.length} decisions`)

    // 7. Save AI results to meeting
    await supabase
      .from('meetings')
      .update({
        summary: extraction.summary.map(s => `- ${s}`).join('\n'), // Join array to markdown bullets
        key_decisions: extraction.key_decisions,
      })
      .eq('id', meetingId)

    // 8. Get meeting creator for task creation
    const { data: meeting } = await supabase
      .from('meetings')
      .select('created_by, title')
      .eq('id', meetingId)
      .single()

    if (!meeting) {
      throw new Error('Meeting not found after processing')
    }

    // 9. Create meeting_tasks from extracted tasks
    const tasksToInsert = extraction.tasks.map(task => ({
      meeting_id: meetingId,
      title: task.title,
      description: task.description || null,
      assigned_to_name: task.assigned_to || null,
      assigned_to_profile: null, // Will be matched in step 10
      due_date: task.due_date || null,
      priority: task.priority,
      status: 'pending' as const,
      source: 'ai_extracted' as const,
      created_by: meeting.created_by,
    }))

    let createdTasks: any[] = []
    if (tasksToInsert.length > 0) {
      const { data: insertedTasks, error: taskError } = await supabase
        .from('meeting_tasks')
        .insert(tasksToInsert)
        .select()

      if (taskError) {
        console.error('[processMeetingTranscript] Error creating tasks:', taskError)
        // Continue processing - don't fail the whole pipeline
      } else {
        createdTasks = insertedTasks || []
      }
    }

    // 10. Attempt profile matching for assigned_to names
    for (const task of createdTasks) {
      if (task.assigned_to_name) {
        await matchProfileByName(task.id, task.assigned_to_name)
      }
    }

    // 11. Create meeting_participants from transcript speakers
    await createParticipantsFromTranscript(meetingId, transcript)

    // 12. Update meeting status to 'ready'
    await supabase
      .from('meetings')
      .update({ status: 'ready' })
      .eq('id', meetingId)

    console.log(`[processMeetingTranscript] Meeting ${meetingId} processing complete`)

    // 13. Send push notification
    await createNotification({
      userId: meeting.created_by,
      type: 'meeting_ready',
      title: 'Meeting Notes Ready',
      message: `Notes for "${meeting.title}" are ready to review.`,
    })

    console.log(`[processMeetingTranscript] Notification sent to ${meeting.created_by}`)
  } catch (error) {
    console.error(`[processMeetingTranscript] Error processing meeting ${meetingId}:`, error)

    // Set meeting to failed status
    await supabase
      .from('meetings')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error during processing',
      })
      .eq('id', meetingId)

    // Don't re-throw - webhook already returned 200
  }
}

/**
 * AI extraction using OpenRouter + Claude
 */
export async function extractMeetingData(
  transcript: TranscriptSegment[],
  linkedContext: string
): Promise<MeetingAIExtraction> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY not configured')
  }

  // Build formatted transcript text
  const transcriptText = transcript
    .map(seg => `[${seg.speaker}]: ${seg.text}`)
    .join('\n\n')

  // Build user message with context
  let userMessage = `## Transcript\n${transcriptText}`

  if (linkedContext) {
    userMessage += `\n\n## Linked Projects\n${linkedContext}`
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://hexos.app',
      'X-Title': 'hexOS Meeting Assistant',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-3.5-haiku-20241022',
      messages: [
        { role: 'system', content: MEETING_ANALYSIS_SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[extractMeetingData] OpenRouter error:', response.status, errorText)
    throw new Error(`AI service error (${response.status})`)
  }

  const data = await response.json()

  // Parse Claude's response
  const messageContent = data.choices?.[0]?.message?.content

  if (!messageContent) {
    throw new Error('No content in AI response')
  }

  let extraction: MeetingAIExtraction
  try {
    extraction = JSON.parse(messageContent)
  } catch (parseError) {
    console.error('[extractMeetingData] Failed to parse AI response:', messageContent)
    throw new Error('Failed to parse AI response as JSON')
  }

  // Validate and normalize
  return {
    summary: Array.isArray(extraction.summary) ? extraction.summary : [],
    tasks: Array.isArray(extraction.tasks) ? extraction.tasks.map(normalizeTask) : [],
    key_decisions: Array.isArray(extraction.key_decisions) ? extraction.key_decisions : [],
    suggested_links: Array.isArray(extraction.suggested_links) ? extraction.suggested_links : [],
  }
}

/**
 * Transform Recall.ai transcript format to our TranscriptSegment format
 */
function transformRecallTranscript(rawTranscript: any): TranscriptSegment[] {
  // Recall.ai transcript structure varies, but typically has a words array or segments
  // Handle common formats
  if (Array.isArray(rawTranscript)) {
    // Array of segments
    return rawTranscript.map((seg: any) => ({
      speaker: seg.speaker || seg.speaker_name || 'Unknown',
      text: seg.text || seg.content || '',
      start_time: seg.start_time || seg.start || 0,
      end_time: seg.end_time || seg.end || 0,
    }))
  }

  if (rawTranscript.words && Array.isArray(rawTranscript.words)) {
    // Word-level transcript - group by speaker
    const segments: TranscriptSegment[] = []
    let currentSegment: TranscriptSegment | null = null

    for (const word of rawTranscript.words) {
      const speaker = word.speaker || 'Unknown'
      const text = word.word || word.text || ''
      const startTime = word.start_timestamp || word.start || 0
      const endTime = word.end_timestamp || word.end || 0

      if (!currentSegment || currentSegment.speaker !== speaker) {
        // Start new segment
        if (currentSegment) {
          segments.push(currentSegment)
        }
        currentSegment = {
          speaker,
          text,
          start_time: startTime,
          end_time: endTime,
        }
      } else {
        // Append to current segment
        currentSegment.text += ' ' + text
        currentSegment.end_time = endTime
      }
    }

    if (currentSegment) {
      segments.push(currentSegment)
    }

    return segments
  }

  // Fallback: empty transcript
  console.warn('[transformRecallTranscript] Unknown transcript format, returning empty')
  return []
}

/**
 * Fetch linked project/inquiry names for AI context
 */
async function fetchLinkedContext(meetingId: string): Promise<string> {
  const supabase = createAdminClient()

  const { data: links } = await supabase
    .from('meeting_links')
    .select('linkable_type, linkable_id')
    .eq('meeting_id', meetingId)

  if (!links || links.length === 0) {
    return ''
  }

  const contextParts: string[] = []

  for (const link of links) {
    if (link.linkable_type === 'project') {
      const { data: project } = await supabase
        .from('projects')
        .select('project_name, description')
        .eq('id', link.linkable_id)
        .single()

      if (project) {
        contextParts.push(`Project: ${project.project_name}${project.description ? ` - ${project.description}` : ''}`)
      }
    } else if (link.linkable_type === 'inquiry') {
      const { data: inquiry } = await supabase
        .from('inquiries')
        .select('title, description')
        .eq('id', link.linkable_id)
        .single()

      if (inquiry) {
        contextParts.push(`Inquiry: ${inquiry.title}${inquiry.description ? ` - ${inquiry.description}` : ''}`)
      }
    }
  }

  return contextParts.join('\n')
}

/**
 * Attempt to match assigned_to name against profiles table
 */
async function matchProfileByName(taskId: string, assignedToName: string): Promise<void> {
  const supabase = createAdminClient()

  // Try case-insensitive ILIKE match on profiles.name
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id')
    .ilike('name', assignedToName)
    .limit(1)

  if (profiles && profiles.length > 0) {
    await supabase
      .from('meeting_tasks')
      .update({ assigned_to_profile: profiles[0].id })
      .eq('id', taskId)

    console.log(`[matchProfileByName] Matched "${assignedToName}" to profile ${profiles[0].id}`)
  } else {
    console.log(`[matchProfileByName] No profile match for "${assignedToName}"`)
  }
}

/**
 * Create meeting_participants from unique speakers in transcript
 */
async function createParticipantsFromTranscript(
  meetingId: string,
  transcript: TranscriptSegment[]
): Promise<void> {
  const supabase = createAdminClient()

  // Get unique speakers
  const uniqueSpeakers = Array.from(new Set(transcript.map(seg => seg.speaker)))

  const participantsToInsert = uniqueSpeakers.map(speaker => ({
    meeting_id: meetingId,
    display_name: speaker,
    email: null,
    profile_id: null,
    speaker_label: speaker,
  }))

  if (participantsToInsert.length > 0) {
    const { error } = await supabase
      .from('meeting_participants')
      .insert(participantsToInsert)

    if (error) {
      console.error('[createParticipantsFromTranscript] Error creating participants:', error)
      // Don't throw - this is non-critical
    } else {
      console.log(`[createParticipantsFromTranscript] Created ${participantsToInsert.length} participants`)
    }
  }
}

/**
 * Normalize task priority to valid enum value
 */
function normalizeTask(task: any): {
  title: string
  description: string | null
  assigned_to: string | null
  due_date: string | null
  priority: MeetingTaskPriority
} {
  let priority: MeetingTaskPriority = 'normal'

  if (task.priority) {
    const p = task.priority.toLowerCase()
    if (['low', 'normal', 'high', 'urgent'].includes(p)) {
      priority = p as MeetingTaskPriority
    }
  }

  return {
    title: task.title || 'Untitled Task',
    description: task.description || null,
    assigned_to: task.assigned_to || null,
    due_date: task.due_date || null,
    priority,
  }
}
