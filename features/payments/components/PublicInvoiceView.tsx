'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, CreditCard, Download, FileText, Globe, Loader2 } from 'lucide-react';
import type { InvoiceWithProject } from '@/lib/types/invoices';
import { format } from 'date-fns';

interface PublicInvoiceViewProps {
    invoice: InvoiceWithProject;
}

export function PublicInvoiceView({ invoice }: PublicInvoiceViewProps) {
    const [isProcessing, setIsProcessing] = useState(false);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount / 100);
    };

    const handlePay = async () => {
        setIsProcessing(true);
        try {
            const response = await fetch(`/api/invoices/${invoice.id}/checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    success_url: `${window.location.origin}/pay/success?invoice_id=${invoice.id}`,
                    cancel_url: window.location.href,
                }),
            });

            const data = await response.json();

            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error(data.error || 'Failed to create checkout session');
            }
        } catch (error) {
            console.error('Payment error:', error);
            alert('Failed to initiate payment. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const statusColors = {
        draft: 'bg-muted text-muted-foreground',
        sent: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        paid: 'bg-green-500/10 text-green-500 border-green-500/20',
        void: 'bg-red-500/10 text-red-500 border-red-500/20',
        overdue: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    };

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 dark:bg-slate-950">
            <div className="max-w-3xl mx-auto">
                {/* Brand/Header */}
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-2">
                        <div className="bg-primary p-2 rounded-lg">
                            <Globe className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <span className="text-2xl font-bold tracking-tight">hexOS</span>
                    </div>
                    {invoice.status === 'paid' && (
                        <div className="flex items-center gap-2 text-green-600 font-medium">
                            <CheckCircle2 className="h-5 w-5" />
                            Paid on {invoice.paid_at ? format(new Date(invoice.paid_at), 'MMM d, yyyy') : 'N/A'}
                        </div>
                    )}
                </div>

                <Card className="shadow-xl border-none overflow-hidden bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
                    <div className="h-2 bg-primary" />
                    <CardHeader className="pt-8 px-8">
                        <div className="flex justify-between items-start">
                            <div>
                                <Badge className={statusColors[invoice.status]}>
                                    {invoice.status.toUpperCase()}
                                </Badge>
                                <CardTitle className="mt-4 text-3xl font-bold">
                                    Invoice {invoice.invoice_number}
                                </CardTitle>
                                <CardDescription className="text-lg mt-1">
                                    For {invoice.project_name || 'Project Services'}
                                </CardDescription>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-muted-foreground">Amount Due</p>
                                <p className="text-4xl font-bold text-slate-900 dark:text-white">
                                    {formatCurrency(invoice.total)}
                                </p>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="px-8 py-8 space-y-8">
                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-8 text-sm">
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-semibold text-muted-foreground uppercase text-xs tracking-wider">Bill To</h4>
                                    <p className="mt-1 font-medium">{invoice.client_name}</p>
                                    <p className="text-muted-foreground">{invoice.client_email}</p>
                                    {invoice.client_company && <p className="text-muted-foreground">{invoice.client_company}</p>}
                                </div>
                            </div>
                            <div className="space-y-4 text-right">
                                <div>
                                    <h4 className="font-semibold text-muted-foreground uppercase text-xs tracking-wider">Issue Date</h4>
                                    <p className="mt-1 font-medium">{format(new Date(invoice.issue_date), 'MMM d, yyyy')}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-muted-foreground uppercase text-xs tracking-wider">Due Date</h4>
                                    <p className="mt-1 font-medium">{format(new Date(invoice.due_date), 'MMM d, yyyy')}</p>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Line Items */}
                        <div>
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        <th className="pb-4">Description</th>
                                        <th className="pb-4 text-center">Qty</th>
                                        <th className="pb-4 text-right">Price</th>
                                        <th className="pb-4 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {invoice.line_items.map((item, index) => (
                                        <tr key={index} className="text-sm">
                                            <td className="py-4 font-medium">{item.description}</td>
                                            <td className="py-4 text-center">{item.quantity}</td>
                                            <td className="py-4 text-right">{formatCurrency(item.unit_price)}</td>
                                            <td className="py-4 text-right font-medium">{formatCurrency(item.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Totals Section */}
                        <div className="flex justify-end pt-4">
                            <div className="w-full max-w-[240px] space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
                                </div>
                                {invoice.tax_amount > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Tax ({(invoice.tax_rate * 100).toFixed(1)}%)</span>
                                        <span className="font-medium">{formatCurrency(invoice.tax_amount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-xl font-bold border-t border-slate-200 dark:border-slate-700 pt-4">
                                    <span>Total</span>
                                    <span>{formatCurrency(invoice.total)}</span>
                                </div>
                            </div>
                        </div>

                        {invoice.notes && (
                            <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-sm italic text-muted-foreground">
                                <h4 className="font-semibold not-italic mb-1 text-slate-700 dark:text-slate-300">Notes</h4>
                                {invoice.notes}
                            </div>
                        )}
                    </CardContent>

                    <CardFooter className="px-8 py-8 bg-slate-50 dark:bg-slate-800/30 flex flex-col items-center gap-4">
                        {invoice.status === 'paid' ? (
                            <Button disabled variant="outline" className="w-full sm:w-auto h-12 px-8 text-lg gap-2">
                                <CheckCircle2 className="h-5 w-5" />
                                Payment Received
                            </Button>
                        ) : invoice.status === 'void' ? (
                            <p className="text-red-500 font-medium">This invoice has been voided.</p>
                        ) : (
                            <>
                                <Button
                                    onClick={handlePay}
                                    disabled={isProcessing}
                                    className="w-full sm:w-auto h-12 px-12 text-lg shadow-lg hover:shadow-primary/20 transition-all font-bold gap-2"
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <CreditCard className="h-5 w-5" />
                                            Pay with Card
                                        </>
                                    )}
                                </Button>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <CreditCard className="h-3 w-3" />
                                    Secure payments by Stripe
                                </p>
                            </>
                        )}

                        {invoice.stripe_pdf_url && (
                            <Button variant="link" asChild className="text-muted-foreground hover:text-primary">
                                <a href={invoice.stripe_pdf_url} target="_blank" rel="noopener noreferrer">
                                    <Download className="h-4 w-4 mr-2" />
                                    Download PDF Copy
                                </a>
                            </Button>
                        )}
                    </CardFooter>
                </Card>

                {/* Footer */}
                <div className="mt-8 text-center text-sm text-muted-foreground">
                    <p>© {new Date().getFullYear()} hexona.io</p>
                    <p className="mt-1">If you have any questions, please contact your project manager.</p>
                </div>
            </div>
        </div>
    );
}
