'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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
  Users,
  Clock,
  Award,
  Download,
  Activity,
} from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/lib/api/financial-metrics-utils';
import { formatHours } from '@/lib/api/admin-metrics-utils';
import type {
  DeveloperUtilization,
  TimeTrackingSummary,
  DFYPartnerPerformance,
} from '@/lib/api/admin-metrics';

interface TeamTabProps {
  developerUtil: DeveloperUtilization[];
  timeTracking: TimeTrackingSummary | null;
  dfyPerformance: DFYPartnerPerformance[];
}

const chartConfig: ChartConfig = {
  hours: {
    label: 'Hours',
    color: 'hsl(var(--chart-1))',
  },
};

const COLORS = [
  'hsl(217.2 91.2% 59.8%)',
  'hsl(280 65% 60%)',
  'hsl(142.1 76.2% 36.3%)',
  'hsl(47.9 95.8% 53.1%)',
  'hsl(24.6 95% 53.1%)',
];

export function TeamTab({
  developerUtil,
  timeTracking,
  dfyPerformance,
}: TeamTabProps) {
  // Transform developer data for chart
  const devChartData = developerUtil.slice(0, 5).map((dev) => ({
    name: dev.dev_name.split(' ')[0],
    hours: dev.hours_logged_this_month,
    fullName: dev.dev_name,
  }));

  const handleExportDevCSV = () => {
    const headers = ['Developer', 'Active Projects', 'Deliverables', 'In Progress', 'Completed', 'Hours This Month'];
    const rows = developerUtil.map((d) => [
      d.dev_name,
      d.active_projects,
      d.total_deliverables,
      d.in_progress_deliverables,
      d.completed_deliverables,
      d.hours_logged_this_month,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'developer-utilization.csv';
    a.click();
  };

  const handleExportDfyCSV = () => {
    const headers = ['Partner', 'Total Inquiries', 'Closed', 'Lost', 'Win Rate', 'Revenue', 'Commission'];
    const rows = dfyPerformance.map((p) => [
      p.partner_name,
      p.total_inquiries,
      p.closed_inquiries,
      p.lost_inquiries,
      formatPercentage(p.win_rate),
      formatCurrency(p.total_revenue),
      formatCurrency(p.total_commission),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dfy-performance.csv';
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Time Tracking Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hours This Month</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatHours(timeTracking?.hours_this_month || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatHours(timeTracking?.hours_this_week || 0)} this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Logged</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatHours(timeTracking?.total_hours_logged || 0)}
            </div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg/Deliverable</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatHours(timeTracking?.avg_hours_per_deliverable || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Hours per deliverable</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Timers</CardTitle>
            <Activity className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {timeTracking?.active_timers_count || 0}
            </div>
            <p className="text-xs text-muted-foreground">Working now</p>
          </CardContent>
        </Card>
      </div>

      {/* Developer Section */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Developer Hours Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Developer Hours (This Month)
            </CardTitle>
            <CardDescription>Top 5 contributors by hours logged</CardDescription>
          </CardHeader>
          <CardContent>
            {devChartData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <BarChart data={devChartData} layout="vertical">
                  <XAxis type="number" tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    width={80}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent nameKey="fullName" />}
                  />
                  <Bar dataKey="hours" radius={[0, 4, 4, 0]}>
                    {devChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[250px] items-center justify-center text-muted-foreground">
                No developer data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* DFY Partner Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              DFY Partner Leaderboard
            </CardTitle>
            <CardDescription>Top performers by win rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dfyPerformance.slice(0, 5).map((partner, index) => (
                <div key={partner.partner_id} className="flex items-center gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{partner.partner_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {partner.closed_inquiries} closed / {partner.total_inquiries} total
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-success">
                      {formatPercentage(partner.win_rate)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(partner.total_revenue)}
                    </div>
                  </div>
                </div>
              ))}
              {dfyPerformance.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No partner data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Developer Utilization Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Developer Utilization</CardTitle>
              <CardDescription>Workload and performance metrics</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportDevCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Developer</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Projects</TableHead>
                <TableHead className="text-right">Deliverables</TableHead>
                <TableHead className="text-right">Progress</TableHead>
                <TableHead className="text-right">Hours/Month</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {developerUtil.map((dev) => {
                const progressPercent = dev.total_deliverables > 0
                  ? (dev.completed_deliverables / dev.total_deliverables) * 100
                  : 0;
                return (
                  <TableRow key={dev.dev_id}>
                    <TableCell className="font-medium">{dev.dev_name}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={dev.is_available ? 'default' : 'secondary'}>
                        {dev.is_available ? 'Available' : 'Busy'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{dev.active_projects}</TableCell>
                    <TableCell className="text-right">
                      {dev.completed_deliverables}/{dev.total_deliverables}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <Progress value={progressPercent} className="w-16 h-2" />
                        <span className="text-xs w-10">{progressPercent.toFixed(0)}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatHours(dev.hours_logged_this_month)}
                    </TableCell>
                  </TableRow>
                );
              })}
              {developerUtil.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No developer data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* DFY Partner Performance Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>DFY Partner Performance</CardTitle>
              <CardDescription>Revenue and commission by partner</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportDfyCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partner</TableHead>
                <TableHead className="text-right">Inquiries</TableHead>
                <TableHead className="text-right">Closed/Lost</TableHead>
                <TableHead className="text-right">Win Rate</TableHead>
                <TableHead className="text-right">Avg Deal</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Commission</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dfyPerformance.map((partner) => (
                <TableRow key={partner.partner_id}>
                  <TableCell className="font-medium">{partner.partner_name}</TableCell>
                  <TableCell className="text-right">{partner.total_inquiries}</TableCell>
                  <TableCell className="text-right">
                    <span className="text-success">{partner.closed_inquiries}</span>
                    {' / '}
                    <span className="text-error">{partner.lost_inquiries}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={partner.win_rate >= 50 ? 'text-success' : ''}>
                      {formatPercentage(partner.win_rate)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(partner.avg_deal_size)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(partner.total_revenue)}</TableCell>
                  <TableCell className="text-right text-success">
                    {formatCurrency(partner.total_commission)}
                  </TableCell>
                </TableRow>
              ))}
              {dfyPerformance.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No partner data available
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
