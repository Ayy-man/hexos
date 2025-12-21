import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireRole } from '@/lib/auth/guards'
import { getBlueprint } from '@/lib/api/blueprints'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { ArrowLeft, Clock, DollarSign, Edit, Eye } from 'lucide-react'
import { BlueprintContentSection } from '@/features/blueprints/components/BlueprintContentSection'
import { PricingTiersDisplay } from '@/features/blueprints/components/PricingTiersDisplay'

interface BlueprintDetailPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ edit?: string }>
}

export default async function BlueprintDetailPage({
  params,
  searchParams,
}: BlueprintDetailPageProps) {
  // Allow admin, internal, and dfy to view
  const profile = await requireRole(['admin', 'internal', 'dfy'])

  const { id } = await params
  const { edit } = await searchParams

  const blueprint = await getBlueprint(id)

  if (!blueprint) {
    notFound()
  }

  const isAdmin = profile.role === 'admin' || profile.role === 'internal'
  const isEditMode = edit === 'true' && isAdmin
  const isDFY = profile.role === 'dfy'

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
            <BreadcrumbPage>{blueprint.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            {blueprint.icon && (
              <span className="text-3xl">{blueprint.icon}</span>
            )}
            <h1 className="text-2xl font-semibold tracking-tight">{blueprint.name}</h1>
            {blueprint.status === 'draft' && (
              <Badge variant="secondary">Draft</Badge>
            )}
          </div>
          {blueprint.description && (
            <p className="text-muted-foreground max-w-2xl">{blueprint.description}</p>
          )}
          {blueprint.tags && blueprint.tags.length > 0 && (
            <div className="flex gap-1 pt-2">
              {blueprint.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Admin Actions */}
        {isAdmin && (
          <div className="flex gap-2">
            {isEditMode ? (
              <Button variant="outline" asChild>
                <Link href={`/blueprints/${id}`}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Mode
                </Link>
              </Button>
            ) : (
              <Button variant="outline" asChild>
                <Link href={`/blueprints/${id}?edit=true`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Link>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="flex gap-6">
        {blueprint.base_price && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            Starting at ${blueprint.base_price.toLocaleString()}
          </div>
        )}
        {blueprint.estimated_hours && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            ~{blueprint.estimated_hours} hours
          </div>
        )}
      </div>

      <Separator />

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Content Area - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          <BlueprintContentSection
            blueprintId={blueprint.id}
            blueprintName={blueprint.name}
            blueprintIcon={blueprint.icon}
            content={blueprint.content}
            isEditMode={isEditMode}
          />

          {/* Pricing Tiers */}
          {blueprint.pricing_tiers && blueprint.pricing_tiers.length > 0 && (
            <PricingTiersDisplay tiers={blueprint.pricing_tiers} />
          )}
        </div>

        {/* Sidebar - 1/3 width */}
        <div className="space-y-4">
          {/* DFY Actions */}
          {isDFY && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full" asChild>
                  <Link href={`/inquiries/new?blueprint=${blueprint.id}&type=closed`}>
                    I Closed This Deal
                  </Link>
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/inquiries/new?blueprint=${blueprint.id}&type=proposal`}>
                    Request Proposal
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {blueprint.base_price && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base Price</span>
                  <span className="font-medium">${blueprint.base_price.toLocaleString()}</span>
                </div>
              )}
              {blueprint.estimated_hours && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Est. Hours</span>
                  <span className="font-medium">{blueprint.estimated_hours}h</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={blueprint.status === 'published' ? 'default' : 'secondary'}>
                  {blueprint.status}
                </Badge>
              </div>
              {blueprint.updated_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span>{new Date(blueprint.updated_at).toLocaleDateString()}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Back Link */}
          <Button variant="ghost" className="w-full" asChild>
            <Link href="/blueprints">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Blueprints
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
