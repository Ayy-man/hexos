'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Area, AreaChart, XAxis, YAxis } from 'recharts';
import {
  CheckCircle2,
  Clock,
  FileText,
  Users,
  Briefcase,
  TrendingUp,
} from 'lucide-react';
import { formatPercentage } from '@/lib/api/admin-metrics';
import type {
  InquiryConversionRates,
  InquiryTimelineItem,
  ProjectHealthIndicators,
  DeliverablesOverview,
  ActivityOverview,
  OpportunityMetrics,
} from '@/lib/api/admin-metrics';

interface OverviewTabProps {
  inquiryConversion: InquiryConversionRates | null;
  projectHealth: ProjectHealthIndicators | null;
  deliverables: DeliverablesOverview | null;
  activity: ActivityOverview | null;
  opportunities: OpportunityMetrics | null;
  inquiryTimeline: InquiryTimelineItem[];
}

const chartConfig: ChartConfig = {
  created: {
    label: 'Created',
    color: 'hsl(var(--chart-1))',
  },
  closed: {
    label: 'Closed',
    color: 'hsl(var(--chart-2))',
  },
};

export function OverviewTab({
  inquiryConversion,
  projectHealth,
  deliverables,
  activity,
  opportunities,
  inquiryTimeline,
}: OverviewTabProps) {
  // Transform timeline data for chart
  const chartData = inquiryTimeline.slice(-6).map((item) => ({
    month: item.month,
    created: item.created_count,
    closed: item.closed_count,
  }));

  return (
    <div className="space-y-4">
      {/* Quick Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {inquiryConversion ? formatPercentage(inquiryConversion.win_rate) : '0%'}
            </div>
            <Progress
              value={inquiryConversion?.win_rate || 0}
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deliverables Done</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {deliverables?.completed_deliverables || 0}
              <span className="text-sm font-normal text-muted-foreground">
                /{deliverables?.total_deliverables || 0}
              </span>
            </div>
            <Progress
              value={deliverables?.completion_rate || 0}
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Opportunities</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {opportunities?.open_opportunities || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {opportunities?.pending_applications || 0} pending applications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activity This Week</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activity?.activities_this_week || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {activity?.most_active_user_name || 'No activity'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Inquiry Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Inquiry Trend
            </CardTitle>
            <CardDescription>Created vs closed over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[200px] w-full">
                <AreaChart data={chartData}>
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => {
                      const date = new Date(value + '-01');
                      return date.toLocaleDateString('en-US', { month: 'short' });
                    }}
                  />
                  <YAxis tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="created"
                    stackId="1"
                    stroke="var(--color-created)"
                    fill="var(--color-created)"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="closed"
                    stackId="2"
                    stroke="var(--color-closed)"
                    fill="var(--color-closed)"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Project Health Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Project Health
            </CardTitle>
            <CardDescription>Current project status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span className="text-sm">On Track</span>
                </div>
                <Badge variant="secondary">{projectHealth?.on_track_projects || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-orange-500" />
                  <span className="text-sm">At Risk</span>
                </div>
                <Badge variant="secondary">{projectHealth?.at_risk_projects || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <span className="text-sm">Blocked</span>
                </div>
                <Badge variant="destructive">{projectHealth?.blocked_projects || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-stone-400" />
                  <span className="text-sm">On Hold</span>
                </div>
                <Badge variant="outline">{projectHealth?.on_hold_projects || 0}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Funnel */}
      {inquiryConversion && (
        <Card>
          <CardHeader>
            <CardTitle>Conversion Funnel</CardTitle>
            <CardDescription>Last 6 months pipeline performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <FunnelStep
                label="Total Inquiries"
                value={inquiryConversion.total_inquiries}
                percentage={100}
                color="bg-stone-500"
              />
              <FunnelStep
                label="Proposal Created"
                value={inquiryConversion.proposal_created}
                percentage={inquiryConversion.conversion_to_proposal}
                color="bg-blue-500"
              />
              <FunnelStep
                label="Proposal Sent"
                value={inquiryConversion.proposal_sent}
                percentage={inquiryConversion.conversion_to_sent}
                color="bg-violet-500"
              />
              <FunnelStep
                label="Closed Won"
                value={inquiryConversion.closed_won}
                percentage={inquiryConversion.overall_conversion}
                color="bg-green-500"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FunnelStep({
  label,
  value,
  percentage,
  color,
}: {
  label: string;
  value: number;
  percentage: number;
  color: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium">
          {value} ({formatPercentage(percentage)})
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full transition-all ${color}`}
          style={{ width: `${Math.max(percentage, 2)}%` }}
        />
      </div>
    </div>
  );
}
