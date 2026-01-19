'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Bar, BarChart, Area, AreaChart, XAxis, YAxis } from 'recharts';
import {
  DollarSign,
  AlertTriangle,
  Calendar,
  TrendingUp,
  Download,
  Clock,
  Receipt,
  Target,
  Percent,
} from 'lucide-react';
import { formatCurrency } from '@/lib/api/financial-metrics-utils';
import { cn } from '@/lib/utils';
import type {
  FinancialHeroMetrics,
  OverduePayment,
  PaymentTimelineItem,
  RevenueTrendItem,
  PendingPaymentByProject,
  Expense,
  PaymentSource,
} from '@/lib/api/financial-metrics';
import type { InvoiceWithProject } from '@/lib/types/invoices';
import { ExpenseLedger } from '../ExpenseLedger';
import { InvoiceManagement } from '../InvoiceManagement';

interface Project {
  id: string;
  name: string;
}

interface FinancialsTabProps {
  financial: FinancialHeroMetrics | null;
  paymentTimeline: PaymentTimelineItem[];
  revenueTrend: RevenueTrendItem[];
  pendingByProject: PendingPaymentByProject[];
  overduePayments: OverduePayment[];
  expenses: Expense[];
  paymentSources: PaymentSource[];
  projects: Project[];
  invoices: InvoiceWithProject[];
}

const paymentChartConfig: ChartConfig = {
  expected: {
    label: 'Expected',
    color: 'hsl(142.1 76.2% 36.3%)',
  },
};

const revenueChartConfig: ChartConfig = {
  revenue: {
    label: 'Revenue',
    color: 'hsl(217.2 91.2% 59.8%)',
  },
};

export function FinancialsTab({
  financial,
  paymentTimeline,
  revenueTrend,
  pendingByProject,
  overduePayments,
  expenses,
  paymentSources,
  projects,
  invoices,
}: FinancialsTabProps) {
  // Transform payment timeline for chart
  const paymentChartData = paymentTimeline.slice(0, 6).map((item) => ({
    month: item.month,
    expected: item.expected_revenue,
    count: item.milestone_count,
  }));

  // Transform revenue trend for chart
  const revenueChartData = revenueTrend.map((item) => ({
    month: item.month,
    revenue: item.revenue,
    projects: item.projects_started,
  }));

  const totalOverdue = overduePayments.reduce((sum, p) => sum + Number(p.amount), 0);

  const handleExportPending = () => {
    const headers = ['Project', 'Client', 'Total', 'Paid', 'Pending', 'Completion %', 'Structure'];
    const rows = pendingByProject.map((p) => [
      p.project_name,
      p.client_name,
      formatCurrency(p.price_dfy),
      formatCurrency(p.paid_amount),
      formatCurrency(p.pending_amount),
      `${p.payment_completion_pct}%`,
      p.payment_structure,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pending-payments.csv';
    a.click();
  };

  const handleExportOverdue = () => {
    const headers = ['Project', 'Client', 'Milestone', 'Amount', 'Due Date', 'Days Overdue'];
    const rows = overduePayments.map((p) => [
      p.project_name,
      p.client_name,
      p.milestone_label,
      formatCurrency(p.amount),
      p.due_date,
      p.days_overdue,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'overdue-payments.csv';
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Revenue Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <DollarSign className="h-4 w-4" />
          <span>Revenue</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Card className="py-3 border-green-200 bg-green-50/30 dark:border-green-900 dark:bg-green-950/30">
            <CardContent className="p-0 px-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-green-600 dark:text-green-400">Total Revenue</p>
                <p className="text-xl font-bold text-green-600 tabular-nums">
                  {formatCurrency(financial?.total_revenue || 0)}
                </p>
              </div>
              <DollarSign className="h-5 w-5 text-green-500" />
            </CardContent>
          </Card>
          <Card className="py-3">
            <CardContent className="p-0 px-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">This Month</p>
                <p className="text-xl font-bold tabular-nums">
                  {formatCurrency(financial?.revenue_this_month || 0)}
                </p>
              </div>
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card className="py-3">
            <CardContent className="p-0 px-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Projected</p>
                <p className="text-xl font-bold tabular-nums">
                  {formatCurrency(financial?.projected_revenue || 0)}
                </p>
              </div>
              <Target className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card className="py-3">
            <CardContent className="p-0 px-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Win Rate</p>
                <p className="text-xl font-bold tabular-nums">
                  {financial?.win_rate ? `${financial.win_rate}%` : '0%'}
                </p>
              </div>
              <Percent className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card className="py-3">
            <CardContent className="p-0 px-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Avg Ticket</p>
                <p className="text-xl font-bold tabular-nums">
                  {formatCurrency(financial?.avg_ticket_size || 0)}
                </p>
              </div>
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Payment Forecast */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Payment Forecast
            </CardTitle>
            <CardDescription>Expected collections by month (next 6 months)</CardDescription>
          </CardHeader>
          <CardContent>
            {paymentChartData.length > 0 ? (
              <ChartContainer config={paymentChartConfig} className="h-[250px] w-full">
                <BarChart data={paymentChartData}>
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString('en-US', { month: 'short' });
                    }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => formatCurrency(Number(value))}
                      />
                    }
                  />
                  <Bar
                    dataKey="expected"
                    fill="var(--color-expected)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[250px] items-center justify-center text-muted-foreground">
                No upcoming payments scheduled
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Revenue Trend
            </CardTitle>
            <CardDescription>Historical revenue (last 6 months)</CardDescription>
          </CardHeader>
          <CardContent>
            {revenueChartData.length > 0 ? (
              <ChartContainer config={revenueChartConfig} className="h-[250px] w-full">
                <AreaChart data={revenueChartData}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => {
                      const date = new Date(value + '-01');
                      return date.toLocaleDateString('en-US', { month: 'short' });
                    }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => formatCurrency(Number(value))}
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--color-revenue)"
                    strokeWidth={2}
                    fill="url(#revenueGradient)"
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[250px] items-center justify-center text-muted-foreground">
                No revenue data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending Payments by Project */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Pending Payments by Project
              </CardTitle>
              <CardDescription>Outstanding balances and payment progress</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportPending}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Structure</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead className="text-right">Pending</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingByProject.map((project, index) => (
                <TableRow key={project.id}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">{project.project_name}</TableCell>
                  <TableCell>{project.client_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {project.payment_structure.replace('_', '/')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(project.price_dfy)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={project.payment_completion_pct} className="w-20 h-2" />
                      <span className="text-xs text-muted-foreground w-10">
                        {project.payment_completion_pct}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium text-warning">
                    {formatCurrency(project.pending_amount)}
                  </TableCell>
                </TableRow>
              ))}
              {pendingByProject.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No pending payments
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Overdue Payments (only show if there are any) */}
      {overduePayments.length > 0 && (
        <Card className="border-error/50">
          <CardHeader className="bg-error/5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-error">
                  <AlertTriangle className="h-4 w-4" />
                  Overdue Payments
                </CardTitle>
                <CardDescription>Requires immediate attention</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleExportOverdue}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Milestone</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Days Overdue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overduePayments.map((payment) => (
                  <TableRow key={payment.milestone_id} className="bg-error/5">
                    <TableCell className="font-medium">{payment.project_name}</TableCell>
                    <TableCell>{payment.client_name}</TableCell>
                    <TableCell>{payment.milestone_label}</TableCell>
                    <TableCell className="text-right font-medium text-error">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell>{new Date(payment.due_date).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="destructive">{payment.days_overdue} days</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Invoice Management */}
      <InvoiceManagement invoices={invoices} projects={projects} />

      {/* Expense Ledger */}
      <ExpenseLedger
        expenses={expenses}
        paymentSources={paymentSources}
        projects={projects}
      />
    </div>
  );
}
