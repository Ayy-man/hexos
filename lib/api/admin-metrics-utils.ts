/**
 * Admin Metrics Utility Functions
 *
 * These are client-safe utility functions extracted from admin-metrics.ts
 * for use in Client Components.
 */

/**
 * Format number with commas
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format hours to human readable
 */
export function formatHours(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)}m`;
  }
  if (hours >= 8) {
    const days = (hours / 8).toFixed(1);
    return `${days}d`;
  }
  return `${hours.toFixed(1)}h`;
}

/**
 * Get status badge color
 */
export function getStatusColor(status: string): 'default' | 'success' | 'warning' | 'destructive' {
  const statusLower = status.toLowerCase();

  if (statusLower.includes('complete') || statusLower.includes('done') || statusLower.includes('resolved')) {
    return 'success';
  }
  if (statusLower.includes('block') || statusLower.includes('overdue') || statusLower.includes('critical')) {
    return 'destructive';
  }
  if (statusLower.includes('pending') || statusLower.includes('review') || statusLower.includes('progress')) {
    return 'warning';
  }
  return 'default';
}

/**
 * Get health status
 */
export function getHealthStatus(
  onTrack: number,
  atRisk: number,
  blocked: number
): 'healthy' | 'warning' | 'critical' {
  const total = onTrack + atRisk + blocked;
  if (total === 0) return 'healthy';

  const blockedPercent = (blocked / total) * 100;
  const atRiskPercent = (atRisk / total) * 100;

  if (blockedPercent > 20 || atRiskPercent > 40) return 'critical';
  if (blockedPercent > 10 || atRiskPercent > 25) return 'warning';
  return 'healthy';
}
