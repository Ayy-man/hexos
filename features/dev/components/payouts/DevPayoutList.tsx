'use client';

import Link from 'next/link';
import { Wallet, Plus, Clock, CheckCircle, XCircle, DollarSign, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PayoutWithDetails } from '@/lib/api/payouts';
import { formatPayoutStatus, getPayoutStatusColor } from '@/lib/api/payouts';

interface DevPayoutListProps {
  payouts: PayoutWithDetails[];
}

export function DevPayoutList({ payouts }: DevPayoutListProps) {
  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(cents / 100);

  // Calculate metrics
  const pendingAmount = payouts
    .filter((p) => p.status === 'pending' || p.status === 'approved')
    .reduce((sum, p) => sum + p.amount, 0);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const paidThisMonth = payouts
    .filter((p) => (p.status === 'paid' || p.status === 'completed') && p.paid_at && new Date(p.paid_at) >= startOfMonth)
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPaid = payouts
    .filter((p) => p.status === 'paid' || p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'paid':
      case 'completed':
        return <DollarSign className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">My Payouts</h1>
          <p className="text-muted-foreground">Track your payment requests</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/dev/payouts/submit">
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Link>
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-2xl text-yellow-500">{formatCurrency(pendingAmount)}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>This Month</CardDescription>
            <CardTitle className="text-2xl text-green-500">{formatCurrency(paidThisMonth)}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Paid</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(totalPaid)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Payout List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payout History</CardTitle>
        </CardHeader>
        <CardContent>
          {payouts.length > 0 ? (
            <div className="space-y-3">
              {payouts.map((payout) => (
                <div
                  key={payout.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    {getStatusIcon(payout.status)}
                    <div>
                      <p className="font-medium">
                        {payout.project?.project_name || 'No project'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {payout.description || 'Payment request'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(payout.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {payout.submitted_at
                          ? new Date(payout.submitted_at).toLocaleDateString()
                          : new Date(payout.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <Badge className={getPayoutStatusColor(payout.status)}>
                      {formatPayoutStatus(payout.status)}
                    </Badge>

                    {payout.contractor_invoice_url && (
                      <Button variant="ghost" size="icon" asChild>
                        <a
                          href={payout.contractor_invoice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <FileText className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Wallet className="h-12 w-12 opacity-50" />
              <p className="mt-4 text-lg font-medium">No payouts yet</p>
              <p className="text-sm">Submit your first payout request to get paid for your work.</p>
              <Button className="mt-4" asChild>
                <Link href="/dashboard/dev/payouts/submit">
                  <Plus className="mr-2 h-4 w-4" />
                  Submit Payout Request
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rejection Details */}
      {payouts.some((p) => p.status === 'rejected' && p.rejection_reason) && (
        <Card className="border-red-500/20">
          <CardHeader>
            <CardTitle className="text-lg text-red-500">Rejected Requests</CardTitle>
            <CardDescription>Review the reasons and resubmit if needed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {payouts
                .filter((p) => p.status === 'rejected' && p.rejection_reason)
                .map((payout) => (
                  <div key={payout.id} className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{payout.project?.project_name || 'No project'}</p>
                      <p className="text-sm text-muted-foreground">{formatCurrency(payout.amount)}</p>
                    </div>
                    <p className="mt-2 text-sm text-red-400">
                      Reason: {payout.rejection_reason}
                    </p>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
