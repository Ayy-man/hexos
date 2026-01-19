import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = await params
    const supabase = await createClient()

    const { data: versions, error } = await supabase
      .from('document_versions')
      .select(`
        *,
        author:profiles!created_by(id, name)
      `)
      .eq('document_id', documentId)
      .order('version_number', { ascending: false })

    if (error) {
      console.error('[API] Error fetching versions:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ versions: versions || [] })
  } catch (error) {
    console.error('[API] Unexpected error in versions route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
