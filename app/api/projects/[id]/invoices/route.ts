import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/admin';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createClient();

  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, status, total, due_date, paid_at')
    .eq('project_id', id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ invoices });
}
