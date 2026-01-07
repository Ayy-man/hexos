export const dynamic = 'force-dynamic';

import { ExpenseLedger } from '@/features/admin/components/metrics/ExpenseLedger';
import { createClient } from '@/lib/supabase/admin';

export default async function ExpensesPage() {
  const supabase = createClient();

  const [{ data: expenses }, { data: projects }, { data: paymentSources }] = await Promise.all([
    supabase
      .from('expenses')
      .select('*, projects:project_id(project_name)')
      .order('date', { ascending: false }),
    supabase
      .from('projects')
      .select('id, project_name')
      .order('project_name'),
    supabase
      .from('payment_sources')
      .select('*')
      .eq('is_active', true)
      .order('name'),
  ]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Expenses</h1>
        <p className="text-muted-foreground">Track and manage business expenses</p>
      </div>
      <ExpenseLedger
        expenses={expenses || []}
        projects={projects || []}
        paymentSources={paymentSources || []}
      />
    </div>
  );
}
