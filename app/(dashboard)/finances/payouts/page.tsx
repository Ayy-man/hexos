export const dynamic = 'force-dynamic';

import { getPayouts, getPayoutMetrics } from '@/lib/api/payouts';
import { PayoutManagement } from '@/features/finances/components/payouts/PayoutManagement';

export default async function PayoutsPage() {
  console.log('[PayoutsPage] Starting to fetch data...');

  const [payouts, metrics] = await Promise.all([getPayouts(), getPayoutMetrics()]);

  console.log('[PayoutsPage] Fetched payouts:', JSON.stringify(payouts, null, 2));
  console.log('[PayoutsPage] Payouts count:', payouts.length);
  console.log('[PayoutsPage] Metrics:', JSON.stringify(metrics));

  return (
    <div className="p-6">
      {/* Debug output */}
      <div className="mb-4 rounded bg-yellow-500/20 p-4 text-xs font-mono">
        <p>DEBUG: Payouts received: {payouts.length}</p>
        <p>DEBUG: Pending count: {metrics.pending_count}</p>
        {payouts.length === 0 && <p className="text-red-400">WARNING: No payouts returned from query!</p>}
      </div>
      <PayoutManagement payouts={payouts} metrics={metrics} />
    </div>
  );
}
