export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Calendar, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/admin';

export default async function PaymentSchedulePage() {
  const supabase = createClient();

  const { data: milestones } = await supabase
    .from('payment_milestones')
    .select('*, projects:project_id(project_name, client_name)')
    .order('due_date', { ascending: true });

  // Group milestones by month
  const groupedMilestones = (milestones || []).reduce((acc, milestone) => {
    const date = new Date(milestone.due_date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    if (!acc[monthKey]) {
      acc[monthKey] = { label: monthLabel, milestones: [], total: 0 };
    }
    acc[monthKey].milestones.push(milestone);
    if (!milestone.paid_at) {
      acc[monthKey].total += Number(milestone.amount);
    }
    return acc;
  }, {} as Record<string, { label: string; milestones: any[]; total: number }>);

  const sortedMonths = Object.entries(groupedMilestones).sort(([a], [b]) => a.localeCompare(b));

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);

  const getMilestoneStatus = (milestone: any) => {
    if (milestone.paid_at) return 'paid';
    const dueDate = new Date(milestone.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dueDate < today) return 'overdue';
    return 'due';
  };

  const statusConfig = {
    paid: { icon: CheckCircle, color: 'text-green-500', badge: 'bg-green-500/20 text-green-400' },
    overdue: { icon: AlertTriangle, color: 'text-red-500', badge: 'bg-red-500/20 text-red-400' },
    due: { icon: Clock, color: 'text-muted-foreground', badge: 'bg-muted text-muted-foreground' },
  };

  // Calculate totals
  const totalExpected = (milestones || [])
    .filter((m) => !m.paid_at)
    .reduce((sum, m) => sum + Number(m.amount), 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Payment Schedule</h1>
          <p className="text-muted-foreground">Upcoming payments by project milestone</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Expected Collections (Next 90 days)</p>
          <p className="text-2xl font-semibold">{formatCurrency(totalExpected)}</p>
        </div>
      </div>

      {sortedMonths.length > 0 ? (
        <div className="space-y-6">
          {sortedMonths.map(([key, data]) => {
            const { label, milestones: monthMilestones, total } = data as { label: string; milestones: any[]; total: number };
            return (
            <Card key={key}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{label}</CardTitle>
                  {total > 0 && (
                    <span className="font-medium text-muted-foreground">
                      {formatCurrency(total)} expected
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {monthMilestones.map((milestone) => {
                    const status = getMilestoneStatus(milestone);
                    const { icon: StatusIcon, color, badge } = statusConfig[status];

                    return (
                      <div
                        key={milestone.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-4">
                          <StatusIcon className={`h-5 w-5 ${color}`} />
                          <div>
                            <p className="font-medium">
                              {milestone.projects?.client_name || 'Unknown Client'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {milestone.label} &middot; {milestone.projects?.project_name}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-medium">{formatCurrency(Number(milestone.amount))}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(milestone.due_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </p>
                          </div>
                          <Badge className={badge}>
                            {status === 'paid' && 'Paid'}
                            {status === 'overdue' && 'Overdue'}
                            {status === 'due' && 'Due'}
                          </Badge>
                          {status !== 'paid' && (
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/finances/invoices?milestone=${milestone.id}`}>
                                Create Invoice
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">No Payment Milestones</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Payment milestones will appear here when projects are created with payment schedules.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
