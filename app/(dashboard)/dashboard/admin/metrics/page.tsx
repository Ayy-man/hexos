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
import {
  fetchFinancialHeroMetrics,
  fetchOverduePayments,
  fetchPaymentTimeline,
  fetchRevenueTrend,
  fetchPendingPaymentsByProject,
  fetchExpenses,
  fetchPaymentSources,
  fetchInvoices,
} from '@/features/admin/actions/financialActions';
import { createClient } from '@/lib/supabase/server';

export default async function MetricsPage() {
  await requireRole(['admin']);

  // Fetch projects for expense dropdown
  const supabase = await createClient();
  const { data: projectsData } = await supabase
    .from('projects')
    .select('id, name')
    .order('name');

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
    paymentTimelineRes,
    revenueTrendRes,
    pendingByProjectRes,
    expensesRes,
    paymentSourcesRes,
    invoicesRes,
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
    fetchPaymentTimeline(6),
    fetchRevenueTrend(6),
    fetchPendingPaymentsByProject(),
    fetchExpenses(),
    fetchPaymentSources(),
    fetchInvoices(),
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
      paymentTimeline={paymentTimelineRes.data || []}
      revenueTrend={revenueTrendRes.data || []}
      pendingByProject={pendingByProjectRes.data || []}
      expenses={expensesRes.data || []}
      paymentSources={paymentSourcesRes.data || []}
      projects={projectsData || []}
      invoices={invoicesRes.data || []}
    />
  );
}
