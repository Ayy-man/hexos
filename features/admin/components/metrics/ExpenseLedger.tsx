'use client';

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ExcelTable } from '@/components/ui/excel-style-table';
import { Plus, Receipt, Download, RefreshCw, Calendar, DollarSign, CreditCard, Trash } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { addExpense, editExpense, removeExpense } from '@/features/admin/actions/financialActions';
import { formatCurrency } from '@/lib/api/financial-metrics-utils';
import type {
  Expense,
  PaymentSource,
  ExpenseCategory,
} from '@/lib/api/financial-metrics';

interface Project {
  id: string;
  name: string;
}

interface ExpenseLedgerProps {
  expenses: Expense[];
  paymentSources: PaymentSource[];
  projects: Project[];
}

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  direct_cost: 'Direct Cost',
  contractor: 'Contractor',
  tools_ops: 'Tools/Ops',
  other: 'Other',
};

const CATEGORY_OPTIONS: ExpenseCategory[] = ['direct_cost', 'contractor', 'tools_ops', 'other'];

export function ExpenseLedger({ expenses, paymentSources, projects }: ExpenseLedgerProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    category: 'direct_cost' as ExpenseCategory,
    project_id: '',
    payment_source_id: paymentSources[0]?.id || '',
    reimbursed: false,
    is_recurring: false,
    recurring_frequency: 'monthly' as 'weekly' | 'monthly' | 'quarterly' | 'yearly',
    recurring_day: 1,
  });

  // Filter state
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      if (filterProject !== 'all' && expense.project_id !== filterProject) {
        if (filterProject === 'overhead' && expense.project_id !== null) return false;
        if (filterProject !== 'overhead' && expense.project_id !== filterProject) return false;
      }
      if (filterCategory !== 'all' && expense.category !== filterCategory) return false;
      return true;
    });
  }, [expenses, filterProject, filterCategory]);

  // Transform expenses to table data
  const tableData = useMemo(() => {
    return filteredExpenses.map((expense) => [
      new Date(expense.date).toLocaleDateString(),
      (expense as any).is_recurring ? `🔄 ${expense.description}` : expense.description,
      expense.project_name || 'Overhead',
      CATEGORY_LABELS[expense.category],
      expense.payment_source_label || '-',
      formatCurrency(expense.amount),
    ]);
  }, [filteredExpenses]);

  const tableHeaders = ['Date', 'Description', 'Project', 'Category', 'Card', 'Amount'];

  const resetForm = useCallback(() => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      description: '',
      amount: '',
      category: 'direct_cost',
      project_id: '',
      payment_source_id: paymentSources[0]?.id || '',
      reimbursed: false,
      is_recurring: false,
      recurring_frequency: 'monthly',
      recurring_day: 1,
    });
  }, [paymentSources]);

  const handleOpenAdd = () => {
    resetForm();
    setEditingExpense(null);
    setIsAddDialogOpen(true);
  };

  const handleOpenEdit = (rowIndex: number) => {
    const expense = filteredExpenses[rowIndex];
    if (!expense) return;

    setEditingExpense(expense);
    setFormData({
      date: expense.date,
      description: expense.description,
      amount: expense.amount.toString(),
      category: expense.category,
      project_id: expense.project_id || '',
      payment_source_id: expense.payment_source_id,
      reimbursed: expense.reimbursed,
      is_recurring: (expense as any).is_recurring || false,
      recurring_frequency: (expense as any).recurring_frequency || 'monthly',
      recurring_day: (expense as any).recurring_day || 1,
    });
    setIsAddDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.description || !formData.amount || !formData.payment_source_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const expenseData = {
        date: formData.date,
        description: formData.description,
        amount: parseFloat(formData.amount),
        category: formData.category,
        project_id: formData.project_id || null,
        payment_source_id: formData.payment_source_id,
        reimbursed: formData.reimbursed,
        is_recurring: formData.is_recurring,
        recurring_frequency: formData.is_recurring ? formData.recurring_frequency : null,
        recurring_day: formData.is_recurring ? formData.recurring_day : null,
      };

      if (editingExpense) {
        const result = await editExpense(editingExpense.id, expenseData);
        if (result.success) {
          toast.success('Expense updated');
          setIsAddDialogOpen(false);
          resetForm();
        } else {
          toast.error(result.error || 'Failed to update expense');
        }
      } else {
        const result = await addExpense(expenseData);
        if (result.success) {
          toast.success('Expense added');
          setIsAddDialogOpen(false);
          resetForm();
        } else {
          toast.error(result.error || 'Failed to add expense');
        }
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingExpense) return;

    setIsSubmitting(true);
    try {
      const result = await removeExpense(editingExpense.id);
      if (result.success) {
        toast.success('Expense deleted');
        setIsAddDialogOpen(false);
        resetForm();
        setEditingExpense(null);
      } else {
        toast.error(result.error || 'Failed to delete expense');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCellChange = async (row: number, col: number, value: string) => {
    const expense = filteredExpenses[row];
    if (!expense) return;

    // Map column index to field
    const fieldMap: Record<number, string> = {
      0: 'date',
      1: 'description',
      5: 'amount',
    };

    const field = fieldMap[col];
    if (!field) {
      // For project/category/card, open edit dialog
      handleOpenEdit(row);
      return;
    }

    let updateValue: any = value;
    if (field === 'amount') {
      updateValue = parseFloat(value.replace(/[^0-9.-]/g, ''));
      if (isNaN(updateValue)) return;
    }

    const result = await editExpense(expense.id, { [field]: updateValue });
    if (result.success) {
      toast.success('Updated');
    } else {
      toast.error('Failed to update');
    }
  };

  const handleExport = () => {
    const headers = ['Date', 'Description', 'Project', 'Category', 'Card', 'Amount', 'Reimbursed'];
    const rows = filteredExpenses.map((e) => [
      e.date,
      e.description,
      e.project_name || 'Overhead',
      CATEGORY_LABELS[e.category],
      e.payment_source_label || '',
      e.amount.toString(),
      e.reimbursed ? 'Yes' : 'No',
    ]);

    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported to CSV');
  };

  const totalFiltered = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Expense Ledger
              </CardTitle>
              <CardDescription>
                Track and manage all business expenses
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button size="sm" onClick={handleOpenAdd}>
                <Plus className="mr-2 h-4 w-4" />
                Add Expense
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="w-48">
              <Select value={filterProject} onValueChange={setFilterProject}>
                <SelectTrigger>
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  <SelectItem value="overhead">Overhead Only</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-40">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORY_OPTIONS.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1" />
            <div className="text-sm text-muted-foreground self-center">
              Total: <span className="font-semibold text-foreground">{formatCurrency(totalFiltered)}</span>
              {' '}({filteredExpenses.length} expenses)
            </div>
          </div>

          {/* Table */}
          {filteredExpenses.length > 0 ? (
            <div className="[&_.text-lg]:hidden">
              <ExcelTable
                data={tableData}
                headers={tableHeaders}
                editable={true}
                title=""
                onCellChange={handleCellChange}
                exportFilename={`expenses-${new Date().toISOString().split('T')[0]}.csv`}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Receipt className="h-12 w-12 mb-4 opacity-50" />
              <p>No expenses recorded yet</p>
              <Button variant="link" onClick={handleOpenAdd}>
                Add your first expense
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      {/* Add/Edit Expense Sheet */}
      <Sheet open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <SheetContent className="w-full sm:max-w-md md:max-w-lg px-0">
          <div className="flex flex-col h-full">
            <SheetHeader className="px-6 pt-6 pb-4 border-b">
              <SheetTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                {editingExpense ? 'Edit Expense' : 'Add Expense'}
              </SheetTitle>
              <SheetDescription>
                {editingExpense ? 'Update expense details' : 'Record a new business expense'}
              </SheetDescription>
            </SheetHeader>

            <ScrollArea className="flex-1 px-6">
              <div className="grid gap-6 py-6">
                {/* Transaction Details */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Transaction Info
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        className="bg-background"
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input
                          id="amount"
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          className="pl-6 bg-background"
                          value={formData.amount}
                          onChange={(e) => setFormData({ ...formData, amount: e.target.value.replace(/[^0-9.]/g, '') })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      placeholder="What was this expense for?"
                      className="bg-background"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </div>

                <Separator />

                {/* Allocation */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Allocation
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(v) => setFormData({ ...formData, category: v as ExpenseCategory })}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORY_OPTIONS.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {CATEGORY_LABELS[cat]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="project">Project</Label>
                      <Select
                        value={formData.project_id || 'overhead'}
                        onValueChange={(v) => setFormData({ ...formData, project_id: v === 'overhead' ? '' : v })}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="overhead">Overhead (No Project)</SelectItem>
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

                {/* Payment Origin */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <CreditCard className="h-4 w-4" /> Payment Details
                  </h3>
                  <div className="space-y-2">
                    <Label htmlFor="payment_source">Payment Source</Label>
                    {paymentSources.length === 0 ? (
                      <p className="text-sm text-destructive">
                        No payment sources found.
                      </p>
                    ) : (
                      <Select
                        value={formData.payment_source_id}
                        onValueChange={(v) => setFormData({ ...formData, payment_source_id: v })}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select payment source" />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentSources.map((ps) => (
                            <SelectItem key={ps.id} value={ps.id}>
                              {ps.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                {/* Recurring Expense Section */}
                <div className="space-y-4 rounded-xl border-2 border-dashed border-primary/10 bg-primary/[0.02] p-5">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_recurring"
                      checked={formData.is_recurring}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_recurring: checked === true })
                      }
                    />
                    <Label htmlFor="is_recurring" className="flex items-center gap-2 font-semibold cursor-pointer">
                      <RefreshCw className="h-4 w-4 text-primary" />
                      Make this a recurring expense
                    </Label>
                  </div>

                  {formData.is_recurring && (
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Frequency</Label>
                        <Select
                          value={formData.recurring_frequency}
                          onValueChange={(v) =>
                            setFormData({
                              ...formData,
                              recurring_frequency: v as 'weekly' | 'monthly' | 'quarterly' | 'yearly',
                            })
                          }
                        >
                          <SelectTrigger className="bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                          {formData.recurring_frequency === 'weekly' ? 'Day of Week' : 'Day of Month'}
                        </Label>
                        <Select
                          value={formData.recurring_day.toString()}
                          onValueChange={(v) => setFormData({ ...formData, recurring_day: parseInt(v) })}
                        >
                          <SelectTrigger className="bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {formData.recurring_frequency === 'weekly' ? (
                              <>
                                <SelectItem value="1">Monday</SelectItem>
                                <SelectItem value="2">Tuesday</SelectItem>
                                <SelectItem value="3">Wednesday</SelectItem>
                                <SelectItem value="4">Thursday</SelectItem>
                                <SelectItem value="5">Friday</SelectItem>
                                <SelectItem value="6">Saturday</SelectItem>
                                <SelectItem value="7">Sunday</SelectItem>
                              </>
                            ) : (
                              Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                                <SelectItem key={day} value={day.toString()}>
                                  {day}
                                  {day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>

            <SheetFooter className="px-6 py-4 border-t bg-muted/20">
              <div className="flex justify-between w-full items-center">
                <div>
                  {editingExpense && (
                    <Button
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={handleDelete}
                      disabled={isSubmitting}
                      size="sm"
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : editingExpense ? 'Update Expense' : 'Add Expense'}
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
