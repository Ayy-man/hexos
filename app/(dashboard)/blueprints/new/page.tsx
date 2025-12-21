import Link from 'next/link'
import { requireRole } from '@/lib/auth/guards'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { BlueprintForm } from '@/features/blueprints/components/BlueprintForm'

export default async function NewBlueprintPage() {
  // Only admin/internal can create blueprints
  await requireRole(['admin', 'internal'])

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/blueprints">Blueprints</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>New Blueprint</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create Blueprint</h1>
        <p className="text-muted-foreground">
          Add a new automation blueprint to the catalog
        </p>
      </div>

      {/* Form */}
      <BlueprintForm mode="create" />
    </div>
  )
}
