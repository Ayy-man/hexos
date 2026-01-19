import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Globe } from 'lucide-react';
import { getInvoice } from '@/lib/api/invoices';

export default async function PaymentSuccessPage({
    searchParams,
}: {
    searchParams: Promise<{ invoice_id?: string }>;
}) {
    const { invoice_id } = await searchParams;
    let publicToken = null;

    if (invoice_id) {
        const invoice = await getInvoice(invoice_id);
        publicToken = invoice?.public_token;
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 dark:bg-slate-950">
            <div className="max-w-md mx-auto w-full">
                <div className="flex justify-center mb-8">
                    <div className="flex items-center gap-2">
                        <Globe className="h-8 w-8 text-primary" />
                        <span className="text-3xl font-bold tracking-tight">hexOS</span>
                    </div>
                </div>

                <Card className="shadow-2xl border-none">
                    <CardHeader className="text-center pt-10">
                        <div className="flex justify-center mb-4">
                            <div className="bg-green-100 p-3 rounded-full dark:bg-green-900/30">
                                <CheckCircle2 className="h-12 w-12 text-green-600" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl font-bold">Payment Successful!</CardTitle>
                        <p className="text-muted-foreground mt-2">
                            Thank you for your payment. Your invoice has been marked as paid.
                        </p>
                    </CardHeader>
                    <CardContent className="text-center pb-10">
                        <p className="text-sm text-balance">
                            A confirmation email has been sent to your inbox. You can view or download your receipt at any time.
                        </p>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-3 pb-10">
                        {publicToken && (
                            <Button asChild className="w-full h-12 text-lg font-bold">
                                <Link href={`/pay/${publicToken}`}>
                                    View Paid Invoice
                                </Link>
                            </Button>
                        )}
                        <Button variant="outline" asChild className="w-full h-12">
                            <Link href="https://hexona.io">
                                Visit hexona.io
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
