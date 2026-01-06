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
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Bar, BarChart, XAxis, YAxis } from 'recharts';
import { Copy, Download, FileText } from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/lib/api/financial-metrics-utils';
import type {
  InquiryPipelineStage,
  InquiryConversionRates,
  InquirySource,
  InquiryTimelineItem,
} from '@/lib/api/admin-metrics';

interface PipelineTabProps {
  inquiryPipeline: InquiryPipelineStage[];
  inquiryConversion: InquiryConversionRates | null;
  inquirySources: InquirySource[];
  inquiryTimeline: InquiryTimelineItem[];
}

const chartConfig: ChartConfig = {
  created: {
    label: 'Created',
    color: 'hsl(217.2 91.2% 59.8%)',
  },
  sent: {
    label: 'Sent',
    color: 'hsl(280 65% 60%)',
  },
  closed: {
    label: 'Closed',
    color: 'hsl(142.1 76.2% 36.3%)',
  },
  lost: {
    label: 'Lost',
    color: 'hsl(0 84.2% 60.2%)',
  },
};

export function PipelineTab({
  inquiryPipeline,
  inquiryConversion,
  inquirySources,
  inquiryTimeline,
}: PipelineTabProps) {
  // Transform timeline data for stacked bar chart
  const chartData = inquiryTimeline.slice(-6).map((item) => ({
    month: item.month,
    created: item.created_count,
    sent: item.sent_count,
    closed: item.closed_count,
    lost: item.lost_count,
  }));

  const handleCopySelected = () => {
    const text = inquirySources
      .map((s) => `${s.source_name}\t${s.inquiry_count}\t${formatPercentage(s.win_rate)}`)
      .join('\n');
    navigator.clipboard.writeText(text);
  };

  const handleExportCSV = () => {
    const headers = ['Source', 'Type', 'Inquiries', 'Closed', 'Win Rate', 'Total Value'];
    const rows = inquirySources.map((s) => [
      s.source_name,
      s.source_type,
      s.inquiry_count,
      s.closed_count,
      formatPercentage(s.win_rate),
      formatCurrency(s.total_value),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inquiry-sources.csv';
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Pipeline Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Inquiries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {inquiryConversion?.total_inquiries || 0}
            </div>
            <p className="text-xs text-muted-foreground">Last 6 months</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Proposals Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-violet-600">
              {inquiryConversion?.proposal_sent || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {inquiryConversion ? formatPercentage(inquiryConversion.conversion_to_sent) : '0%'} of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Closed Won</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {inquiryConversion?.closed_won || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {inquiryConversion ? formatPercentage(inquiryConversion.win_rate) : '0%'} win rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Closed Lost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {inquiryConversion?.closed_lost || 0}
            </div>
            <p className="text-xs text-muted-foreground">Lost opportunities</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Monthly Pipeline Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Monthly Pipeline
            </CardTitle>
            <CardDescription>Inquiries by status over time</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChart data={chartData}>
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
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="created" stackId="a" fill="var(--color-created)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="sent" stackId="a" fill="var(--color-sent)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="closed" stackId="a" fill="var(--color-closed)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="lost" stackId="a" fill="var(--color-lost)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stage Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Current Pipeline Stages</CardTitle>
            <CardDescription>Active inquiries by stage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {inquiryPipeline.map((stage) => (
                <div key={stage.stage} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="capitalize min-w-[100px] justify-center">
                      {stage.stage.replace(/_/g, ' ')}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(stage.total_value)}
                    </span>
                  </div>
                  <span className="font-medium">{stage.count}</span>
                </div>
              ))}
              {inquiryPipeline.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No active inquiries</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sources Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Inquiry Sources</CardTitle>
              <CardDescription>Performance by referral source</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCopySelected}>
                <Copy className="mr-2 h-4 w-4" />
                Copy Selected
              </Button>
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
                <TableHead>Source</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Inquiries</TableHead>
                <TableHead className="text-right">Win Rate</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inquirySources.slice(0, 10).map((source, index) => (
                <TableRow key={`${source.source_type}-${source.source_name}`}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">{source.source_name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {source.source_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{source.inquiry_count}</TableCell>
                  <TableCell className="text-right">
                    <span className={source.win_rate >= 50 ? 'text-green-600' : ''}>
                      {formatPercentage(source.win_rate)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(source.total_value)}</TableCell>
                </TableRow>
              ))}
              {inquirySources.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No source data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {inquirySources.length > 0 && (
            <p className="text-xs text-muted-foreground mt-4">
              Click to select - Shift+Click for range - Ctrl+C to copy
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
