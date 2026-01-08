export const dynamic = 'force-dynamic';

import { getPayouts, getPayoutMetrics } from '@/lib/api/payouts';
import { PayoutManagement } from '@/features/finances/components/payouts/PayoutManagement';

export default async function PayoutsPage() {
  const [payouts, metrics] = await Promise.all([getPayouts(), getPayoutMetrics()]);

  return (
    <div className="p-6">
      <PayoutManagement payouts={payouts} metrics={metrics} />
    </div>
  );
}
