import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('id, invoice_number, status, total, due_date, paid_at')
      .eq('project_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API] Error fetching invoices:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ invoices: invoices || [] });
  } catch (error) {
    console.error('[API] Unexpected error in invoices route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
