import Link from 'next/link'
import { requireRole } from '@/lib/auth/guards'
import { getBlueprintsForSelect } from '@/lib/api/case-studies'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { CaseStudyForm } from '@/features/case-studies/components/CaseStudyForm'

export default async function NewCaseStudyPage() {
  // Only admin/internal can create case studies
  await requireRole(['admin', 'internal'])

  // Fetch blueprints for the dropdown
  const blueprints = await getBlueprintsForSelect()

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/case-studies">Case Studies</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>New Case Study</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create Case Study</h1>
        <p className="text-muted-foreground">
          Add a new success story to showcase
        </p>
      </div>

      {/* Form */}
      <CaseStudyForm mode="create" blueprints={blueprints} />
    </div>
  )
}
