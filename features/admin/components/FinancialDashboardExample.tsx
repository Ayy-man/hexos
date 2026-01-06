/**
 * Financial Dashboard Example
 *
 * This is a comprehensive example showing how to use all the financial metrics.
 * Use this as a reference when building the actual admin financial dashboard.
 *
 * Features:
 * - Hero metrics cards (total revenue, pending payments, payables, projected revenue)
 * - Revenue trend chart (last 12 months)
 * - Payment collection timeline (next 12 months)
 * - Projected revenue breakdown
 * - Overdue payments alert
 * - Pending payments by project table
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  fetchFinancialHeroMetrics,
  fetchRevenueTrend,
  fetchPaymentTimeline,
  fetchOverduePayments,
  fetchProjectedRevenueTimeline,
  fetchPendingPaymentsByProject,
  fetchSalesCycleStats,
} from '../actions/financialActions';
import { formatCurrency, formatPercentage, getPaymentUrgency } from '@/lib/api/financial-metrics';
import { AlertCircle, TrendingUp, DollarSign, Calendar, Target } from 'lucide-react';

export async function FinancialDashboardExample() {
  // Fetch all data in parallel
  const [
    heroMetricsRes,
    revenueTrendRes,
    paymentTimelineRes,
    overdueRes,
    projectedRevenueRes,
    pendingByProjectRes,
    salesCycleRes,
  ] = await Promise.all([
    fetchFinancialHeroMetrics(),
    fetchRevenueTrend(12),
    fetchPaymentTimeline(12),
    fetchOverduePayments(),
    fetchProjectedRevenueTimeline(),
    fetchPendingPaymentsByProject(),
    fetchSalesCycleStats(),
  ]);

  const heroMetrics = heroMetricsRes.data;
  const revenueTrend = revenueTrendRes.data || [];
  const paymentTimeline = paymentTimelineRes.data || [];
  const overduePayments = overdueRes.data || [];
  const projectedRevenue = projectedRevenueRes.data || [];
  const pendingByProject = pendingByProjectRes.data || [];
  const salesCycleStats = salesCycleRes.data;

  if (!heroMetrics) {
    return <div>Error loading financial metrics</div>;
  }

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <div>
        <h1 className="text-3xl font-bold">Financial Dashboard</h1>
        <p className="text-muted-foreground">
          Revenue tracking, payment milestones, and financial projections
        </p>
      </div>

      {/* OVERDUE PAYMENTS ALERT */}
      {overduePayments.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Overdue Payments</AlertTitle>
          <AlertDescription>
            You have {overduePayments.length} overdue payment{overduePayments.length > 1 ? 's' : ''}{' '}
            totaling{' '}
            {formatCurrency(
              overduePayments.reduce((sum, p) => sum + Number(p.amount), 0)
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* HERO METRICS CARDS */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(heroMetrics.total_revenue)}
            </div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        {/* Revenue This Month */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(heroMetrics.revenue_this_month)}
            </div>
            <p className="text-xs text-muted-foreground">Projects started</p>
          </CardContent>
        </Card>

        {/* Pending Payments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(heroMetrics.pending_payments)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(heroMetrics.payable_this_month)} this month
            </p>
          </CardContent>
        </Card>

        {/* Projected Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projected Revenue</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(heroMetrics.projected_revenue)}
            </div>
            <p className="text-xs text-muted-foreground">Next 3 months</p>
          </CardContent>
        </Card>
      </div>

      {/* SALES METRICS ROW */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercentage(heroMetrics.win_rate * 100)}
            </div>
            <p className="text-xs text-muted-foreground">Last 6 months</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Avg Ticket Size</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(heroMetrics.avg_ticket_size)}
            </div>
            <p className="text-xs text-muted-foreground">Closed deals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Sales Cycle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {salesCycleStats?.avg_sales_cycle_days || 0} days
            </div>
            <p className="text-xs text-muted-foreground">
              Median: {salesCycleStats?.median_sales_cycle_days || 0} days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* CHARTS ROW */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Revenue Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Last 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            {/* TODO: Replace with actual chart component (Recharts, Chart.js, etc.) */}
            <div className="space-y-2">
              {revenueTrend.map((item) => (
                <div key={item.month} className="flex items-center justify-between">
                  <span className="text-sm">
                    {new Date(item.month).toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  <span className="text-sm font-medium">
                    {formatCurrency(item.revenue)} ({item.projects_started} projects)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Payment Timeline Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Collection Timeline</CardTitle>
            <CardDescription>Expected payments next 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            {/* TODO: Replace with actual chart component */}
            <div className="space-y-2">
              {paymentTimeline.slice(0, 6).map((item) => (
                <div key={item.month} className="flex items-center justify-between">
                  <span className="text-sm">
                    {new Date(item.month).toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  <span className="text-sm font-medium">
                    {formatCurrency(item.expected_revenue)} ({item.milestone_count}{' '}
                    milestones)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PROJECTED REVENUE BREAKDOWN */}
      <Card>
        <CardHeader>
          <CardTitle>Projected Revenue Breakdown</CardTitle>
          <CardDescription>
            Based on {heroMetrics.active_inquiries} active inquiries, {formatPercentage(heroMetrics.win_rate * 100)} win rate
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Pending Payments */}
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <div className="font-medium">Pending Payments</div>
                <div className="text-sm text-muted-foreground">
                  From existing projects
                </div>
              </div>
              <div className="text-lg font-bold">
                {formatCurrency(heroMetrics.pending_payments)}
              </div>
            </div>

            {/* Pipeline Revenue */}
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <div className="font-medium">Estimated Pipeline Revenue</div>
                <div className="text-sm text-muted-foreground">
                  {heroMetrics.active_inquiries} inquiries ×{' '}
                  {formatPercentage(heroMetrics.win_rate * 100)} ×{' '}
                  {formatCurrency(heroMetrics.avg_ticket_size)}
                </div>
              </div>
              <div className="text-lg font-bold">
                {formatCurrency(
                  heroMetrics.active_inquiries *
                    heroMetrics.win_rate *
                    heroMetrics.avg_ticket_size
                )}
              </div>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between pt-2">
              <div className="font-bold">Total Projected Revenue</div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(heroMetrics.projected_revenue)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* OVERDUE PAYMENTS TABLE */}
      {overduePayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Overdue Payments</CardTitle>
            <CardDescription>Payment milestones past due date</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overduePayments.map((payment) => (
                <div
                  key={payment.milestone_id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="space-y-1">
                    <div className="font-medium">{payment.project_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {payment.client_name} • {payment.milestone_label}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(payment.amount)}</div>
                    <Badge variant="destructive">
                      {payment.days_overdue} days overdue
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* PENDING PAYMENTS BY PROJECT */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Payments by Project</CardTitle>
          <CardDescription>Active projects with outstanding payments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {pendingByProject.slice(0, 10).map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="space-y-1">
                  <div className="font-medium">{project.project_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {project.client_name} •{' '}
                    {project.payment_structure.replace(/_/g, ' ')}
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div className="font-medium">
                    {formatCurrency(project.pending_amount)} pending
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatCurrency(project.paid_amount)} paid (
                    {project.payment_completion_pct}%)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* PROJECTED REVENUE TIMELINE */}
      {projectedRevenue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Projected Pipeline Closings</CardTitle>
            <CardDescription>Expected deals to close in next 3 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {projectedRevenue.map((item) => (
                <div key={item.month} className="flex items-center justify-between">
                  <span className="text-sm">
                    {new Date(item.month).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                  <span className="text-sm font-medium">
                    {formatCurrency(item.projected_revenue)} ({item.expected_deals} deals)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
