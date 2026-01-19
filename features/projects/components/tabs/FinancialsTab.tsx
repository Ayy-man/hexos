'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  TrendingUp,
  Receipt,
  FileText,
  Plus,
  CheckCircle,
  Clock,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ProjectWithRelations } from '@/lib/api/projects';

interface FinancialsTabProps {
  project: ProjectWithRelations;
}

interface Milestone {
  id: string;
  label: string;
  amount: number;
  due_date: string;
  paid_at: string | null;
  invoice_id: string | null;
}

interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  status: string;
  total: number;
  due_date: string;
  paid_at: string | null;
}

export function FinancialsTab({ project }: FinancialsTabProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [milestonesRes, expensesRes, invoicesRes] = await Promise.all([
          fetch(`/api/projects/${project.id}/milestones`),
          fetch(`/api/projects/${project.id}/expenses`),
          fetch(`/api/projects/${project.id}/invoices`),
        ]);

        if (milestonesRes.ok) {
          const data = await milestonesRes.json();
          setMilestones(data.milestones || []);
        }
        if (expensesRes.ok) {
          const data = await expensesRes.json();
          setExpenses(data.expenses || []);
        }
        if (invoicesRes.ok) {
          const data = await invoicesRes.json();
          setInvoices(data.invoices || []);
        }
      } catch (error) {
        console.error('Error fetching financial data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [project.id]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);

  // Calculate metrics
  const totalValue = Number(project.price_dfy) || 0;
  const collected = milestones
    .filter((m) => m.paid_at)
    .reduce((sum, m) => sum + Number(m.amount), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const profit = collected - totalExpenses;
  const margin = collected > 0 ? (profit / collected) * 100 : 0;

  const getMilestoneStatus = (milestone: Milestone) => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Value</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(totalValue)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Project contract value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Collected</CardDescription>
            <CardTitle className="text-2xl text-green-500">{formatCurrency(collected)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {totalValue > 0 ? `${Math.round((collected / totalValue) * 100)}%` : '0%'} of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Expenses</CardDescription>
            <CardTitle className="text-2xl text-red-500">{formatCurrency(totalExpenses)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{expenses.length} expense(s)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Profit</CardDescription>
            <CardTitle className={cn('text-2xl', profit >= 0 ? 'text-green-500' : 'text-red-500')}>
              {formatCurrency(profit)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{margin.toFixed(1)}% margin</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Milestones */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Payment Milestones</CardTitle>
              <CardDescription>Payment schedule for this project</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/finances/invoices?project=${project.id}`}>
                <Plus className="mr-2 h-4 w-4" />
                Create Invoice
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {milestones.length > 0 ? (
            <div className="space-y-3">
              {milestones.map((milestone) => {
                const status = getMilestoneStatus(milestone);
                const { icon: StatusIcon, color, badge } = statusConfig[status];

                return (
                  <div
                    key={milestone.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <StatusIcon className={`h-5 w-5 ${color}`} />
                      <div>
                        <p className="font-medium">{milestone.label}</p>
                        <p className="text-sm text-muted-foreground">
                          Due {new Date(milestone.due_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{formatCurrency(Number(milestone.amount))}</span>
                      <Badge className={badge}>
                        {status === 'paid' && 'Paid'}
                        {status === 'overdue' && 'Overdue'}
                        {status === 'due' && 'Due'}
                      </Badge>
                      {milestone.invoice_id && (
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/finances/invoices/${milestone.invoice_id}`}>
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <DollarSign className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <p className="mt-2">No payment milestones</p>
              <p className="text-sm">Payment milestones are created based on the payment structure.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Project Expenses */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Project Expenses</CardTitle>
              <CardDescription>Costs associated with this project</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/finances/expenses?project=${project.id}`}>
                <Plus className="mr-2 h-4 w-4" />
                Add Expense
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {expenses.length > 0 ? (
            <div className="space-y-2">
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Receipt className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{expense.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {expense.category} &middot; {new Date(expense.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className="font-medium text-red-500">
                    -{formatCurrency(Number(expense.amount))}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <Receipt className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <p className="mt-2">No expenses recorded</p>
              <p className="text-sm">Track project costs by adding expenses.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Related Invoices */}
      {invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Invoices</CardTitle>
            <CardDescription>Invoices for this project</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {invoices.map((invoice) => (
                <Link
                  key={invoice.id}
                  href={`/finances/invoices/${invoice.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">#{invoice.invoice_number}</p>
                      <p className="text-sm text-muted-foreground">
                        Due {new Date(invoice.due_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{formatCurrency(invoice.total / 100)}</span>
                    <Badge
                      className={cn(
                        invoice.status === 'paid' && 'bg-green-500/20 text-green-400',
                        invoice.status === 'sent' && 'bg-blue-500/20 text-blue-400',
                        invoice.status === 'draft' && 'bg-muted text-muted-foreground',
                        invoice.status === 'overdue' && 'bg-red-500/20 text-red-400'
                      )}
                    >
                      {invoice.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Button variant="outline" asChild>
          <Link href="/finances">
            <TrendingUp className="mr-2 h-4 w-4" />
            View All Finances
          </Link>
        </Button>
      </div>
    </div>
  );
}
