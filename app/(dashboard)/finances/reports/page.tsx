import Link from 'next/link';
import { FileText, Users, Clock, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const reports = [
  {
    title: 'Profit & Loss',
    description: 'Revenue, expenses, and net profit by period',
    icon: TrendingUp,
    href: '/finances/reports/profit-loss',
    status: 'coming_soon',
  },
  {
    title: 'Revenue by Client',
    description: 'Which clients generate the most revenue',
    icon: Users,
    href: '/finances/reports/revenue-by-client',
    status: 'coming_soon',
  },
  {
    title: 'Aging Report',
    description: 'Unpaid invoices by age (30/60/90 days)',
    icon: Clock,
    href: '/finances/reports/aging',
    status: 'coming_soon',
  },
  {
    title: 'Expense Breakdown',
    description: 'Expenses by category over time',
    icon: FileText,
    href: '/finances/reports/expenses',
    status: 'coming_soon',
  },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Financial Reports</h1>
        <p className="text-muted-foreground">Analyze your financial data</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {reports.map((report) => (
          <Card
            key={report.title}
            className={report.status === 'coming_soon' ? 'opacity-60' : ''}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="rounded-lg bg-primary/10 p-2">
                  <report.icon className="h-5 w-5 text-primary" />
                </div>
                {report.status === 'coming_soon' && (
                  <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                    Coming Soon
                  </span>
                )}
              </div>
              <CardTitle className="text-lg">{report.title}</CardTitle>
              <CardDescription>{report.description}</CardDescription>
            </CardHeader>
            {report.status !== 'coming_soon' && (
              <CardContent>
                <Link
                  href={report.href}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  View Report →
                </Link>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
