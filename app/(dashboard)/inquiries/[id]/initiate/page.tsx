import { notFound } from 'next/navigation'
import { requireAuth, getProfile } from '@/lib/auth/guards'
import { getInquiry } from '@/lib/api/inquiries'
import { getProposalDeliverablesTree } from '@/lib/api/proposal-deliverables'
import { getRequirementTemplates } from '@/lib/api/requirement-templates'
import { InitiateWizard } from '@/features/project-initiation/components/InitiateWizard'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectInitiatePage({ params }: PageProps) {
  await requireAuth()
  const profile = await getProfile()

  if (!profile || profile.role !== 'admin') {
    notFound()
  }

  const { id } = await params

  // Fetch inquiry with deliverables
  let inquiry
  try {
    inquiry = await getInquiry(id)
  } catch {
    notFound()
  }

  if (!inquiry) {
    notFound()
  }

  // Check inquiry is in valid state for conversion
  if (inquiry.status === 'converted' || inquiry.proposal_stage === 'lost') {
    notFound()
  }

  // Fetch deliverables (as tree structure) and templates
  const [deliverables, templates] = await Promise.all([
    getProposalDeliverablesTree(id),
    getRequirementTemplates(),
  ])

  // Filter function for tree (removes rejected/removed items and their children)
  function filterDeliverables<T extends { change_status: string; children?: T[] }>(items: T[]): T[] {
    return items
      .filter(d => d.change_status !== 'removed' && d.change_status !== 'rejected')
      .map(d => ({
        ...d,
        children: d.children ? filterDeliverables(d.children) : []
      }))
  }

  const validDeliverables = filterDeliverables(deliverables)

  return (
    <div className="min-h-screen bg-background">
      <InitiateWizard
        inquiry={{
          id: inquiry.id,
          prospect_company_name: inquiry.prospect_company_name || 'New Client',
          prospect_website: inquiry.prospect_website,
          industry: inquiry.industry,
          partner_name: inquiry.partner_name,
          price_dfy: inquiry.price_dfy,
          price_hexona: inquiry.price_hexona,
          price_dev: inquiry.price_dev,
          blueprint: inquiry.blueprint,
          proposal_content: inquiry.proposal_content,
        }}
        deliverables={validDeliverables}
        templates={templates}
      />
    </div>
  )
}
