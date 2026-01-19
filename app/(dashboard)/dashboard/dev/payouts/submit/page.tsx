export const dynamic = 'force-dynamic';

import { requireRole } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { SubmitPayoutForm } from '@/features/dev/components/payouts/SubmitPayoutForm';

export default async function SubmitPayoutPage() {
  await requireRole(['dev', 'admin', 'internal']);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div>Not authenticated</div>;
  }

  // Get projects assigned to this dev
  const { data: projects } = await supabase
    .from('projects')
    .select('id, project_name, client_name')
    .eq('assigned_dev_id', user.id)
    .order('project_name');

  return (
    <div className="p-6">
      <SubmitPayoutForm projects={projects || []} />
    </div>
  );
}
