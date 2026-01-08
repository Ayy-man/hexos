'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Send,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  FileText,
  ExternalLink,
  MoreVertical,
  Download,
  Building2,
  Mail,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { PayoutWithDetails, PayoutStatus, PayoutMetrics, PaymentMethod } from '@/lib/api/payouts.shared';
import { formatPayoutStatus, getPayoutStatusColor } from '@/lib/api/payouts.shared';
import {
  approvePayoutAction,
  rejectPayoutAction,
  markPayoutPaidAction,
} from '@/features/finances/actions/payoutActions';

interface PayoutManagementProps {
  payouts: PayoutWithDetails[];
  metrics: PayoutMetrics;
}

type TabFilter = 'all' | 'pending' | 'approved' | 'paid' | 'rejected';

export function PayoutManagement({ payouts: initialPayouts, metrics }: PayoutManagementProps) {
  const [payouts, setPayouts] = useState(initialPayouts);
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [loading, setLoading] = useState(false);
  const [expandedPayout, setExpandedPayout] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, fieldId: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const CopyableField = ({ label, value, fieldId }: { label: string; value: string; fieldId: string }) => (
    <div className="group">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <p className="font-mono text-sm select-all">{value}</p>
        <button
          onClick={() => copyToClipboard(value, fieldId)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
        >
          {copiedField === fieldId ? (
            <Check className="h-3 w-3 text-green-500" />
          ) : (
            <Copy className="h-3 w-3 text-muted-foreground" />
          )}
        </button>
      </div>
    </div>
  );

  // Dialogs
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; payout: PayoutWithDetails | null }>({
    open: false,
    payout: null,
  });
  const [payDialog, setPayDialog] = useState<{ open: boolean; payout: PayoutWithDetails | null }>({
    open: false,
    payout: null,
  });
  const [rejectReason, setRejectReason] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wire_transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(cents / 100);

  const filteredPayouts = payouts.filter((p) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'paid') return p.status === 'paid' || p.status === 'completed';
    return p.status === activeTab;
  });

  const handleApprove = async (payout: PayoutWithDetails) => {
    setLoading(true);
    const result = await approvePayoutAction(payout.id);
    if (result.success) {
      toast.success('Payout approved');
      setPayouts((prev) =>
        prev.map((p) => (p.id === payout.id ? { ...p, status: 'approved' as PayoutStatus } : p))
      );
    } else {
      toast.error(result.error || 'Failed to approve payout');
    }
    setLoading(false);
  };

  const handleReject = async () => {
    if (!rejectDialog.payout || !rejectReason.trim()) return;

    setLoading(true);
    const result = await rejectPayoutAction(rejectDialog.payout.id, rejectReason);
    if (result.success) {
      toast.success('Payout rejected');
      setPayouts((prev) =>
        prev.map((p) =>
          p.id === rejectDialog.payout!.id
            ? { ...p, status: 'rejected' as PayoutStatus, rejection_reason: rejectReason }
            : p
        )
      );
      setRejectDialog({ open: false, payout: null });
      setRejectReason('');
    } else {
      toast.error(result.error || 'Failed to reject payout');
    }
    setLoading(false);
  };

  const handlePay = async () => {
    if (!payDialog.payout || !paymentReference.trim()) return;

    setLoading(true);
    const result = await markPayoutPaidAction(
      payDialog.payout.id,
      paymentMethod,
      paymentReference,
      paymentNotes
    );
    if (result.success) {
      toast.success('Payout marked as paid');
      setPayouts((prev) =>
        prev.map((p) =>
          p.id === payDialog.payout!.id
            ? {
                ...p,
                status: 'paid' as PayoutStatus,
                payment_method: paymentMethod,
                payment_reference: paymentReference,
              }
            : p
        )
      );
      setPayDialog({ open: false, payout: null });
      setPaymentMethod('bank_transfer');
      setPaymentReference('');
      setPaymentNotes('');
    } else {
      toast.error(result.error || 'Failed to mark payout as paid');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Payouts</h1>
        <p className="text-muted-foreground">Manage developer payment requests</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Review</CardDescription>
            <CardTitle className="text-2xl text-yellow-500">{metrics.pending_count}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{formatCurrency(metrics.pending_amount)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Approved</CardDescription>
            <CardTitle className="text-2xl text-blue-500">{metrics.approved_count}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{formatCurrency(metrics.approved_amount)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Paid This Month</CardDescription>
            <CardTitle className="text-2xl text-green-500">{metrics.paid_this_month}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{formatCurrency(metrics.paid_this_month_amount)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Paid</CardDescription>
            <CardTitle className="text-2xl">{metrics.total_paid}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{formatCurrency(metrics.total_paid_amount)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & List */}
      <Card>
        <CardHeader>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabFilter)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">
                Pending
                {metrics.pending_count > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {metrics.pending_count}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="approved">
                Approved
                {metrics.approved_count > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {metrics.approved_count}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="paid">Paid</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {filteredPayouts.length > 0 ? (
            <div className="space-y-3">
              {filteredPayouts.map((payout) => {
                const isExpanded = expandedPayout === payout.id;
                const hasWireDetails = payout.payment_preference === 'wire_transfer' && payout.wire_swift_code;

                return (
                  <div key={payout.id} className="rounded-lg border">
                    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
                          {payout.payment_preference === 'emailed_invoice' ? (
                            <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                          ) : (
                            <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium truncate">{payout.submitter?.name || 'Unknown Dev'}</p>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {payout.payment_preference === 'emailed_invoice' ? 'Email' : 'Wire'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {payout.project?.project_name || 'No project'}
                            {payout.description && ` - ${payout.description}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 sm:gap-4">
                        <div className="sm:text-right">
                          <p className="font-medium">{formatCurrency(payout.amount)}</p>
                          <p className="text-xs text-muted-foreground">
                            {payout.submitted_at
                              ? new Date(payout.submitted_at).toLocaleDateString()
                              : new Date(payout.created_at).toLocaleDateString()}
                          </p>
                        </div>

                        <Badge className={cn(getPayoutStatusColor(payout.status), 'shrink-0')}>
                          {formatPayoutStatus(payout.status)}
                        </Badge>

                        {hasWireDetails && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            onClick={() => setExpandedPayout(isExpanded ? null : payout.id)}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {payout.contractor_invoice_url && (
                              <>
                                <DropdownMenuItem asChild>
                                  <a
                                    href={payout.contractor_invoice_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <FileText className="mr-2 h-4 w-4" />
                                    View Invoice
                                  </a>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}

                            {payout.status === 'pending' && (
                              <>
                                <DropdownMenuItem onClick={() => handleApprove(payout)} disabled={loading}>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setRejectDialog({ open: true, payout })}
                                  className="text-destructive"
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Reject
                                </DropdownMenuItem>
                              </>
                            )}

                            {payout.status === 'approved' && (
                              <DropdownMenuItem onClick={() => setPayDialog({ open: true, payout })}>
                                <DollarSign className="mr-2 h-4 w-4" />
                                Mark as Paid
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Wire Transfer Details (Expanded) */}
                    {isExpanded && hasWireDetails && (
                      <div className="border-t bg-muted/30 p-4">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-sm font-medium">Wire Transfer Details</p>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const allDetails = [
                                  `Amount: ${formatCurrency(payout.amount)}`,
                                  `Recipient: ${payout.wire_recipient_name}`,
                                  `Country: ${payout.wire_recipient_country}`,
                                  `SWIFT/BIC: ${payout.wire_swift_code}`,
                                  `Account: ${payout.wire_account_number}`,
                                  `Bank: ${payout.wire_bank_name}`,
                                  payout.wire_bank_address ? `Bank Address: ${payout.wire_bank_address}` : '',
                                  payout.wire_recipient_address ? `Recipient Address: ${payout.wire_recipient_address}` : '',
                                ].filter(Boolean).join('\n');
                                copyToClipboard(allDetails, `all-${payout.id}`);
                              }}
                            >
                              {copiedField === `all-${payout.id}` ? (
                                <>
                                  <Check className="h-3 w-3 mr-1" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3 mr-1" />
                                  Copy All
                                </>
                              )}
                            </Button>
                            {payout.status === 'pending' && (
                              <Button
                                size="sm"
                                onClick={() => setPayDialog({ open: true, payout })}
                              >
                                <Send className="h-3 w-3 mr-1" />
                                Mark as Sent
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <CopyableField
                            label="Amount"
                            value={formatCurrency(payout.amount)}
                            fieldId={`amount-${payout.id}`}
                          />
                          <CopyableField
                            label="Recipient Name"
                            value={payout.wire_recipient_name || ''}
                            fieldId={`recipient-${payout.id}`}
                          />
                          <CopyableField
                            label="Country"
                            value={payout.wire_recipient_country || ''}
                            fieldId={`country-${payout.id}`}
                          />
                          <CopyableField
                            label="SWIFT/BIC Code"
                            value={payout.wire_swift_code || ''}
                            fieldId={`swift-${payout.id}`}
                          />
                          <CopyableField
                            label="IBAN / Account Number"
                            value={payout.wire_account_number || ''}
                            fieldId={`account-${payout.id}`}
                          />
                          <CopyableField
                            label="Bank Name"
                            value={payout.wire_bank_name || ''}
                            fieldId={`bank-${payout.id}`}
                          />
                          {payout.wire_bank_address && (
                            <CopyableField
                              label="Bank Address"
                              value={payout.wire_bank_address}
                              fieldId={`bankaddr-${payout.id}`}
                            />
                          )}
                          {payout.wire_recipient_address && (
                            <div className="md:col-span-2">
                              <CopyableField
                                label="Recipient Address"
                                value={payout.wire_recipient_address}
                                fieldId={`recipientaddr-${payout.id}`}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Email Invoice Note */}
                    {payout.payment_preference === 'emailed_invoice' && !payout.contractor_invoice_url && payout.status === 'pending' && (
                      <div className="border-t bg-blue-500/5 px-4 py-2">
                        <p className="text-xs text-blue-400">
                          Developer will email invoice to ayman@hexonasystems.com
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Send className="h-12 w-12 opacity-50" />
              <p className="mt-4">No payouts found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog({ open, payout: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Payout</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this payout request. The developer will be notified.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter rejection reason..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, payout: null })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={loading || !rejectReason.trim()}>
              {loading ? 'Rejecting...' : 'Reject Payout'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay Dialog */}
      <Dialog open={payDialog.open} onOpenChange={(open) => setPayDialog({ open, payout: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Sent</DialogTitle>
            <DialogDescription>
              Record payment details after sending via Mercury. An expense will be automatically created.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {payDialog.payout && (
              <div className="rounded-lg bg-muted p-3">
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="text-lg font-semibold">{formatCurrency(payDialog.payout.amount)}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wire_transfer">Wire Transfer (Mercury)</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="wise">Wise</SelectItem>
                  <SelectItem value="crypto">Crypto</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Transaction Reference / ID</Label>
              <Input
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="TXN-123456789"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Any additional notes..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialog({ open: false, payout: null })}>
              Cancel
            </Button>
            <Button onClick={handlePay} disabled={loading || !paymentReference.trim()}>
              {loading ? 'Processing...' : 'Mark as Sent'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
