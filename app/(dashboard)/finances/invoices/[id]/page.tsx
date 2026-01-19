export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/admin';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function InvoiceDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = createClient();

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, projects:project_id(name)')
    .eq('id', id)
    .single();

  if (!invoice) {
    notFound();
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    sent: 'bg-blue-500/20 text-blue-400',
    paid: 'bg-green-500/20 text-green-400',
    overdue: 'bg-red-500/20 text-red-400',
    void: 'bg-muted text-muted-foreground line-through',
  };

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/finances/invoices">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Invoices
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Invoice #{invoice.invoice_number}</CardTitle>
              <Badge className={statusColors[invoice.status]}>
                {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Client</p>
                <p className="font-medium">{invoice.client_name}</p>
                <p className="text-sm text-muted-foreground">{invoice.client_email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Project</p>
                <p className="font-medium">
                  {invoice.projects?.name || 'No project linked'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Issue Date</p>
                <p className="font-medium">
                  {new Date(invoice.issue_date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Due Date</p>
                <p className="font-medium">
                  {new Date(invoice.due_date).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div>
              <h3 className="mb-3 font-medium">Line Items</h3>
              <div className="rounded-lg border">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm">Description</th>
                      <th className="px-4 py-2 text-right text-sm">Qty</th>
                      <th className="px-4 py-2 text-right text-sm">Price</th>
                      <th className="px-4 py-2 text-right text-sm">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.line_items?.map((item: any, i: number) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-4 py-2 text-sm">{item.description}</td>
                        <td className="px-4 py-2 text-right text-sm">{item.quantity}</td>
                        <td className="px-4 py-2 text-right text-sm">
                          {formatCurrency(item.unit_price)}
                        </td>
                        <td className="px-4 py-2 text-right text-sm">
                          {formatCurrency(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(invoice.subtotal)}</span>
                </div>
                {invoice.tax_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Tax ({(invoice.tax_rate * 100).toFixed(1)}%)
                    </span>
                    <span>{formatCurrency(invoice.tax_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2 font-medium">
                  <span>Total</span>
                  <span>{formatCurrency(invoice.total)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {invoice.stripe_pdf_url && (
              <Button variant="outline" className="w-full" asChild>
                <a href={invoice.stripe_pdf_url} target="_blank" rel="noopener noreferrer">
                  Download PDF
                </a>
              </Button>
            )}
            {invoice.stripe_hosted_url && (
              <Button variant="outline" className="w-full" asChild>
                <a href={invoice.stripe_hosted_url} target="_blank" rel="noopener noreferrer">
                  View in Stripe
                </a>
              </Button>
            )}
            {invoice.status === 'draft' && (
              <Button className="w-full">Send Invoice</Button>
            )}
            {(invoice.status === 'sent' || invoice.status === 'overdue') && (
              <>
                <Button variant="outline" className="w-full">
                  Send Reminder
                </Button>
                <Button variant="outline" className="w-full">
                  Mark as Paid
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
