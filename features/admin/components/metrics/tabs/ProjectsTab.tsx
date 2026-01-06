'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Bar, BarChart, XAxis, YAxis, Cell } from 'recharts';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Pause,
  Download,
  Copy,
  BarChart3,
} from 'lucide-react';
import { formatCurrency } from '@/lib/api/financial-metrics';
import { formatHours } from '@/lib/api/admin-metrics';
import type {
  ProjectHealthIndicators,
  ProjectStatusDistribution,
  ProjectTimelineMetrics,
  DeliverablesOverview,
  BlockersOverview,
} from '@/lib/api/admin-metrics';

interface ProjectsTabProps {
  projectHealth: ProjectHealthIndicators | null;
  projectStatus: ProjectStatusDistribution[];
  projectTimeline: ProjectTimelineMetrics | null;
  deliverables: DeliverablesOverview | null;
  blockers: BlockersOverview | null;
}

const chartConfig: ChartConfig = {
  count: {
    label: 'Projects',
    color: 'hsl(var(--chart-1))',
  },
};

// Color palette for bars
const COLORS = [
  'hsl(217.2 91.2% 59.8%)',
  'hsl(142.1 76.2% 36.3%)',
  'hsl(47.9 95.8% 53.1%)',
  'hsl(280 65% 60%)',
  'hsl(0 84.2% 60.2%)',
  'hsl(24.6 95% 53.1%)',
  'hsl(173 80% 40%)',
  'hsl(262 83% 58%)',
];

export function ProjectsTab({
  projectHealth,
  projectStatus,
  projectTimeline,
  deliverables,
  blockers,
}: ProjectsTabProps) {
  // Group by phase and aggregate
  const phaseData = projectStatus.reduce((acc, item) => {
    const existing = acc.find((p) => p.phase === item.phase);
    if (existing) {
      existing.count += item.project_count;
      existing.value += item.total_value;
    } else {
      acc.push({
        phase: item.phase,
        count: item.project_count,
        value: item.total_value,
      });
    }
    return acc;
  }, [] as { phase: string; count: number; value: number }[]);

  // Sort by count descending for horizontal bar chart
  const sortedPhaseData = [...phaseData].sort((a, b) => b.count - a.count);

  const handleExportCSV = () => {
    const headers = ['Phase', 'Status', 'Count', 'Value'];
    const rows = projectStatus.map((s) => [
      s.phase,
      s.status,
      s.project_count,
      formatCurrency(s.total_value),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project-status.csv';
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Health Indicators */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Track</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {projectHealth?.on_track_projects || 0}
            </div>
            <p className="text-xs text-muted-foreground">Projects progressing well</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At Risk</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {projectHealth?.at_risk_projects || 0}
            </div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blocked</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {projectHealth?.blocked_projects || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {blockers?.critical_blockers || 0} critical blockers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Hold</CardTitle>
            <Pause className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {projectHealth?.on_hold_projects || 0}
            </div>
            <p className="text-xs text-muted-foreground">Paused projects</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Phase Breakdown - Horizontal Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Projects by Phase
            </CardTitle>
            <CardDescription>Distribution across project lifecycle</CardDescription>
          </CardHeader>
          <CardContent>
            {sortedPhaseData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChart data={sortedPhaseData} layout="vertical">
                  <XAxis type="number" tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="phase"
                    tickLine={false}
                    axisLine={false}
                    width={100}
                    tickFormatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {sortedPhaseData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deliverables & Blockers Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Deliverables & Blockers</CardTitle>
            <CardDescription>Current workload status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Deliverables */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Deliverables</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Pending</span>
                  <Badge variant="secondary">{deliverables?.pending_deliverables || 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">In Progress</span>
                  <Badge variant="default">{deliverables?.in_progress_deliverables || 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Completed</span>
                  <Badge variant="outline">{deliverables?.completed_deliverables || 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Blocked</span>
                  <Badge variant="destructive">{deliverables?.blocked_deliverables || 0}</Badge>
                </div>
              </div>
            </div>

            {/* Blockers */}
            <div className="space-y-3 pt-4 border-t">
              <h4 className="text-sm font-medium">Blockers</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Active</span>
                  <Badge variant="secondary">{blockers?.total_active_blockers || 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Critical</span>
                  <Badge variant="destructive">{blockers?.critical_blockers || 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Avg Resolution</span>
                  <span className="text-sm font-medium">
                    {formatHours(blockers?.avg_time_to_resolve_hours || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Resolution Rate</span>
                  <span className="text-sm font-medium">
                    {blockers?.resolution_rate?.toFixed(0) || 0}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline Metrics */}
      {projectTimeline && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Avg Duration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projectTimeline.avg_duration_days} days</div>
              <p className="text-xs text-muted-foreground">
                Median: {projectTimeline.median_duration_days} days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Time to Start</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projectTimeline.avg_time_to_start_days} days</div>
              <p className="text-xs text-muted-foreground">From inquiry to kickoff</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Time to Delivery</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projectTimeline.avg_time_to_delivery_days} days</div>
              <p className="text-xs text-muted-foreground">From start to delivery</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">
                {projectHealth?.overdue_projects || 0}
              </div>
              <p className="text-xs text-muted-foreground">Past target date</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status Distribution Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Status Distribution</CardTitle>
              <CardDescription>Detailed breakdown by phase and status</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Phase</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">% of Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectStatus.map((status, index) => {
                const totalProjects = projectStatus.reduce((sum, s) => sum + s.project_count, 0);
                const percentage = totalProjects > 0
                  ? ((status.project_count / totalProjects) * 100).toFixed(1)
                  : '0';
                return (
                  <TableRow key={`${status.phase}-${status.status}`}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium capitalize">{status.phase}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {status.status.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{status.project_count}</TableCell>
                    <TableCell className="text-right">{formatCurrency(status.total_value)}</TableCell>
                    <TableCell className="text-right">{percentage}%</TableCell>
                  </TableRow>
                );
              })}
              {projectStatus.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No project status data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
