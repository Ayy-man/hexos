import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { addMeetingLink, removeMeetingLink } from '@/lib/api/meetings'
import type { MeetingLinkableType } from '@/lib/types/meetings'

/**
 * POST /api/meetings/:id/links
 * Add a meeting link
 */
export async function POST(
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

    // Validate required fields
    if (!body.linkable_type || !body.linkable_id) {
      return NextResponse.json(
        { error: 'linkable_type and linkable_id are required' },
        { status: 400 }
      )
    }

    const result = await addMeetingLink(
      params.id,
      body.linkable_type as MeetingLinkableType,
      body.linkable_id
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to add meeting link' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('POST /api/meetings/:id/links error:', error)
    return NextResponse.json(
      { error: 'Failed to add meeting link' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/meetings/:id/links
 * Remove a meeting link
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

    // Get link_id from query params or body
    const { searchParams } = new URL(req.url)
    let link_id = searchParams.get('link_id')

    if (!link_id) {
      const body = await req.json()
      link_id = body.link_id
    }

    if (!link_id) {
      return NextResponse.json(
        { error: 'link_id is required' },
        { status: 400 }
      )
    }

    const result = await removeMeetingLink(link_id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to remove meeting link' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/meetings/:id/links error:', error)
    return NextResponse.json(
      { error: 'Failed to remove meeting link' },
      { status: 500 }
    )
  }
}
