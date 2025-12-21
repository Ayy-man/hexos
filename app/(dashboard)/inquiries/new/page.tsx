import { requireRole } from '@/lib/auth/guards'
import { getBlueprints } from '@/lib/api/blueprints'
import { IntakeForm } from '@/features/inquiries/components/IntakeForm'

export default async function NewInquiryPage() {
  // DFY partners and admin/internal can submit inquiries
  await requireRole(['admin', 'internal', 'dfy'])

  let blueprints: Awaited<ReturnType<typeof getBlueprints>> = []

  try {
    blueprints = await getBlueprints()
  } catch (error) {
    console.error('Failed to fetch blueprints:', error)
  }

  return (
    <div className="py-4">
      <IntakeForm blueprints={blueprints} />
    </div>
  )
}
