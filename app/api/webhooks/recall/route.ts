import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { Webhook } from 'svix'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { processMeetingTranscript } from '@/lib/api/meeting-processing'

/**
 * POST /api/webhooks/recall
 * Handle Recall.ai webhook events
 *
 * Events handled:
 * - bot.joining_call - Bot is joining the meeting
 * - bot.in_waiting_room - Bot is in waiting room
 * - bot.in_call_recording - Bot is actively recording
 * - bot.done - Recording complete, triggers transcript processing
 * - bot.fatal - Bot encountered a fatal error
 *
 * Requires RECALL_WEBHOOK_SECRET environment variable for Svix signature verification
 * Dependencies: svix package (installed via pnpm)
 */

interface RecallWebhookEvent {
  event: string
  data: {
    bot_id: string
    status?: {
      code: string
      sub_code?: string
    }
    [key: string]: unknown
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const headersList = await headers()

  const svixId = headersList.get('svix-id')
  const svixTimestamp = headersList.get('svix-timestamp')
  const svixSignature = headersList.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    console.error('Recall webhook: Missing Svix headers')
    return NextResponse.json({ error: 'Missing signature headers' }, { status: 400 })
  }

  if (!process.env.RECALL_WEBHOOK_SECRET) {
    console.error('Recall webhook: RECALL_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  let event: RecallWebhookEvent

  try {
    const wh = new Webhook(process.env.RECALL_WEBHOOK_SECRET)
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as RecallWebhookEvent
  } catch (err: any) {
    console.error('Recall webhook signature verification failed:', err.message)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  const botId = event.data.bot_id
  if (!botId) {
    console.error('Recall webhook: Missing bot_id in event data')
    return NextResponse.json({ error: 'Missing bot_id' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()

    // Look up meeting by bot ID
    const { data: meeting, error: lookupError } = await supabase
      .from('meetings')
      .select('id, created_by')
      .eq('recall_bot_id', botId)
      .single()

    if (lookupError || !meeting) {
      console.warn(`Recall webhook: No meeting found for bot ${botId}`)
      // Still return 200 to prevent Recall.ai from retrying
      return NextResponse.json({ received: true, warning: 'Meeting not found' })
    }

    const meetingId = meeting.id

    // Handle different event types
    switch (event.event) {
      case 'bot.joining_call': {
        await supabase
          .from('meetings')
          .update({ status: 'joining' })
          .eq('id', meetingId)

        console.log(`Meeting ${meetingId}: Bot joining call`)
        break
      }

      case 'bot.in_waiting_room': {
        // Status remains 'joining' - just log
        console.log(`Meeting ${meetingId}: Bot in waiting room`)
        break
      }

      case 'bot.in_call_recording': {
        await supabase
          .from('meetings')
          .update({
            status: 'recording',
            started_at: new Date().toISOString(),
          })
          .eq('id', meetingId)

        console.log(`Meeting ${meetingId}: Recording started`)
        break
      }

      case 'bot.done': {
        const now = new Date().toISOString()

        // Update to processing status and set ended_at
        const { data: updatedMeeting } = await supabase
          .from('meetings')
          .update({
            status: 'processing',
            ended_at: now,
          })
          .eq('id', meetingId)
          .select('started_at, ended_at')
          .single()

        // Calculate duration if we have both timestamps
        if (updatedMeeting?.started_at && updatedMeeting?.ended_at) {
          const startMs = new Date(updatedMeeting.started_at).getTime()
          const endMs = new Date(updatedMeeting.ended_at).getTime()
          const durationSeconds = Math.floor((endMs - startMs) / 1000)

          await supabase
            .from('meetings')
            .update({ duration_seconds: durationSeconds })
            .eq('id', meetingId)
        }

        console.log(`Meeting ${meetingId}: Recording complete, starting processing`)

        // Process transcript inline (per research: accept timeout risk, Recall.ai will retry)
        await processMeetingTranscript(meetingId, botId)

        break
      }

      case 'bot.fatal': {
        const errorCode = event.data.status?.code || 'unknown'
        const errorSubCode = event.data.status?.sub_code || ''
        const errorMessage = `Bot failed: ${errorCode}${errorSubCode ? ` (${errorSubCode})` : ''}`

        await supabase
          .from('meetings')
          .update({
            status: 'failed',
            error_message: errorMessage,
          })
          .eq('id', meetingId)

        console.error(`Meeting ${meetingId}: ${errorMessage}`)
        break
      }

      default:
        // Unhandled event types are silently logged
        console.log(`Recall webhook: Unhandled event type ${event.event} for meeting ${meetingId}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Recall webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
