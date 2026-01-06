import { MetricsDashboard } from '@/features/admin/components/metrics';
import { requireRole } from '@/lib/auth/guards';
import {
  fetchInquiryPipelineBreakdown,
  fetchInquiryConversionRates,
  fetchInquiriesBySource,
  fetchInquiryTimeline,
  fetchProjectHealthIndicators,
  fetchProjectStatusDistribution,
  fetchProjectTimelineMetrics,
  fetchDeveloperUtilization,
  fetchTimeTrackingSummary,
  fetchDFYPartnerPerformance,
  fetchDeliverablesOverview,
  fetchBlockersOverview,
  fetchActivityOverview,
  fetchOpportunityMetrics,
} from '@/features/admin/actions/metricsActions';
import { fetchFinancialHeroMetrics, fetchOverduePayments } from '@/features/admin/actions/financialActions';

export default async function MetricsPage() {
  await requireRole(['admin']);

  // Fetch all metrics in parallel
  const [
    inquiryPipelineRes,
    inquiryConversionRes,
    inquirySourcesRes,
    inquiryTimelineRes,
    projectHealthRes,
    projectStatusRes,
    projectTimelineRes,
    developerUtilRes,
    timeTrackingRes,
    dfyPerformanceRes,
    deliverablesRes,
    blockersRes,
    activityRes,
    opportunitiesRes,
    financialRes,
    overduePaymentsRes,
  ] = await Promise.all([
    fetchInquiryPipelineBreakdown(),
    fetchInquiryConversionRates(),
    fetchInquiriesBySource(),
    fetchInquiryTimeline(6),
    fetchProjectHealthIndicators(),
    fetchProjectStatusDistribution(),
    fetchProjectTimelineMetrics(),
    fetchDeveloperUtilization(),
    fetchTimeTrackingSummary(),
    fetchDFYPartnerPerformance(),
    fetchDeliverablesOverview(),
    fetchBlockersOverview(),
    fetchActivityOverview(),
    fetchOpportunityMetrics(),
    fetchFinancialHeroMetrics(),
    fetchOverduePayments(),
  ]);

  return (
    <MetricsDashboard
      inquiryPipeline={inquiryPipelineRes.data || []}
      inquiryConversion={inquiryConversionRes.data}
      inquirySources={inquirySourcesRes.data || []}
      inquiryTimeline={inquiryTimelineRes.data || []}
      projectHealth={projectHealthRes.data}
      projectStatus={projectStatusRes.data || []}
      projectTimeline={projectTimelineRes.data}
      developerUtil={developerUtilRes.data || []}
      timeTracking={timeTrackingRes.data}
      dfyPerformance={dfyPerformanceRes.data || []}
      deliverables={deliverablesRes.data}
      blockers={blockersRes.data}
      activity={activityRes.data}
      opportunities={opportunitiesRes.data}
      financial={financialRes.data}
      overduePayments={overduePaymentsRes.data || []}
    />
  );
}
