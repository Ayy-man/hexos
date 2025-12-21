import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { requireRole } from '@/lib/auth/guards'
import { getCaseStudy, getBlueprintsForSelect } from '@/lib/api/case-studies'
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
import { ArrowLeft, Building2, Briefcase, ExternalLink, Target, Lightbulb, TrendingUp } from 'lucide-react'
import { CaseStudyContentSection } from '@/features/case-studies/components/CaseStudyContentSection'
import { CaseStudyActions } from '@/features/case-studies/components/CaseStudyActions'
import { CaseStudyForm } from '@/features/case-studies/components/CaseStudyForm'

interface CaseStudyDetailPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ edit?: string }>
}

export default async function CaseStudyDetailPage({
  params,
  searchParams,
}: CaseStudyDetailPageProps) {
  // Allow admin, internal, and dfy to view
  const profile = await requireRole(['admin', 'internal', 'dfy'])

  const { id } = await params
  const { edit } = await searchParams

  const caseStudy = await getCaseStudy(id)

  if (!caseStudy) {
    notFound()
  }

  const isAdmin = profile.role === 'admin' || profile.role === 'internal'
  const isEditMode = edit === 'true' && isAdmin

  // Fetch blueprints for form if editing
  const blueprints = isEditMode ? await getBlueprintsForSelect() : []

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
            <BreadcrumbPage>{caseStudy.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Cover Image */}
      {caseStudy.image_url && !isEditMode && (
        <div className="relative w-full aspect-[3/1] rounded-lg overflow-hidden">
          <Image
            src={caseStudy.image_url}
            alt={caseStudy.name}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            {caseStudy.icon && (
              <span className="text-3xl">{caseStudy.icon}</span>
            )}
            <h1 className="text-2xl font-semibold tracking-tight">{caseStudy.name}</h1>
            {caseStudy.status === 'draft' && (
              <Badge variant="secondary">Draft</Badge>
            )}
          </div>
          {caseStudy.description && (
            <p className="text-muted-foreground max-w-2xl">{caseStudy.description}</p>
          )}
          {caseStudy.tags && caseStudy.tags.length > 0 && (
            <div className="flex gap-1 pt-2">
              {caseStudy.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Admin Actions */}
        {isAdmin && (
          <CaseStudyActions caseStudyId={id} isEditMode={isEditMode} />
        )}
      </div>

      {/* Quick Info */}
      <div className="flex gap-6">
        {caseStudy.client_name && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4" />
            {caseStudy.client_name}
          </div>
        )}
        {caseStudy.industry && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Briefcase className="h-4 w-4" />
            {caseStudy.industry}
          </div>
        )}
      </div>

      <Separator />

      {/* Edit Mode: Show Form */}
      {isEditMode ? (
        <CaseStudyForm caseStudy={caseStudy} mode="edit" blueprints={blueprints} />
      ) : (
        /* View Mode */
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Content Area - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            {/* Challenge, Solution, Results Cards */}
            {(caseStudy.challenge || caseStudy.solution || caseStudy.results) && (
              <div className="grid gap-4 md:grid-cols-1">
                {caseStudy.challenge && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Target className="h-4 w-4 text-red-500" />
                        Challenge
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {caseStudy.challenge}
                      </p>
                    </CardContent>
                  </Card>
                )}
                {caseStudy.solution && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-yellow-500" />
                        Solution
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {caseStudy.solution}
                      </p>
                    </CardContent>
                  </Card>
                )}
                {caseStudy.results && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        Results
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {caseStudy.results}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Rich Content */}
            <CaseStudyContentSection
              caseStudyId={caseStudy.id}
              caseStudyName={caseStudy.name}
              caseStudyIcon={caseStudy.icon}
              content={caseStudy.content}
              isEditMode={false}
            />
          </div>

          {/* Sidebar - 1/3 width */}
          <div className="space-y-4">
            {/* Related Blueprint */}
            {caseStudy.blueprint && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Related Blueprint</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href={`/blueprints/${caseStudy.blueprint.id}`}>
                      {caseStudy.blueprint.icon && (
                        <span className="mr-2">{caseStudy.blueprint.icon}</span>
                      )}
                      {caseStudy.blueprint.name}
                      <ExternalLink className="h-3 w-3 ml-auto" />
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
                {caseStudy.client_name && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Client</span>
                    <span className="font-medium">{caseStudy.client_name}</span>
                  </div>
                )}
                {caseStudy.industry && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Industry</span>
                    <span className="font-medium">{caseStudy.industry}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={caseStudy.status === 'published' ? 'default' : 'secondary'}>
                    {caseStudy.status}
                  </Badge>
                </div>
                {caseStudy.updated_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Updated</span>
                    <span>{new Date(caseStudy.updated_at).toLocaleDateString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Back Link */}
            <Button variant="ghost" className="w-full" asChild>
              <Link href="/case-studies">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Case Studies
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
