'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Briefcase,
} from 'lucide-react';
import { formatCurrency } from '@/lib/api/financial-metrics-utils';
import type {
  FinancialHeroMetrics,
  OverduePayment,
} from '@/lib/api/financial-metrics';
import type { ProjectHealthIndicators, BlockersOverview } from '@/lib/api/admin-metrics';

interface HeroMetricsProps {
  financial: FinancialHeroMetrics | null;
  projectHealth: ProjectHealthIndicators | null;
  blockers: BlockersOverview | null;
  overduePayments: OverduePayment[];
}

export function HeroMetrics({
  financial,
  projectHealth,
  blockers,
  overduePayments,
}: HeroMetricsProps) {
  const hasAlerts = overduePayments.length > 0 || (blockers && blockers.critical_blockers > 0);

  return (
    <div className="space-y-4">
      {/* Critical Alerts */}
      {hasAlerts && (
        <div className="space-y-2">
          {overduePayments.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Overdue Payments</AlertTitle>
              <AlertDescription>
                {overduePayments.length} payment{overduePayments.length > 1 ? 's' : ''} overdue
                totaling{' '}
                {formatCurrency(overduePayments.reduce((sum, p) => sum + Number(p.amount), 0))}
              </AlertDescription>
            </Alert>
          )}
          {blockers && blockers.critical_blockers > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Critical Blockers</AlertTitle>
              <AlertDescription>
                {blockers.critical_blockers} critical blocker
                {blockers.critical_blockers > 1 ? 's' : ''} require immediate attention
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Hero KPI Cards - Row 1 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/10">
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {financial ? formatCurrency(financial.total_revenue) : '$0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {financial ? formatCurrency(financial.revenue_this_month) : '$0'} this month
            </p>
          </CardContent>
        </Card>

        {/* Projected Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projected Revenue</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-cyan-500/10">
              <TrendingUp className="h-4 w-4 text-cyan-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-600">
              {financial ? formatCurrency(financial.projected_revenue) : '$0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Pending + ({financial?.active_inquiries || 0} inquiries x win rate x avg ticket)
            </p>
          </CardContent>
        </Card>

        {/* Pending Payments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-orange-500/10">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {financial ? formatCurrency(financial.pending_payments) : '$0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Outstanding milestones
            </p>
          </CardContent>
        </Card>

        {/* Active Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-violet-500/10">
              <Briefcase className="h-4 w-4 text-violet-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {projectHealth?.total_active_projects || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {projectHealth?.on_track_projects || 0} on track
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Hero KPI Cards - Row 2: Payables */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Payable This Month */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payable This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {financial ? formatCurrency(financial.payable_this_month) : '$0'}
            </div>
            <p className="text-xs text-muted-foreground">Due within this month</p>
          </CardContent>
        </Card>

        {/* Payable Next Month */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payable Next Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {financial ? formatCurrency(financial.payable_next_month) : '$0'}
            </div>
            <p className="text-xs text-muted-foreground">Due next month</p>
          </CardContent>
        </Card>

        {/* Win Rate & Avg Ticket */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {financial ? `${(financial.win_rate * 100).toFixed(0)}%` : '0%'}
            </div>
            <p className="text-xs text-muted-foreground">
              Win rate | Avg ticket {financial ? formatCurrency(financial.avg_ticket_size) : '$0'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
