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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ExcelTable } from '@/components/ui/excel-style-table';
import { Plus, Receipt, Download } from 'lucide-react';
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
      expense.description,
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
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
            <DialogDescription>
              {editingExpense ? 'Update expense details' : 'Record a new business expense'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="What was this expense for?"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v as ExpenseCategory })}
                >
                  <SelectTrigger>
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
                  <SelectTrigger>
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

            <div className="space-y-2">
              <Label htmlFor="payment_source">Payment Source</Label>
              {paymentSources.length === 0 ? (
                <p className="text-sm text-destructive">
                  No payment sources found. Check database RLS policies.
                </p>
              ) : (
                <Select
                  value={formData.payment_source_id}
                  onValueChange={(v) => setFormData({ ...formData, payment_source_id: v })}
                >
                  <SelectTrigger>
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

          <DialogFooter className="flex justify-between">
            {editingExpense && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isSubmitting}
              >
                Delete
              </Button>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : editingExpense ? 'Update' : 'Add Expense'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
