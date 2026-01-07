export const dynamic = 'force-dynamic';

import { InvoiceManagement } from '@/features/admin/components/metrics/InvoiceManagement';
import { createClient } from '@/lib/supabase/admin';

export default async function InvoicesPage() {
  const supabase = createClient();

  const [{ data: invoices }, { data: projects }] = await Promise.all([
    supabase
      .from('invoices')
      .select('*, projects:project_id(name)')
      .order('created_at', { ascending: false }),
    supabase
      .from('projects')
      .select('id, project_name')
      .order('project_name'),
  ]);

  return (
    <div className="p-6">
      <InvoiceManagement
        invoices={invoices || []}
        projects={projects?.map((p) => ({ id: p.id, name: p.project_name })) || []}
      />
    </div>
  );
}
