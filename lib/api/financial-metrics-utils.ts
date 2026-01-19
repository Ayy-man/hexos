/**
 * Financial Metrics Utility Functions
 *
 * These are client-safe utility functions extracted from financial-metrics.ts
 * for use in Client Components.
 */

/**
 * Calculate payment completion percentage for a project
 */
export function calculatePaymentCompletion(
  paidAmount: number,
  totalAmount: number
): number {
  if (totalAmount === 0) return 0;
  return Math.round((paidAmount / totalAmount) * 100);
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number): string {
  return `${Math.round(value * 100) / 100}%`;
}

/**
 * Get payment urgency level
 */
export function getPaymentUrgency(dueDate: string): 'overdue' | 'due_soon' | 'upcoming' {
  const due = new Date(dueDate);
  const now = new Date();
  const daysDiff = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff < 0) return 'overdue';
  if (daysDiff <= 7) return 'due_soon';
  return 'upcoming';
}
