'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  RefreshCw,
  Plus,
  MoreVertical,
  Play,
  Pause,
  XCircle,
  Trash2,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  createRetainer,
  pauseRetainer,
  resumeRetainer,
  cancelRetainer,
  deleteRetainer,
  generateRetainerInvoice,
  type RetainerFormData,
} from '../actions/retainerActions';

interface Retainer {
  id: string;
  client_name: string;
  client_email: string;
  project_id: string | null;
  amount: number;
  currency: string;
  billing_day: number;
  billing_frequency: 'monthly' | 'quarterly' | 'yearly';
  description: string;
  status: 'active' | 'paused' | 'cancelled';
  next_invoice_date: string;
  last_invoice_id: string | null;
  last_invoice_date: string | null;
  start_date: string;
  end_date: string | null;
  projects?: { project_name: string } | null;
}

interface Project {
  id: string;
  project_name: string;
  client_name: string;
}

interface RetainerManagementProps {
  retainers: Retainer[];
  projects: Project[];
}

const FREQUENCY_LABELS = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

export function RetainerManagement({ retainers: initialRetainers, projects }: RetainerManagementProps) {
  const [retainers, setRetainers] = useState(initialRetainers);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'pause' | 'resume' | 'cancel' | 'delete';
    retainer: Retainer;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<RetainerFormData>({
    client_name: '',
    client_email: '',
    project_id: null,
    amount: 0,
    currency: 'usd',
    billing_day: 1,
    billing_frequency: 'monthly',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: null,
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount / 100);

  const handleProjectChange = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      setFormData((prev) => ({
        ...prev,
        project_id: projectId,
        client_name: project.client_name,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        project_id: null,
      }));
    }
  };

  const handleCreateRetainer = async () => {
    if (!formData.client_name || !formData.client_email || !formData.amount || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    const result = await createRetainer({
      ...formData,
      amount: Math.round(formData.amount * 100), // Convert to cents
    });

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Retainer created successfully');
      setShowCreateDialog(false);
      setFormData({
        client_name: '',
        client_email: '',
        project_id: null,
        amount: 0,
        currency: 'usd',
        billing_day: 1,
        billing_frequency: 'monthly',
        description: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: null,
      });
      // Optimistically add to list
      if (result.retainer) {
        setRetainers((prev) => [result.retainer, ...prev]);
      }
    }
    setLoading(false);
  };

  const handleAction = async () => {
    if (!confirmAction) return;

    setLoading(true);
    let result;

    switch (confirmAction.type) {
      case 'pause':
        result = await pauseRetainer(confirmAction.retainer.id);
        break;
      case 'resume':
        result = await resumeRetainer(confirmAction.retainer.id);
        break;
      case 'cancel':
        result = await cancelRetainer(confirmAction.retainer.id);
        break;
      case 'delete':
        result = await deleteRetainer(confirmAction.retainer.id);
        break;
    }

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success(
        confirmAction.type === 'delete'
          ? 'Retainer deleted'
          : `Retainer ${confirmAction.type}d successfully`
      );
      // Update local state
      if (confirmAction.type === 'delete') {
        setRetainers((prev) => prev.filter((r) => r.id !== confirmAction.retainer.id));
      } else {
        setRetainers((prev) =>
          prev.map((r) =>
            r.id === confirmAction.retainer.id
              ? {
                  ...r,
                  status:
                    confirmAction.type === 'pause'
                      ? 'paused'
                      : confirmAction.type === 'resume'
                        ? 'active'
                        : 'cancelled',
                }
              : r
          )
        );
      }
    }

    setConfirmAction(null);
    setLoading(false);
  };

  const handleGenerateInvoice = async (retainer: Retainer) => {
    setLoading(true);
    const result = await generateRetainerInvoice(retainer.id);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Invoice generated successfully');
      // Update local state with new invoice info
      setRetainers((prev) =>
        prev.map((r) =>
          r.id === retainer.id
            ? {
                ...r,
                last_invoice_id: result.invoice?.id,
                last_invoice_date: new Date().toISOString().split('T')[0],
              }
            : r
        )
      );
    }
    setLoading(false);
  };

  const activeRetainers = retainers.filter((r) => r.status === 'active');
  const pausedRetainers = retainers.filter((r) => r.status === 'paused');
  const cancelledRetainers = retainers.filter((r) => r.status === 'cancelled');

  const totalMonthlyValue = activeRetainers.reduce((sum, r) => {
    const monthlyAmount =
      r.billing_frequency === 'monthly'
        ? r.amount
        : r.billing_frequency === 'quarterly'
          ? r.amount / 3
          : r.amount / 12;
    return sum + monthlyAmount;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Retainers</h1>
          <p className="text-muted-foreground">Manage recurring client retainers</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Retainer
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Retainers</CardDescription>
            <CardTitle className="text-2xl">{activeRetainers.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Monthly Recurring</CardDescription>
            <CardTitle className="text-2xl text-green-500">{formatCurrency(totalMonthlyValue)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Paused</CardDescription>
            <CardTitle className="text-2xl text-muted-foreground">{pausedRetainers.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Active Retainers */}
      {activeRetainers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Active Retainers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeRetainers.map((retainer) => (
                <RetainerRow
                  key={retainer.id}
                  retainer={retainer}
                  onAction={setConfirmAction}
                  onGenerateInvoice={handleGenerateInvoice}
                  formatCurrency={formatCurrency}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Paused Retainers */}
      {pausedRetainers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Paused Retainers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pausedRetainers.map((retainer) => (
                <RetainerRow
                  key={retainer.id}
                  retainer={retainer}
                  onAction={setConfirmAction}
                  onGenerateInvoice={handleGenerateInvoice}
                  formatCurrency={formatCurrency}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancelled Retainers */}
      {cancelledRetainers.length > 0 && (
        <Card className="opacity-60">
          <CardHeader>
            <CardTitle className="text-lg">Cancelled Retainers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {cancelledRetainers.map((retainer) => (
                <RetainerRow
                  key={retainer.id}
                  retainer={retainer}
                  onAction={setConfirmAction}
                  onGenerateInvoice={handleGenerateInvoice}
                  formatCurrency={formatCurrency}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {retainers.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">No Retainers</h3>
            <p className="mt-1 max-w-md text-center text-sm text-muted-foreground">
              Set up recurring monthly retainers for clients. Automatically generate and send invoices on a
              schedule.
            </p>
            <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Retainer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Retainer</DialogTitle>
            <DialogDescription>Set up a recurring invoice for a client.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Project (Optional)</Label>
              <Select onValueChange={handleProjectChange} value={formData.project_id || ''}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No project</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.project_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Client Name *</Label>
                <Input
                  value={formData.client_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, client_name: e.target.value }))}
                  placeholder="Client name"
                />
              </div>
              <div className="grid gap-2">
                <Label>Client Email *</Label>
                <Input
                  type="email"
                  value={formData.client_email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, client_email: e.target.value }))}
                  placeholder="client@example.com"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Description *</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Monthly consulting retainer"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Amount *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amount || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="grid gap-2">
                <Label>Frequency</Label>
                <Select
                  value={formData.billing_frequency}
                  onValueChange={(v) =>
                    setFormData((prev) => ({
                      ...prev,
                      billing_frequency: v as 'monthly' | 'quarterly' | 'yearly',
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Billing Day</Label>
                <Select
                  value={formData.billing_day.toString()}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, billing_day: parseInt(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                      <SelectItem key={day} value={day.toString()}>
                        {day}
                        {day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} of the month
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, start_date: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRetainer} disabled={loading}>
              {loading ? 'Creating...' : 'Create Retainer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Action Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'delete' && 'Delete Retainer'}
              {confirmAction?.type === 'cancel' && 'Cancel Retainer'}
              {confirmAction?.type === 'pause' && 'Pause Retainer'}
              {confirmAction?.type === 'resume' && 'Resume Retainer'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'delete' &&
                'This will permanently delete this retainer. This action cannot be undone.'}
              {confirmAction?.type === 'cancel' &&
                'This will cancel the retainer. No more invoices will be generated.'}
              {confirmAction?.type === 'pause' &&
                'This will pause the retainer. No invoices will be generated until resumed.'}
              {confirmAction?.type === 'resume' &&
                'This will resume the retainer and schedule the next invoice.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              className={cn(
                confirmAction?.type === 'delete' && 'bg-destructive text-destructive-foreground',
                confirmAction?.type === 'cancel' && 'bg-destructive text-destructive-foreground'
              )}
            >
              {loading ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RetainerRow({
  retainer,
  onAction,
  onGenerateInvoice,
  formatCurrency,
}: {
  retainer: Retainer;
  onAction: (action: { type: 'pause' | 'resume' | 'cancel' | 'delete'; retainer: Retainer }) => void;
  onGenerateInvoice: (retainer: Retainer) => void;
  formatCurrency: (amount: number) => string;
}) {
  const statusColors = {
    active: 'bg-green-500/20 text-green-400',
    paused: 'bg-yellow-500/20 text-yellow-400',
    cancelled: 'bg-red-500/20 text-red-400',
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3 sm:gap-4">
        <RefreshCw
          className={cn(
            'h-5 w-5 shrink-0',
            retainer.status === 'active' && 'text-green-500',
            retainer.status === 'paused' && 'text-yellow-500',
            retainer.status === 'cancelled' && 'text-muted-foreground'
          )}
        />
        <div className="min-w-0">
          <p className="font-medium truncate">{retainer.client_name}</p>
          <p className="text-sm text-muted-foreground truncate">
            {retainer.description}
            {retainer.projects?.project_name && ` • ${retainer.projects.project_name}`}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 sm:gap-4">
        <div className="sm:text-right">
          <p className="font-medium">{formatCurrency(retainer.amount)}</p>
          <p className="text-xs text-muted-foreground">{FREQUENCY_LABELS[retainer.billing_frequency]}</p>
        </div>

        {retainer.status === 'active' && (
          <div className="hidden sm:block sm:text-right">
            <p className="text-sm text-muted-foreground">Next invoice</p>
            <p className="text-sm">{new Date(retainer.next_invoice_date).toLocaleDateString()}</p>
          </div>
        )}

        <Badge className={cn(statusColors[retainer.status], 'shrink-0')}>{retainer.status}</Badge>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {retainer.status === 'active' && (
              <>
                <DropdownMenuItem onClick={() => onGenerateInvoice(retainer)}>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Invoice Now
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAction({ type: 'pause', retainer })}>
                  <Pause className="mr-2 h-4 w-4" />
                  Pause Retainer
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onAction({ type: 'cancel', retainer })}
                  className="text-destructive"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel Retainer
                </DropdownMenuItem>
              </>
            )}
            {retainer.status === 'paused' && (
              <>
                <DropdownMenuItem onClick={() => onAction({ type: 'resume', retainer })}>
                  <Play className="mr-2 h-4 w-4" />
                  Resume Retainer
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onAction({ type: 'cancel', retainer })}
                  className="text-destructive"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel Retainer
                </DropdownMenuItem>
              </>
            )}
            {retainer.status === 'cancelled' && (
              <DropdownMenuItem
                onClick={() => onAction({ type: 'delete', retainer })}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Permanently
              </DropdownMenuItem>
            )}
            {retainer.last_invoice_id && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/finances/invoices/${retainer.last_invoice_id}`}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View Last Invoice
                  </Link>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
