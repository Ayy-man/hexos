import { notFound } from 'next/navigation'
import { getInquiryByPublicToken } from '@/lib/api/inquiries'
import { PublicProposalView } from '@/features/inquiries/components/PublicProposalView'

export const dynamic = 'force-dynamic'

export default async function PublicProposalPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  let proposal
  try {
    proposal = await getInquiryByPublicToken(token)
  } catch {
    notFound()
  }

  if (!proposal) {
    notFound()
  }

  return <PublicProposalView proposal={proposal} />
}
