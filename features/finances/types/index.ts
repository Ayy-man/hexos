export interface Invoice {
  id: string;
  invoice_number: string;
  status: 'draft' | 'sent' | 'paid' | 'void' | 'overdue';
  client_name: string;
  client_email: string;
  client_company?: string;
  project_id?: string;
  milestone_id?: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  issue_date: string;
  due_date: string;
  paid_at?: string;
  stripe_invoice_id?: string;
  stripe_hosted_url?: string;
  stripe_pdf_url?: string;
  line_items: InvoiceLineItem[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: 'direct_cost' | 'contractor' | 'tools_ops' | 'other';
  project_id?: string;
  payment_source_id: string;
  paid_by?: string;
  reimbursed: boolean;
  receipt_url?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentMilestone {
  id: string;
  project_id: string;
  label: string;
  amount: number;
  due_date: string;
  paid_at?: string;
  invoice_id?: string;
  sort_order: number;
  created_at: string;
  projects?: {
    name: string;
    client_name: string;
  };
}

export interface Project {
  id: string;
  project_name: string;
  client_name: string;
  price_dfy: string;
  status: string;
}

export interface FinancialMetrics {
  revenue: number;
  expenses: number;
  netProfit: number;
  margin: number;
  revenueChange?: number;
  expensesChange?: number;
  profitChange?: number;
  marginChange?: number;
}

export interface CashFlowMonth {
  month: string;
  expected: number;
  collected: number;
}

export interface FinancialAction {
  id: string;
  type: 'invoice_overdue' | 'milestone_due' | 'project_closed_unpaid' | 'invoice_draft';
  severity: 'warning' | 'info';
  message: string;
  action: string;
  entityId: string;
  entityType: 'invoice' | 'milestone' | 'project';
}

export interface ActivityItem {
  id: string;
  type: string;
  description: string;
  date: string;
  projectId?: string;
}
