'use server';

/**
 * Server Actions for Comprehensive Admin Metrics
 *
 * All metrics across all categories for admin dashboard
 */

import {
  getInquiryPipelineBreakdown,
  getInquiryConversionRates,
  getInquiriesBySource,
  getInquiryTimeline,
  getProjectStatusDistribution,
  getProjectHealthIndicators,
  getProjectTimelineMetrics,
  getDeveloperUtilization,
  getTimeTrackingSummary,
  getDFYPartnerPerformance,
  getDeliverablesOverview,
  getBlockersOverview,
  getActivityOverview,
  getCommentStatistics,
  getOpportunityMetrics,
  getComprehensiveDashboardMetrics,
} from '@/lib/api/admin-metrics';

// ============================================================================
// INQUIRY PIPELINE
// ============================================================================

export async function fetchInquiryPipelineBreakdown() {
  const data = await getInquiryPipelineBreakdown();
  return { success: true, data };
}

export async function fetchInquiryConversionRates() {
  const data = await getInquiryConversionRates();
  return { success: true, data };
}

export async function fetchInquiriesBySource() {
  const data = await getInquiriesBySource();
  return { success: true, data };
}

export async function fetchInquiryTimeline(months: number = 12) {
  const data = await getInquiryTimeline(months);
  return { success: true, data };
}

// ============================================================================
// PROJECT HEALTH
// ============================================================================

export async function fetchProjectStatusDistribution() {
  const data = await getProjectStatusDistribution();
  return { success: true, data };
}

export async function fetchProjectHealthIndicators() {
  const data = await getProjectHealthIndicators();
  return { success: true, data };
}

export async function fetchProjectTimelineMetrics() {
  const data = await getProjectTimelineMetrics();
  return { success: true, data };
}

// ============================================================================
// DEVELOPER PERFORMANCE
// ============================================================================

export async function fetchDeveloperUtilization() {
  const data = await getDeveloperUtilization();
  return { success: true, data };
}

export async function fetchTimeTrackingSummary() {
  const data = await getTimeTrackingSummary();
  return { success: true, data };
}

// ============================================================================
// DFY PARTNER PERFORMANCE
// ============================================================================

export async function fetchDFYPartnerPerformance() {
  const data = await getDFYPartnerPerformance();
  return { success: true, data };
}

// ============================================================================
// DELIVERABLES
// ============================================================================

export async function fetchDeliverablesOverview() {
  const data = await getDeliverablesOverview();
  return { success: true, data };
}

// ============================================================================
// BLOCKERS
// ============================================================================

export async function fetchBlockersOverview() {
  const data = await getBlockersOverview();
  return { success: true, data };
}

// ============================================================================
// ENGAGEMENT & ACTIVITY
// ============================================================================

export async function fetchActivityOverview() {
  const data = await getActivityOverview();
  return { success: true, data };
}

export async function fetchCommentStatistics() {
  const data = await getCommentStatistics();
  return { success: true, data };
}

// ============================================================================
// OPPORTUNITIES
// ============================================================================

export async function fetchOpportunityMetrics() {
  const data = await getOpportunityMetrics();
  return { success: true, data };
}

// ============================================================================
// COMPREHENSIVE DASHBOARD
// ============================================================================

/**
 * Fetch ALL dashboard metrics in a single call
 * Most efficient way to load the entire dashboard
 */
export async function fetchComprehensiveDashboardMetrics() {
  const data = await getComprehensiveDashboardMetrics();
  return { success: true, data };
}
