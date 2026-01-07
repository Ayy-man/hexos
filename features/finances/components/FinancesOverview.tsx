'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  FileText,
  Receipt,
  Calendar,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { Invoice, Expense, PaymentMilestone, Project, FinancialAction } from '../types';

interface FinancesOverviewProps {
  invoices: Invoice[];
  expenses: Expense[];
  milestones: PaymentMilestone[];
  projects: Project[];
}

type Period = 'month' | 'quarter' | 'year' | 'all';

export function FinancesOverview({
  invoices,
  expenses,
  milestones,
}: FinancesOverviewProps) {
  const [period, setPeriod] = useState<Period>('month');

  // Calculate metrics based on period
  const metrics = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    let startDate: Date;
    switch (period) {
      case 'month':
        startDate = startOfMonth;
        break;
      case 'quarter':
        startDate = startOfQuarter;
        break;
      case 'year':
        startDate = startOfYear;
        break;
      default:
        startDate = new Date(0);
    }

    const periodInvoices = invoices.filter(
      (inv) => inv.paid_at && new Date(inv.paid_at) >= startDate
    );
    const periodExpenses = expenses.filter(
      (exp) => new Date(exp.date) >= startDate
    );

    const revenue = periodInvoices.reduce((sum, inv) => sum + inv.total, 0) / 100;
    const totalExpenses = periodExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    const netProfit = revenue - totalExpenses;
    const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    return { revenue, expenses: totalExpenses, netProfit, margin };
  }, [invoices, expenses, period]);

  // Cash flow projection (next 6 months)
  const cashFlow = useMemo(() => {
    const months: { month: string; expected: number }[] = [];
    const now = new Date();

    for (let i = 0; i < 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });

      const monthMilestones = milestones.filter((m) => {
        if (m.paid_at) return false;
        const dueDate = new Date(m.due_date);
        return (
          dueDate.getMonth() === date.getMonth() &&
          dueDate.getFullYear() === date.getFullYear()
        );
      });

      const expected = monthMilestones.reduce((sum, m) => sum + Number(m.amount), 0);
      months.push({ month: monthName, expected });
    }

    return months;
  }, [milestones]);

  // Outstanding amounts
  const outstanding = useMemo(() => {
    const unpaidInvoices = invoices.filter(
      (inv) => inv.status === 'sent' || inv.status === 'overdue'
    );
    const overdueInvoices = invoices.filter((inv) => {
      if (inv.paid_at) return false;
      return new Date(inv.due_date) < new Date();
    });
    const unpaidMilestones = milestones.filter((m) => !m.paid_at);

    return {
      unpaidInvoices: unpaidInvoices.reduce((sum, inv) => sum + inv.total, 0) / 100,
      overdue: overdueInvoices.reduce((sum, inv) => sum + inv.total, 0) / 100,
      pendingMilestones: unpaidMilestones.reduce((sum, m) => sum + Number(m.amount), 0),
    };
  }, [invoices, milestones]);

  // Action items
  const actions = useMemo(() => {
    const items: FinancialAction[] = [];

    // Overdue invoices
    invoices
      .filter((inv) => {
        if (inv.paid_at || inv.status === 'void') return false;
        return new Date(inv.due_date) < new Date();
      })
      .forEach((inv) => {
        const daysOverdue = Math.floor(
          (Date.now() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24)
        );
        items.push({
          id: inv.id,
          type: 'invoice_overdue',
          severity: 'warning',
          message: `Invoice #${inv.invoice_number} overdue by ${daysOverdue} days`,
          action: 'send_reminder',
          entityId: inv.id,
          entityType: 'invoice',
        });
      });

    // Milestones due soon without invoice
    milestones
      .filter((m) => {
        if (m.paid_at) return false;
        const dueDate = new Date(m.due_date);
        const daysUntilDue = Math.floor(
          (dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        return daysUntilDue <= 3 && daysUntilDue >= 0;
      })
      .forEach((m) => {
        items.push({
          id: m.id,
          type: 'milestone_due',
          severity: 'warning',
          message: `Milestone "${m.label}" due soon`,
          action: 'create_invoice',
          entityId: m.id,
          entityType: 'milestone',
        });
      });

    return items;
  }, [invoices, milestones]);

  // Recent activity
  const recentActivity = useMemo(() => {
    const activities: { id: string; type: string; description: string; date: Date }[] = [];

    // Invoice paid events
    invoices
      .filter((inv) => inv.paid_at)
      .slice(0, 5)
      .forEach((inv) => {
        activities.push({
          id: `inv-paid-${inv.id}`,
          type: 'invoice_paid',
          description: `Invoice #${inv.invoice_number} paid ($${(inv.total / 100).toLocaleString()})`,
          date: new Date(inv.paid_at!),
        });
      });

    // Invoice sent events
    invoices
      .filter((inv) => inv.status === 'sent')
      .slice(0, 5)
      .forEach((inv) => {
        activities.push({
          id: `inv-sent-${inv.id}`,
          type: 'invoice_sent',
          description: `Invoice #${inv.invoice_number} sent to ${inv.client_name}`,
          date: new Date(inv.created_at),
        });
      });

    // Expense logged
    expenses.slice(0, 5).forEach((exp) => {
      activities.push({
        id: `exp-${exp.id}`,
        type: 'expense_logged',
        description: `Expense logged: ${exp.category} ($${Number(exp.amount).toLocaleString()})`,
        date: new Date(exp.created_at),
      });
    });

    return activities
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 8);
  }, [invoices, expenses]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const hasCashFlowData = cashFlow.some((m) => m.expected > 0);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Finances</h1>
          <p className="text-muted-foreground">Financial overview and management</p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="quarter">This Quarter</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Hero Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Revenue</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(metrics.revenue)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-muted-foreground">
              <TrendingUp className="mr-1 h-4 w-4 text-green-500" />
              <span>Paid invoices</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Expenses</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(metrics.expenses)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-muted-foreground">
              <TrendingDown className="mr-1 h-4 w-4 text-red-500" />
              <span>Total spent</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Net Profit</CardDescription>
            <CardTitle className={cn('text-2xl', metrics.netProfit >= 0 ? 'text-green-500' : 'text-red-500')}>
              {formatCurrency(metrics.netProfit)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-muted-foreground">
              <DollarSign className="mr-1 h-4 w-4" />
              <span>Revenue - Expenses</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Margin</CardDescription>
            <CardTitle className="text-2xl">{metrics.margin.toFixed(1)}%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-muted-foreground">
              <BarChart3 className="mr-1 h-4 w-4" />
              <span>Profit margin</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Cash Flow */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cash Flow Projection</CardTitle>
            <CardDescription>Expected collections over next 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            {hasCashFlowData ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cashFlow}>
                    <XAxis dataKey="month" axisLine={false} tickLine={false} />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value) || 0)}
                      labelStyle={{ color: 'var(--foreground)' }}
                      contentStyle={{
                        backgroundColor: 'var(--background)',
                        border: '1px solid var(--border)',
                      }}
                    />
                    <Bar dataKey="expected" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-[200px] items-center justify-center text-center">
                <div>
                  <Calendar className="mx-auto h-10 w-10 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    No scheduled payments
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Create payment milestones in your projects
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Outstanding */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Outstanding</CardTitle>
            <CardDescription>Money owed to you</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Unpaid invoices</span>
              <span className="font-medium">{formatCurrency(outstanding.unpaidInvoices)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-red-500">Overdue</span>
              <span className="font-medium text-red-500">{formatCurrency(outstanding.overdue)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Pending milestones</span>
              <span className="font-medium">{formatCurrency(outstanding.pendingMilestones)}</span>
            </div>
            <div className="pt-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/finances/invoices">
                  View All Invoices
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
          <CardDescription>Latest financial events</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between border-b pb-3 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    {activity.type === 'invoice_paid' && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {activity.type === 'invoice_sent' && (
                      <FileText className="h-4 w-4 text-blue-500" />
                    )}
                    {activity.type === 'expense_logged' && (
                      <Receipt className="h-4 w-4 text-orange-500" />
                    )}
                    <span className="text-sm">{activity.description}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(activity.date)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No recent activity
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Required */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Action Required</CardTitle>
              <CardDescription>Items needing your attention</CardDescription>
            </div>
            {actions.length > 0 && (
              <Badge variant="secondary">{actions.length} items</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {actions.length > 0 ? (
            <div className="space-y-3">
              {actions.map((action) => (
                <div
                  key={action.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span className="text-sm">{action.message}</span>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={
                        action.entityType === 'invoice'
                          ? `/finances/invoices/${action.entityId}`
                          : `/finances/schedule`
                      }
                    >
                      {action.action === 'send_reminder' && 'Send Reminder'}
                      {action.action === 'create_invoice' && 'Create Invoice'}
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 py-8 text-green-500">
              <CheckCircle className="h-5 w-5" />
              <span>All caught up! No actions needed.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Button variant="outline" className="h-auto py-4" asChild>
          <Link href="/finances/invoices" className="flex flex-col items-center gap-2">
            <FileText className="h-5 w-5" />
            <span>Invoices</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-4" asChild>
          <Link href="/finances/expenses" className="flex flex-col items-center gap-2">
            <Receipt className="h-5 w-5" />
            <span>Expenses</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-4" asChild>
          <Link href="/finances/schedule" className="flex flex-col items-center gap-2">
            <Calendar className="h-5 w-5" />
            <span>Payment Schedule</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-4" asChild>
          <Link href="/finances/reports" className="flex flex-col items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            <span>Reports</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
