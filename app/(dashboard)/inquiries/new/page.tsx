import { requireRole, getProfile } from '@/lib/auth/guards'
import { getBlueprints } from '@/lib/api/blueprints'
import { getCaseStudies, type CaseStudy } from '@/lib/api/case-studies'
import { IntakeForm } from '@/features/inquiries/components/IntakeForm'

export default async function NewInquiryPage() {
  // DFY partners and admin/internal can submit inquiries
  await requireRole(['admin', 'internal', 'dfy'])
  const profile = await getProfile()

  let blueprints: Awaited<ReturnType<typeof getBlueprints>> = []
  let caseStudies: CaseStudy[] = []

  try {
    const [bps, css] = await Promise.all([
      getBlueprints(),
      getCaseStudies(),
    ])
    blueprints = bps
    caseStudies = css as unknown as CaseStudy[]
  } catch (error) {
    console.error('Failed to fetch blueprints or case studies:', error)
  }

  const partnerName = profile?.name || profile?.email || ''

  return (
    <div className="py-4">
      <IntakeForm blueprints={blueprints} caseStudies={caseStudies} partnerName={partnerName} />
    </div>
  )
}
