export const dynamic = 'force-dynamic';

import { requireRole } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { getMyPayouts } from '@/lib/api/payouts';
import { DevPayoutList } from '@/features/dev/components/payouts/DevPayoutList';

export default async function DevPayoutsPage() {
  await requireRole(['dev', 'admin', 'internal']);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div>Not authenticated</div>;
  }

  const payouts = await getMyPayouts(user.id);

  return (
    <div className="p-6">
      <DevPayoutList payouts={payouts} />
    </div>
  );
}
