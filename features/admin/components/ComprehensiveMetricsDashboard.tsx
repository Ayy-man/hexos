/**
 * Comprehensive Admin Metrics Dashboard
 *
 * ALL metrics in one place:
 * - Executive Overview
 * - Inquiry Pipeline
 * - Project Health
 * - Financial Metrics
 * - Developer Performance
 * - DFY Partner Performance
 * - Deliverables & Timeline
 * - Blockers & Issues
 * - Engagement & Activity
 * - Opportunities & Invitations
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  FileText,
  Clock,
  AlertCircle,
  CheckCircle2,
  Target,
  Activity,
  MessageSquare,
  Briefcase,
} from 'lucide-react';

import {
  fetchInquiryPipelineBreakdown,
  fetchInquiryConversionRates,
  fetchInquiriesBySource,
  fetchProjectHealthIndicators,
  fetchProjectStatusDistribution,
  fetchProjectTimelineMetrics,
  fetchDeveloperUtilization,
  fetchTimeTrackingSummary,
  fetchDFYPartnerPerformance,
  fetchDeliverablesOverview,
  fetchBlockersOverview,
  fetchActivityOverview,
  fetchCommentStatistics,
  fetchOpportunityMetrics,
} from '../actions/metricsActions';

import { fetchFinancialHeroMetrics, fetchOverduePayments } from '../actions/financialActions';
import { formatCurrency, formatPercentage } from '@/lib/api/financial-metrics';
import { formatNumber, formatHours, getHealthStatus } from '@/lib/api/admin-metrics';

export async function ComprehensiveMetricsDashboard() {
  // Fetch all metrics in parallel
  const [
    inquiryPipelineRes,
    inquiryConversionRes,
    inquirySourcesRes,
    projectHealthRes,
    projectStatusRes,
    projectTimelineRes,
    developerUtilRes,
    timeTrackingRes,
    dfyPerformanceRes,
    deliverablesRes,
    blockersRes,
    activityRes,
    commentsRes,
    opportunitiesRes,
    financialRes,
    overduePaymentsRes,
  ] = await Promise.all([
    fetchInquiryPipelineBreakdown(),
    fetchInquiryConversionRates(),
    fetchInquiriesBySource(),
    fetchProjectHealthIndicators(),
    fetchProjectStatusDistribution(),
    fetchProjectTimelineMetrics(),
    fetchDeveloperUtilization(),
    fetchTimeTrackingSummary(),
    fetchDFYPartnerPerformance(),
    fetchDeliverablesOverview(),
    fetchBlockersOverview(),
    fetchActivityOverview(),
    fetchCommentStatistics(),
    fetchOpportunityMetrics(),
    fetchFinancialHeroMetrics(),
    fetchOverduePayments(),
  ]);

  const inquiryPipeline = inquiryPipelineRes.data || [];
  const inquiryConversion = inquiryConversionRes.data;
  const inquirySources = inquirySourcesRes.data || [];
  const projectHealth = projectHealthRes.data;
  const projectStatus = projectStatusRes.data || [];
  const projectTimeline = projectTimelineRes.data;
  const developerUtil = developerUtilRes.data || [];
  const timeTracking = timeTrackingRes.data;
  const dfyPerformance = dfyPerformanceRes.data || [];
  const deliverables = deliverablesRes.data;
  const blockers = blockersRes.data;
  const activity = activityRes.data;
  const comments = commentsRes.data;
  const opportunities = opportunitiesRes.data;
  const financial = financialRes.data;
  const overduePayments = overduePaymentsRes.data || [];

  // Calculate health status
  const healthStatus = projectHealth
    ? getHealthStatus(
        projectHealth.on_track_projects,
        projectHealth.at_risk_projects,
        projectHealth.blocked_projects
      )
    : 'healthy';

  return (
    <div className="space-y-8">
      {/* PAGE HEADER */}
      <div>
        <h1 className="text-3xl font-bold">Metrics Dashboard</h1>
        <p className="text-muted-foreground">
          Comprehensive analytics across all business operations
        </p>
      </div>

      {/* CRITICAL ALERTS */}
      {(overduePayments.length > 0 || (blockers && blockers.critical_blockers > 0)) && (
        <div className="space-y-2">
          {overduePayments.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Overdue Payments</AlertTitle>
              <AlertDescription>
                {overduePayments.length} payment{overduePayments.length > 1 ? 's' : ''} overdue
                totaling{' '}
                {formatCurrency(overduePayments.reduce((sum, p) => sum + Number(p.amount), 0))}
              </AlertDescription>
            </Alert>
          )}
          {blockers && blockers.critical_blockers > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Critical Blockers</AlertTitle>
              <AlertDescription>
                {blockers.critical_blockers} critical blocker
                {blockers.critical_blockers > 1 ? 's' : ''} require immediate attention
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* ========== SECTION 1: EXECUTIVE OVERVIEW ========== */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Executive Overview</h2>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Revenue */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {financial ? formatCurrency(financial.total_revenue) : '$0'}
              </div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          {/* Active Projects */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {projectHealth?.total_active_projects || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                <Badge
                  variant={
                    healthStatus === 'healthy'
                      ? 'default'
                      : healthStatus === 'warning'
                      ? 'secondary'
                      : 'destructive'
                  }
                  className="text-xs"
                >
                  {healthStatus}
                </Badge>
              </p>
            </CardContent>
          </Card>

          {/* Active Inquiries */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Inquiries</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {financial?.active_inquiries || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {financial ? formatPercentage(financial.win_rate * 100) : '0%'} win rate
              </p>
            </CardContent>
          </Card>

          {/* Projected Revenue */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Projected Revenue</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {financial ? formatCurrency(financial.projected_revenue) : '$0'}
              </div>
              <p className="text-xs text-muted-foreground">Next 3 months</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ========== SECTION 2: INQUIRY PIPELINE ========== */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Inquiry Pipeline</h2>

        <div className="grid gap-4 md:grid-cols-3">
          {/* Conversion Rates */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Conversion Funnel</CardTitle>
              <CardDescription>Last 6 months</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {inquiryConversion && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Total Inquiries</span>
                      <span className="font-bold">{inquiryConversion.total_inquiries}</span>
                    </div>
                    <Progress value={100} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Proposal Created</span>
                      <span className="font-bold">
                        {inquiryConversion.proposal_created} (
                        {formatPercentage(inquiryConversion.conversion_to_proposal)})
                      </span>
                    </div>
                    <Progress value={inquiryConversion.conversion_to_proposal} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Proposal Sent</span>
                      <span className="font-bold">
                        {inquiryConversion.proposal_sent} (
                        {formatPercentage(inquiryConversion.conversion_to_sent)})
                      </span>
                    </div>
                    <Progress value={inquiryConversion.conversion_to_sent} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Closed Won</span>
                      <span className="font-bold text-green-600">
                        {inquiryConversion.closed_won} (
                        {formatPercentage(inquiryConversion.overall_conversion)})
                      </span>
                    </div>
                    <Progress value={inquiryConversion.overall_conversion} className="bg-green-100" />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Pipeline Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Pipeline Stages</CardTitle>
              <CardDescription>Current active inquiries</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {inquiryPipeline.map((stage) => (
                  <div key={stage.stage} className="flex items-center justify-between text-sm">
                    <span className="capitalize">{stage.stage.replace(/_/g, ' ')}</span>
                    <Badge variant="secondary">{stage.count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Performing Sources */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Sources</CardTitle>
            <CardDescription>By inquiry volume and win rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {inquirySources.slice(0, 10).map((source) => (
                <div
                  key={`${source.source_type}-${source.source_name}`}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="space-y-1">
                    <div className="font-medium">{source.source_name}</div>
                    <div className="text-sm text-muted-foreground">{source.source_type}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{source.inquiry_count} inquiries</div>
                    <div className="text-sm text-muted-foreground">
                      {formatPercentage(source.win_rate)} win rate •{' '}
                      {formatCurrency(source.total_value)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ========== SECTION 3: PROJECT HEALTH ========== */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Project Health</h2>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">On Track</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projectHealth?.on_track_projects || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">At Risk</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projectHealth?.at_risk_projects || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Blocked</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projectHealth?.blocked_projects || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">On Hold</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projectHealth?.on_hold_projects || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Project Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Project Status Distribution</CardTitle>
            <CardDescription>Active projects by phase and status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(
                projectStatus.reduce((acc, item) => {
                  if (!acc[item.phase]) acc[item.phase] = [];
                  acc[item.phase].push(item);
                  return acc;
                }, {} as Record<string, typeof projectStatus>)
              ).map(([phase, statuses]) => (
                <div key={phase} className="space-y-2">
                  <div className="font-medium">{phase}</div>
                  <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
                    {statuses.map((status) => (
                      <div
                        key={status.status}
                        className="rounded-lg border p-2 text-center"
                      >
                        <div className="text-sm text-muted-foreground capitalize">
                          {status.status.replace(/_/g, ' ')}
                        </div>
                        <div className="text-lg font-bold">{status.project_count}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Timeline Metrics */}
        {projectTimeline && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Avg Project Duration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{projectTimeline.avg_duration_days} days</div>
                <p className="text-xs text-muted-foreground">
                  Median: {projectTimeline.median_duration_days} days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Time to Start</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {projectTimeline.avg_time_to_start_days} days
                </div>
                <p className="text-xs text-muted-foreground">From inquiry to project start</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Time to Delivery</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {projectTimeline.avg_time_to_delivery_days} days
                </div>
                <p className="text-xs text-muted-foreground">From start to delivery</p>
              </CardContent>
            </Card>
          </div>
        )}
      </section>

      {/* ========== SECTION 4: DEVELOPER PERFORMANCE ========== */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Developer Performance</h2>

        {timeTracking && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Hours This Month</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatHours(timeTracking.hours_this_month)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Hours This Week</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatHours(timeTracking.hours_this_week)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Hours/Deliverable</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatHours(timeTracking.avg_hours_per_deliverable)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Timers</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{timeTracking.active_timers_count}</div>
                <p className="text-xs text-muted-foreground">Working right now</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Developer Utilization Table */}
        <Card>
          <CardHeader>
            <CardTitle>Developer Utilization</CardTitle>
            <CardDescription>Workload and performance by developer</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {developerUtil.map((dev) => (
                <div key={dev.dev_id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-1">
                    <div className="font-medium flex items-center gap-2">
                      {dev.dev_name}
                      {dev.is_available && (
                        <Badge variant="default" className="text-xs">
                          Available
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {dev.active_projects} projects • {dev.total_deliverables} deliverables
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {formatHours(dev.hours_logged_this_month)} this month
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {dev.in_progress_deliverables} in progress • {dev.completed_deliverables}{' '}
                      done
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ========== SECTION 5: DFY PARTNER PERFORMANCE ========== */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">DFY Partner Performance</h2>

        <Card>
          <CardHeader>
            <CardTitle>Partner Leaderboard</CardTitle>
            <CardDescription>Performance metrics by partner</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dfyPerformance.map((partner) => (
                <div
                  key={partner.partner_id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="space-y-1">
                    <div className="font-medium">{partner.partner_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {partner.total_inquiries} inquiries • {partner.closed_inquiries} closed •{' '}
                      {partner.lost_inquiries} lost
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {formatPercentage(partner.win_rate)} win rate
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatCurrency(partner.total_revenue)} revenue •{' '}
                      {formatCurrency(partner.total_commission)} commission
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ========== SECTION 6: DELIVERABLES & BLOCKERS ========== */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Deliverables & Blockers</h2>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Deliverables */}
          {deliverables && (
            <Card>
              <CardHeader>
                <CardTitle>Deliverables Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Total</span>
                  <span className="font-bold">{deliverables.total_deliverables}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Pending</span>
                  <Badge variant="secondary">{deliverables.pending_deliverables}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>In Progress</span>
                  <Badge variant="default">{deliverables.in_progress_deliverables}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Completed</span>
                  <Badge variant="default">{deliverables.completed_deliverables}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Blocked</span>
                  <Badge variant="destructive">{deliverables.blocked_deliverables}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Overdue</span>
                  <Badge variant="destructive">{deliverables.overdue_deliverables}</Badge>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Completion Rate</span>
                    <span className="font-bold">
                      {formatPercentage(deliverables.completion_rate)}
                    </span>
                  </div>
                  <Progress value={deliverables.completion_rate} className="mt-2" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Blockers */}
          {blockers && (
            <Card>
              <CardHeader>
                <CardTitle>Blockers Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Active Blockers</span>
                  <span className="font-bold">{blockers.total_active_blockers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Critical Priority</span>
                  <Badge variant="destructive">{blockers.critical_blockers}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>High Priority</span>
                  <Badge variant="secondary">{blockers.high_priority_blockers}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Unacknowledged</span>
                  <Badge variant="secondary">{blockers.unacknowledged_blockers}</Badge>
                </div>
                <div className="pt-2 border-t space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Avg Time to Acknowledge</span>
                    <span className="text-sm font-medium">
                      {formatHours(blockers.avg_time_to_acknowledge_hours)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Avg Time to Resolve</span>
                    <span className="text-sm font-medium">
                      {formatHours(blockers.avg_time_to_resolve_hours)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Resolution Rate</span>
                    <span className="text-sm font-medium">
                      {formatPercentage(blockers.resolution_rate)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* ========== SECTION 7: ENGAGEMENT & ACTIVITY ========== */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Engagement & Activity</h2>

        <div className="grid gap-4 md:grid-cols-3">
          {activity && (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(activity.total_activities)}</div>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(activity.activities_this_month)} this month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">This Week</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatNumber(activity.activities_this_week)}
                  </div>
                  <p className="text-xs text-muted-foreground">Activities</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Most Active User</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold truncate">
                    {activity.most_active_user_name || 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {activity.most_common_action || 'N/A'}
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Comments */}
        {comments && (
          <Card>
            <CardHeader>
              <CardTitle>Comment Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span>Blocker Comments</span>
                <Badge variant="secondary">{formatNumber(comments.total_blocker_comments)}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Deliverable Comments</span>
                <Badge variant="secondary">
                  {formatNumber(comments.total_deliverable_comments)}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      {/* ========== SECTION 8: OPPORTUNITIES & INVITATIONS ========== */}
      {opportunities && (
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Opportunities & Invitations</h2>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Opportunities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total</span>
                  <span className="font-bold">{opportunities.total_opportunities}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Open</span>
                  <Badge variant="default">{opportunities.open_opportunities}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Filled</span>
                  <Badge variant="secondary">{opportunities.filled_opportunities}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Avg Time to Fill</span>
                  <span className="text-sm font-medium">
                    {opportunities.avg_time_to_fill_days} days
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Invitations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total</span>
                  <span className="font-bold">{opportunities.total_invitations}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Pending</span>
                  <Badge variant="secondary">{opportunities.pending_invitations}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Accepted</span>
                  <Badge variant="default">{opportunities.accepted_invitations}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Declined</span>
                  <Badge variant="destructive">{opportunities.declined_invitations}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Acceptance Rate</span>
                  <span className="text-sm font-medium">
                    {formatPercentage(opportunities.invitation_acceptance_rate)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Applications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total</span>
                  <span className="font-bold">{opportunities.total_applications}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Pending Review</span>
                  <Badge variant="secondary">{opportunities.pending_applications}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}
    </div>
  );
}
