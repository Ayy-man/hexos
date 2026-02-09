/**
 * Convert Meeting Task to Deliverable API
 * POST /api/meeting-tasks/[id]/convert-to-deliverable
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { convertTaskToDeliverable } from '@/lib/api/meeting-tasks'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { project_id } = body

    if (!project_id) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      )
    }

    const result = await convertTaskToDeliverable(params.id, project_id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result.data, { status: 201 })
  } catch (error: any) {
    console.error('Error converting task to deliverable:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
