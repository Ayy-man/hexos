export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/admin';
import { RetainerManagement } from '@/features/finances/components/RetainerManagement';

export default async function RetainersPage() {
  const supabase = createClient();

  const [{ data: retainers }, { data: projects }] = await Promise.all([
    supabase
      .from('retainers')
      .select('*, projects:project_id(project_name)')
      .order('created_at', { ascending: false }),
    supabase
      .from('projects')
      .select('id, project_name, client_name')
      .order('project_name'),
  ]);

  return (
    <div className="p-6">
      <RetainerManagement retainers={retainers || []} projects={projects || []} />
    </div>
  );
}
