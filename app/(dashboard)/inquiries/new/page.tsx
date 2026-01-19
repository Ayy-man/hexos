import { requireRole, getProfile } from '@/lib/auth/guards'
import { getBlueprints } from '@/lib/api/blueprints'
import { IntakeForm } from '@/features/inquiries/components/IntakeForm'

export default async function NewInquiryPage() {
  // DFY partners and admin/internal can submit inquiries
  await requireRole(['admin', 'internal', 'dfy'])
  const profile = await getProfile()

  let blueprints: Awaited<ReturnType<typeof getBlueprints>> = []

  try {
    blueprints = await getBlueprints()
  } catch (error) {
    console.error('Failed to fetch blueprints:', error)
  }

  const partnerName = profile?.name || profile?.email || ''

  return (
    <div className="py-4">
      <IntakeForm blueprints={blueprints} partnerName={partnerName} />
    </div>
  )
}
