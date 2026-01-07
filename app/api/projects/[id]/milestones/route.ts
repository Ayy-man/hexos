import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/admin';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createClient();

  const { data: milestones, error } = await supabase
    .from('payment_milestones')
    .select('*')
    .eq('project_id', id)
    .order('due_date', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ milestones });
}
