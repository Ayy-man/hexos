/**
 * Comprehensive Admin Metrics API
 *
 * Provides ALL metrics for admin dashboard across all categories:
 * - Inquiry Pipeline
 * - Project Health
 * - Developer Performance
 * - DFY Partner Performance
 * - Deliverables & Timeline
 * - Blockers & Issues
 * - Engagement & Activity
 * - Opportunities & Invitations
 */

import { createClient } from '@/lib/supabase/server';

// ============================================================================
// TYPES
// ============================================================================

export interface InquiryPipelineStage {
  stage: string;
  count: number;
  total_value: number;
  avg_value: number;
}

export interface InquiryConversionRates {
  total_inquiries: number;
  proposal_created: number;
  proposal_submitted: number;
  proposal_sent: number;
  closed_won: number;
  closed_lost: number;
  conversion_to_proposal: number;
  conversion_to_sent: number;
  win_rate: number;
  overall_conversion: number;
}

export interface InquirySource {
  source_type: string;
  source_name: string;
  inquiry_count: number;
  closed_count: number;
  win_rate: number;
  total_value: number;
}

export interface InquiryTimelineItem {
  month: string;
  created_count: number;
  sent_count: number;
  closed_count: number;
  lost_count: number;
}

export interface ProjectStatusDistribution {
  phase: string;
  status: string;
  project_count: number;
  total_value: number;
}

export interface ProjectHealthIndicators {
  total_active_projects: number;
  on_track_projects: number;
  at_risk_projects: number;
  blocked_projects: number;
  overdue_projects: number;
  on_hold_projects: number;
}

export interface ProjectTimelineMetrics {
  avg_duration_days: number;
  avg_time_to_start_days: number;
  avg_time_to_delivery_days: number;
  median_duration_days: number;
}

export interface DeveloperUtilization {
  dev_id: string;
  dev_name: string;
  active_projects: number;
  total_deliverables: number;
  pending_deliverables: number;
  in_progress_deliverables: number;
  completed_deliverables: number;
  hours_logged_this_month: number;
  is_available: boolean;
}

export interface TimeTrackingSummary {
  total_hours_logged: number;
  hours_this_month: number;
  hours_this_week: number;
  avg_hours_per_deliverable: number;
  active_timers_count: number;
}

export interface DFYPartnerPerformance {
  partner_id: string;
  partner_name: string;
  total_inquiries: number;
  closed_inquiries: number;
  lost_inquiries: number;
  win_rate: number;
  avg_deal_size: number;
  total_revenue: number;
  total_commission: number;
  avg_time_to_close_days: number;
}

export interface DeliverablesOverview {
  total_deliverables: number;
  pending_deliverables: number;
  in_progress_deliverables: number;
  blocked_deliverables: number;
  completed_deliverables: number;
  overdue_deliverables: number;
  completion_rate: number;
}

export interface BlockersOverview {
  total_active_blockers: number;
  critical_blockers: number;
  high_priority_blockers: number;
  unacknowledged_blockers: number;
  avg_time_to_acknowledge_hours: number;
  avg_time_to_resolve_hours: number;
  resolution_rate: number;
}

export interface ActivityOverview {
  total_activities: number;
  activities_this_month: number;
  activities_this_week: number;
  most_common_action: string | null;
  most_active_user_id: string | null;
  most_active_user_name: string | null;
}

export interface CommentStatistics {
  total_inquiry_comments: number;
  total_blocker_comments: number;
  total_deliverable_comments: number;
  unresolved_inquiry_comments: number;
  avg_response_time_hours: number;
}

export interface OpportunityMetrics {
  total_opportunities: number;
  open_opportunities: number;
  filled_opportunities: number;
  avg_time_to_fill_days: number;
  total_invitations: number;
  pending_invitations: number;
  accepted_invitations: number;
  declined_invitations: number;
  invitation_acceptance_rate: number;
  total_applications: number;
  pending_applications: number;
}

export interface ComprehensiveDashboardMetrics {
  financial: any;
  inquiry_pipeline: InquiryConversionRates;
  project_health: ProjectHealthIndicators;
  developer_performance: TimeTrackingSummary;
  blockers: BlockersOverview;
  deliverables: DeliverablesOverview;
  activity: ActivityOverview;
  opportunities: OpportunityMetrics;
}

// ============================================================================
// INQUIRY PIPELINE METRICS
// ============================================================================

export async function getInquiryPipelineBreakdown(): Promise<InquiryPipelineStage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_inquiry_pipeline_breakdown');

  if (error) {
    console.error('Error fetching inquiry pipeline breakdown:', error);
    return [];
  }

  return data as InquiryPipelineStage[];
}

export async function getInquiryConversionRates(): Promise<InquiryConversionRates | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_inquiry_conversion_rates').single();

  if (error) {
    console.error('Error fetching inquiry conversion rates:', error);
    return null;
  }

  return data as InquiryConversionRates;
}

export async function getInquiriesBySource(): Promise<InquirySource[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_inquiries_by_source');

  if (error) {
    console.error('Error fetching inquiries by source:', error);
    return [];
  }

  return data as InquirySource[];
}

export async function getInquiryTimeline(months: number = 12): Promise<InquiryTimelineItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_inquiry_timeline', { p_months: months });

  if (error) {
    console.error('Error fetching inquiry timeline:', error);
    return [];
  }

  return data as InquiryTimelineItem[];
}

// ============================================================================
// PROJECT HEALTH METRICS
// ============================================================================

export async function getProjectStatusDistribution(): Promise<ProjectStatusDistribution[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_project_status_distribution');

  if (error) {
    console.error('Error fetching project status distribution:', error);
    return [];
  }

  return data as ProjectStatusDistribution[];
}

export async function getProjectHealthIndicators(): Promise<ProjectHealthIndicators | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_project_health_indicators').single();

  if (error) {
    console.error('Error fetching project health indicators:', error);
    return null;
  }

  return data as ProjectHealthIndicators;
}

export async function getProjectTimelineMetrics(): Promise<ProjectTimelineMetrics | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_project_timeline_metrics').single();

  if (error) {
    console.error('Error fetching project timeline metrics:', error);
    return null;
  }

  return data as ProjectTimelineMetrics;
}

// ============================================================================
// DEVELOPER PERFORMANCE METRICS
// ============================================================================

export async function getDeveloperUtilization(): Promise<DeveloperUtilization[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_developer_utilization');

  if (error) {
    console.error('Error fetching developer utilization:', error);
    return [];
  }

  return data as DeveloperUtilization[];
}

export async function getTimeTrackingSummary(): Promise<TimeTrackingSummary | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_time_tracking_summary').single();

  if (error) {
    console.error('Error fetching time tracking summary:', error);
    return null;
  }

  return data as TimeTrackingSummary;
}

// ============================================================================
// DFY PARTNER METRICS
// ============================================================================

export async function getDFYPartnerPerformance(): Promise<DFYPartnerPerformance[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_dfy_partner_performance');

  if (error) {
    console.error('Error fetching DFY partner performance:', error);
    return [];
  }

  return data as DFYPartnerPerformance[];
}

// ============================================================================
// DELIVERABLES & TIMELINE METRICS
// ============================================================================

export async function getDeliverablesOverview(): Promise<DeliverablesOverview | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_deliverables_overview').single();

  if (error) {
    console.error('Error fetching deliverables overview:', error);
    return null;
  }

  return data as DeliverablesOverview;
}

// ============================================================================
// BLOCKER & ISSUE METRICS
// ============================================================================

export async function getBlockersOverview(): Promise<BlockersOverview | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_blockers_overview').single();

  if (error) {
    console.error('Error fetching blockers overview:', error);
    return null;
  }

  return data as BlockersOverview;
}

// ============================================================================
// ENGAGEMENT & ACTIVITY METRICS
// ============================================================================

export async function getActivityOverview(): Promise<ActivityOverview | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_activity_overview').single();

  if (error) {
    console.error('Error fetching activity overview:', error);
    return null;
  }

  return data as ActivityOverview;
}

export async function getCommentStatistics(): Promise<CommentStatistics | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_comment_statistics').single();

  if (error) {
    console.error('Error fetching comment statistics:', error);
    return null;
  }

  return data as CommentStatistics;
}

// ============================================================================
// OPPORTUNITY & INVITATION METRICS
// ============================================================================

export async function getOpportunityMetrics(): Promise<OpportunityMetrics | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_opportunity_metrics').single();

  if (error) {
    console.error('Error fetching opportunity metrics:', error);
    return null;
  }

  return data as OpportunityMetrics;
}

// ============================================================================
// COMPREHENSIVE DASHBOARD METRICS
// ============================================================================

/**
 * Get ALL dashboard metrics in a single call
 * This is the most efficient way to load the entire dashboard
 */
export async function getComprehensiveDashboardMetrics(): Promise<ComprehensiveDashboardMetrics | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_comprehensive_dashboard_metrics').single();

  if (error) {
    console.error('Error fetching comprehensive dashboard metrics:', error);
    return null;
  }

  return data as ComprehensiveDashboardMetrics;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

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
