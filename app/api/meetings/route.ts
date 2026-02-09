import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMeetings, createMeeting } from '@/lib/api/meetings'
import type { CreateMeetingInput } from '@/lib/types/meetings'

/**
 * GET /api/meetings
 * List meetings with optional filters
 */
export async function GET(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query params
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || undefined
    const project_id = searchParams.get('project_id') || undefined
    const inquiry_id = searchParams.get('inquiry_id') || undefined
    const from = searchParams.get('from') || undefined
    const to = searchParams.get('to') || undefined
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined

    const meetings = await getMeetings({
      status,
      projectId: project_id,
      inquiryId: inquiry_id,
      from,
      to,
      limit,
    })

    return NextResponse.json(meetings)
  } catch (error) {
    console.error('GET /api/meetings error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch meetings' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/meetings
 * Create meeting and dispatch Recall.ai bot
 */
export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse body
    const body = await req.json() as CreateMeetingInput

    // Validate required fields
    if (!body.title || !body.meeting_url) {
      return NextResponse.json(
        { error: 'title and meeting_url are required' },
        { status: 400 }
      )
    }

    // Create meeting
    const result = await createMeeting(body, user.id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to create meeting' },
        { status: 400 }
      )
    }

    return NextResponse.json(result.data, { status: 201 })
  } catch (error) {
    console.error('POST /api/meetings error:', error)
    return NextResponse.json(
      { error: 'Failed to create meeting' },
      { status: 500 }
    )
  }
}
