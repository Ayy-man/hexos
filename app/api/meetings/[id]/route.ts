import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMeeting, updateMeeting, deleteMeeting } from '@/lib/api/meetings'

/**
 * GET /api/meetings/:id
 * Get meeting detail with links, participants, and tasks
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const meeting = await getMeeting(params.id)

    if (!meeting) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(meeting)
  } catch (error) {
    console.error('GET /api/meetings/:id error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch meeting' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/meetings/:id
 * Update meeting
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const body = await req.json()

    const result = await updateMeeting(params.id, body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update meeting' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PATCH /api/meetings/:id error:', error)
    return NextResponse.json(
      { error: 'Failed to update meeting' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/meetings/:id
 * Delete meeting
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const result = await deleteMeeting(params.id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to delete meeting' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/meetings/:id error:', error)
    return NextResponse.json(
      { error: 'Failed to delete meeting' },
      { status: 500 }
    )
  }
}
