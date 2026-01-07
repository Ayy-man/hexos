'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OverviewTab } from './tabs/OverviewTab';
import { PipelineTab } from './tabs/PipelineTab';
import { ProjectsTab } from './tabs/ProjectsTab';
import { TeamTab } from './tabs/TeamTab';
import { FinancialsTab } from './tabs/FinancialsTab';
import { HeroMetrics } from './HeroMetrics';
import type {
  InquiryConversionRates,
  InquiryPipelineStage,
  InquirySource,
  InquiryTimelineItem,
  ProjectHealthIndicators,
  ProjectStatusDistribution,
  ProjectTimelineMetrics,
  DeveloperUtilization,
  TimeTrackingSummary,
  DFYPartnerPerformance,
  DeliverablesOverview,
  BlockersOverview,
  ActivityOverview,
  OpportunityMetrics,
} from '@/lib/api/admin-metrics';

import type {
  FinancialHeroMetrics,
  OverduePayment,
  PaymentTimelineItem,
  RevenueTrendItem,
  PendingPaymentByProject,
  Expense,
  PaymentSource,
} from '@/lib/api/financial-metrics';

import type { InvoiceWithProject } from '@/lib/types/invoices';

interface Project {
  id: string;
  name: string;
}

interface MetricsDashboardProps {
  inquiryPipeline: InquiryPipelineStage[];
  inquiryConversion: InquiryConversionRates | null;
  inquirySources: InquirySource[];
  inquiryTimeline: InquiryTimelineItem[];
  projectHealth: ProjectHealthIndicators | null;
  projectStatus: ProjectStatusDistribution[];
  projectTimeline: ProjectTimelineMetrics | null;
  developerUtil: DeveloperUtilization[];
  timeTracking: TimeTrackingSummary | null;
  dfyPerformance: DFYPartnerPerformance[];
  deliverables: DeliverablesOverview | null;
  blockers: BlockersOverview | null;
  activity: ActivityOverview | null;
  opportunities: OpportunityMetrics | null;
  financial: FinancialHeroMetrics | null;
  overduePayments: OverduePayment[];
  paymentTimeline: PaymentTimelineItem[];
  revenueTrend: RevenueTrendItem[];
  pendingByProject: PendingPaymentByProject[];
  expenses: Expense[];
  paymentSources: PaymentSource[];
  projects: Project[];
  invoices: InvoiceWithProject[];
}

export function MetricsDashboard({
  inquiryPipeline,
  inquiryConversion,
  inquirySources,
  inquiryTimeline,
  projectHealth,
  projectStatus,
  projectTimeline,
  developerUtil,
  timeTracking,
  dfyPerformance,
  deliverables,
  blockers,
  activity,
  opportunities,
  financial,
  overduePayments,
  paymentTimeline,
  revenueTrend,
  pendingByProject,
  expenses,
  paymentSources,
  projects,
  invoices,
}: MetricsDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Business metrics and performance insights
        </p>
      </div>

      {/* Hero KPIs - Always visible */}
      <HeroMetrics
        financial={financial}
        projectHealth={projectHealth}
        blockers={blockers}
        overduePayments={overduePayments}
      />

      {/* Tabbed Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="financials">Financials</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <OverviewTab
            inquiryConversion={inquiryConversion}
            projectHealth={projectHealth}
            deliverables={deliverables}
            activity={activity}
            opportunities={opportunities}
            inquiryTimeline={inquiryTimeline}
          />
        </TabsContent>

        <TabsContent value="pipeline" className="space-y-4">
          <PipelineTab
            inquiryPipeline={inquiryPipeline}
            inquiryConversion={inquiryConversion}
            inquirySources={inquirySources}
            inquiryTimeline={inquiryTimeline}
          />
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <ProjectsTab
            projectHealth={projectHealth}
            projectStatus={projectStatus}
            projectTimeline={projectTimeline}
            deliverables={deliverables}
            blockers={blockers}
          />
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <TeamTab
            developerUtil={developerUtil}
            timeTracking={timeTracking}
            dfyPerformance={dfyPerformance}
          />
        </TabsContent>

        <TabsContent value="financials" className="space-y-4">
          <FinancialsTab
            financial={financial}
            paymentTimeline={paymentTimeline}
            revenueTrend={revenueTrend}
            pendingByProject={pendingByProject}
            overduePayments={overduePayments}
            expenses={expenses}
            paymentSources={paymentSources}
            projects={projects}
            invoices={invoices}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
