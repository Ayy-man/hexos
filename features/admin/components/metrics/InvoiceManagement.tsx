'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FileText,
  Plus,
  MoreHorizontal,
  Send,
  ExternalLink,
  Ban,
  Trash,
  Download,
  Copy,
  User,
  Receipt,
  Calendar,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { toast } from 'sonner';
import {
  addInvoice,
  editInvoice,
  sendInvoiceToClient,
  voidExistingInvoice,
  removeInvoice,
} from '@/features/admin/actions/financialActions';
import { formatCurrency } from '@/lib/api/financial-metrics-utils';
import type {
  Invoice,
  InvoiceWithProject,
  InvoiceStatus,
  InvoiceLineItem,
} from '@/lib/types/invoices';

interface Project {
  id: string;
  name: string;
}

interface InvoiceManagementProps {
  invoices: InvoiceWithProject[];
  projects: Project[];
}

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
  void: 'Void',
  overdue: 'Overdue',
  payment_failed: 'Payment Failed',
};

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-warning/10 text-warning',
  paid: 'bg-success/10 text-success',
  void: 'bg-muted text-muted-foreground line-through',
  overdue: 'bg-error/10 text-error',
  payment_failed: 'bg-error/10 text-error',
};

interface LineItemInput {
  description: string;
  quantity: number;
  unit_price: number;
}

export function InvoiceManagement({
  invoices,
  projects,
}: InvoiceManagementProps) {
  const router = useRouter();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceWithProject | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter state
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState({
    client_name: '',
    client_email: '',
    client_company: '',
    project_id: '',
    due_date: '',
    notes: '',
    tax_rate: 0,
  });

  const [lineItems, setLineItems] = useState<LineItemInput[]>([
    { description: '', quantity: 1, unit_price: 0 },
  ]);

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (filterStatus !== 'all' && inv.status !== filterStatus) return false;
      if (filterProject !== 'all' && inv.project_id !== filterProject)
        return false;
      return true;
    });
  }, [invoices, filterStatus, filterProject]);

  // Stats
  const stats = useMemo(() => {
    const total = invoices.length;
    const draft = invoices.filter((i) => i.status === 'draft').length;
    const sent = invoices.filter((i) => i.status === 'sent').length;
    const paid = invoices.filter((i) => i.status === 'paid').length;
    const outstanding = invoices
      .filter((i) => i.status === 'sent' || i.status === 'overdue')
      .reduce((sum, i) => sum + i.total, 0);

    return { total, draft, sent, paid, outstanding };
  }, [invoices]);

  const resetForm = useCallback(() => {
    setFormData({
      client_name: '',
      client_email: '',
      client_company: '',
      project_id: '',
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      notes: '',
      tax_rate: 0,
    });
    setLineItems([{ description: '', quantity: 1, unit_price: 0 }]);
  }, []);

  const handleOpenAdd = () => {
    resetForm();
    setEditingInvoice(null);
    setIsAddDialogOpen(true);
  };

  const handleOpenEdit = (invoice: InvoiceWithProject) => {
    if (invoice.status !== 'draft') {
      toast.error('Can only edit draft invoices');
      return;
    }

    setEditingInvoice(invoice);
    setFormData({
      client_name: invoice.client_name,
      client_email: invoice.client_email,
      client_company: invoice.client_company || '',
      project_id: invoice.project_id || '',
      due_date: invoice.due_date,
      notes: invoice.notes || '',
      tax_rate: invoice.tax_rate,
    });
    setLineItems(
      invoice.line_items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price / 100, // Convert from cents
      }))
    );
    setIsAddDialogOpen(true);
  };

  const handleAddLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, unit_price: 0 }]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleLineItemChange = (
    index: number,
    field: keyof LineItemInput,
    value: string | number
  ) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const subtotal = useMemo(() => {
    return lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unit_price * 100,
      0
    );
  }, [lineItems]);

  const taxAmount = Math.round(subtotal * formData.tax_rate);
  const total = subtotal + taxAmount;

  const handleSubmit = async () => {
    if (
      !formData.client_name ||
      !formData.client_email ||
      !formData.due_date ||
      lineItems.some((item) => !item.description || item.unit_price <= 0)
    ) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const invoiceData = {
        client_name: formData.client_name,
        client_email: formData.client_email,
        client_company: formData.client_company || null,
        project_id: formData.project_id || null,
        due_date: formData.due_date,
        notes: formData.notes || null,
        tax_rate: formData.tax_rate,
        line_items: lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: Math.round(item.unit_price * 100), // Convert to cents
        })),
      };

      if (editingInvoice) {
        const result = await editInvoice(editingInvoice.id, invoiceData);
        if (result.success) {
          toast.success('Invoice updated');
          setIsAddDialogOpen(false);
          resetForm();
          router.refresh();
        } else {
          toast.error(result.error || 'Failed to update invoice');
        }
      } else {
        const result = await addInvoice(invoiceData);
        if (result.success) {
          toast.success('Invoice created');
          setIsAddDialogOpen(false);
          resetForm();
          router.refresh();
        } else {
          toast.error(result.error || 'Failed to create invoice');
        }
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSend = async (invoiceId: string) => {
    setIsSubmitting(true);
    try {
      const result = await sendInvoiceToClient(invoiceId);
      if (result.success) {
        toast.success('Invoice sent to client');
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to send invoice');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoid = async (invoiceId: string) => {
    setIsSubmitting(true);
    try {
      const result = await voidExistingInvoice(invoiceId);
      if (result.success) {
        toast.success('Invoice voided');
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to void invoice');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (invoiceId: string) => {
    setIsSubmitting(true);
    try {
      const result = await removeInvoice(invoiceId);
      if (result.success) {
        toast.success('Invoice deleted');
        setIsAddDialogOpen(false);
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to delete invoice');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyPaymentLink = (invoice: InvoiceWithProject) => {
    const payUrl = `${window.location.origin}/pay/${invoice.id}`;
    navigator.clipboard.writeText(payUrl);
    toast.success('Payment link copied');
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Invoice Management
              </CardTitle>
              <CardDescription>
                Create and manage client invoices
              </CardDescription>
            </div>
            <Button size="sm" onClick={handleOpenAdd}>
              <Plus className="mr-2 h-4 w-4" />
              New Invoice
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{stats.draft}</div>
              <div className="text-xs text-muted-foreground">Drafts</div>
            </div>
            <div className="text-center p-3 bg-warning/10 rounded-lg">
              <div className="text-2xl font-bold text-warning">{stats.sent}</div>
              <div className="text-xs text-muted-foreground">Sent</div>
            </div>
            <div className="text-center p-3 bg-success/10 rounded-lg">
              <div className="text-2xl font-bold text-success">
                {formatCurrency(stats.outstanding / 100)}
              </div>
              <div className="text-xs text-muted-foreground">Outstanding</div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-4">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="void">Void</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterProject} onValueChange={setFilterProject}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {filteredInvoices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono text-sm">
                      {invoice.invoice_number}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{invoice.client_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {invoice.client_email}
                      </div>
                    </TableCell>
                    <TableCell>
                      {invoice.project_name || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[invoice.status]}>
                        {STATUS_LABELS[invoice.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(invoice.due_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(invoice.total / 100)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {invoice.status === 'draft' && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleOpenEdit(invoice)}
                              >
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleSend(invoice.id)}
                              >
                                <Send className="mr-2 h-4 w-4" />
                                Send to Client
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-error"
                                onClick={() => handleDelete(invoice.id)}
                              >
                                <Trash className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                          {invoice.status === 'sent' && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleCopyPaymentLink(invoice)}
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Copy Payment Link
                              </DropdownMenuItem>
                              {invoice.stripe_hosted_url && (
                                <DropdownMenuItem asChild>
                                  <a
                                    href={invoice.stripe_hosted_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    View on Stripe
                                  </a>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-error"
                                onClick={() => handleVoid(invoice.id)}
                              >
                                <Ban className="mr-2 h-4 w-4" />
                                Void Invoice
                              </DropdownMenuItem>
                            </>
                          )}
                          {invoice.status === 'paid' && (
                            <>
                              {invoice.stripe_pdf_url && (
                                <DropdownMenuItem asChild>
                                  <a
                                    href={invoice.stripe_pdf_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Download className="mr-2 h-4 w-4" />
                                    Download PDF
                                  </a>
                                </DropdownMenuItem>
                              )}
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mb-4 opacity-50" />
              <p>No invoices yet</p>
              <Button variant="link" onClick={handleOpenAdd}>
                Create your first invoice
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Add/Edit Invoice Sheet */}
      <Sheet open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <SheetContent className="w-full sm:max-w-xl md:max-w-2xl px-0 sm:px-0">
          <div className="flex flex-col h-full">
            <SheetHeader className="px-6 pt-6 pb-4 border-b">
              <SheetTitle>
                {editingInvoice ? 'Edit Invoice' : 'New Invoice'}
              </SheetTitle>
              <SheetDescription>
                {editingInvoice
                  ? 'Update invoice details'
                  : 'Create a new invoice for a client'}
              </SheetDescription>
            </SheetHeader>

            <ScrollArea className="flex-1 px-6">
              <div className="grid gap-6 py-6">
                {/* Client Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <User className="h-4 w-4" /> Client Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="client_name">Client Name *</Label>
                      <Input
                        id="client_name"
                        placeholder="John Doe"
                        value={formData.client_name}
                        onChange={(e) =>
                          setFormData({ ...formData, client_name: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="client_email">Client Email *</Label>
                      <Input
                        id="client_email"
                        type="email"
                        placeholder="john@example.com"
                        value={formData.client_email}
                        onChange={(e) =>
                          setFormData({ ...formData, client_email: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="client_company">Company</Label>
                      <Input
                        id="client_company"
                        placeholder="Acme Inc."
                        value={formData.client_company}
                        onChange={(e) =>
                          setFormData({ ...formData, client_company: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="project">Project</Label>
                      <Select
                        value={formData.project_id || 'none'}
                        onValueChange={(v) =>
                          setFormData({
                            ...formData,
                            project_id: v === 'none' ? '' : v,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Project</SelectItem>
                          {projects.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Line Items */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Receipt className="h-4 w-4" /> Line Items
                  </h3>
                  <div className="space-y-3">
                    {lineItems.map((item, index) => (
                      <div key={index} className="flex gap-2 items-start py-2 p-3 bg-muted/30 rounded-md border border-border/50 group hover:border-border transition-colors">
                        <div className="grid gap-2 flex-1">
                          <Input
                            placeholder="Description"
                            className="bg-background"
                            value={item.description}
                            onChange={(e) =>
                              handleLineItemChange(index, 'description', e.target.value)
                            }
                          />
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              placeholder="Qty"
                              className="w-20 bg-background"
                              value={item.quantity}
                              onChange={(e) =>
                                handleLineItemChange(
                                  index,
                                  'quantity',
                                  parseInt(e.target.value) || 1
                                )
                              }
                            />
                            <div className="relative flex-1">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                              <Input
                                type="text"
                                inputMode="decimal"
                                placeholder="Price"
                                className="pl-6 bg-background"
                                value={item.unit_price || ''}
                                onChange={(e) =>
                                  handleLineItemChange(
                                    index,
                                    'unit_price',
                                    parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0
                                  )
                                }
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="text-sm font-medium pt-2 w-20 text-right">
                            {formatCurrency((item.quantity * item.unit_price))}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleRemoveLineItem(index)}
                            disabled={lineItems.length === 1}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddLineItem}
                      className="w-full border-dashed"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Line Item
                    </Button>
                  </div>
                </div>

                {/* Totals Box */}
                <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(subtotal / 100)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Tax Rate</span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        inputMode="decimal"
                        className="w-16 h-7 text-right bg-background"
                        value={formData.tax_rate * 100 || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            tax_rate: (parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0) / 100,
                          })
                        }
                      />
                      <span className="text-muted-foreground">%</span>
                    </div>
                  </div>
                  {taxAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax Amount</span>
                      <span>{formatCurrency(taxAmount / 100)}</span>
                    </div>
                  )}
                  <Separator className="bg-border/50" />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total Due</span>
                    <span className="text-primary">{formatCurrency(total / 100)}</span>
                  </div>
                </div>

                <Separator />

                {/* Due Date & Notes */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Dates & Notes
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="due_date">Due Date *</Label>
                      <Input
                        id="due_date"
                        type="date"
                        value={formData.due_date}
                        onChange={(e) =>
                          setFormData({ ...formData, due_date: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Additional notes for the invoice..."
                      className="min-h-[100px]"
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
            </ScrollArea>

            <SheetFooter className="px-6 py-4 border-t bg-muted/20">
              <div className="flex justify-between w-full items-center">
                <div>
                  {editingInvoice && (
                    <Button
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(editingInvoice.id)}
                      disabled={isSubmitting}
                      size="sm"
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      Delete Invoice
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting
                      ? 'Saving...'
                      : editingInvoice
                        ? 'Update Invoice'
                        : 'Create Invoice'}
                  </Button>
                </div>
              </div>
            </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
