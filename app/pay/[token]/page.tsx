import { notFound } from 'next/navigation'
import { getInvoiceByPublicToken } from '@/lib/api/invoices'
import { PublicInvoiceView } from '@/features/payments/components/PublicInvoiceView'

export const dynamic = 'force-dynamic'

export default async function PublicInvoicePage({
    params,
}: {
    params: Promise<{ token: string }>
}) {
    const { token } = await params

    const invoice = await getInvoiceByPublicToken(token)

    if (!invoice) {
        notFound()
    }

    return <PublicInvoiceView invoice={invoice} />
}
