export const dynamic = 'force-dynamic';

import { FinancesOverview } from '@/features/finances/components/FinancesOverview';
import { createClient } from '@/lib/supabase/admin';

export default async function FinancesPage() {
  const supabase = createClient();

  // Fetch financial data
  const [
    { data: invoices },
    { data: expenses },
    { data: milestones },
    { data: projects },
  ] = await Promise.all([
    supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false }),
    supabase
      .from('payment_milestones')
      .select('*, projects:project_id(name, client_name)')
      .order('due_date', { ascending: true }),
    supabase
      .from('projects')
      .select('id, project_name, client_name, price_dfy, status')
      .order('created_at', { ascending: false }),
  ]);

  return (
    <FinancesOverview
      invoices={invoices || []}
      expenses={expenses || []}
      milestones={milestones || []}
      projects={projects || []}
    />
  );
}
