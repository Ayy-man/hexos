import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: milestones, error } = await supabase
      .from('payment_milestones')
      .select('*')
      .eq('project_id', id)
      .order('due_date', { ascending: true });

    if (error) {
      console.error('[API] Error fetching milestones:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ milestones: milestones || [] });
  } catch (error) {
    console.error('[API] Unexpected error in milestones route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
