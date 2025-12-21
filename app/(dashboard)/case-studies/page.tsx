import Link from 'next/link'
import { requireRole } from '@/lib/auth/guards'
import { getCaseStudies, getCaseStudyTags } from '@/lib/api/case-studies'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Plus, Search } from 'lucide-react'
import { CaseStudyCard } from '@/features/case-studies/components/CaseStudyCard'

interface CaseStudiesPageProps {
  searchParams: Promise<{
    search?: string
    tags?: string
    status?: string
  }>
}

export default async function CaseStudiesPage({ searchParams }: CaseStudiesPageProps) {
  const profile = await requireRole(['admin', 'internal', 'dfy'])
  const { search, tags: tagFilter, status } = await searchParams

  const isAdmin = profile.role === 'admin' || profile.role === 'internal'

  // Parse tag filter
  const selectedTags = tagFilter ? tagFilter.split(',').filter(Boolean) : []

  // Fetch case studies with filters
  let caseStudies: Awaited<ReturnType<typeof getCaseStudies>> = []
  let allTags: string[] = []

  try {
    caseStudies = await getCaseStudies({
      search: search || undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      status: isAdmin ? (status as 'draft' | 'published' | 'all') || 'all' : 'published',
    })
    allTags = await getCaseStudyTags()
  } catch (error) {
    console.error('Failed to fetch case studies:', error)
  }

  // Build filter URL helper
  const buildFilterUrl = (params: Record<string, string | undefined>) => {
    const searchParams = new URLSearchParams()
    if (params.search) searchParams.set('search', params.search)
    if (params.tags) searchParams.set('tags', params.tags)
    if (params.status) searchParams.set('status', params.status)
    const queryString = searchParams.toString()
    return queryString ? `/case-studies?${queryString}` : '/case-studies'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Case Studies</h1>
          <p className="text-muted-foreground">
            Success stories from completed automation projects
          </p>
        </div>
        {isAdmin && (
          <Button asChild>
            <Link href="/case-studies/new">
              <Plus className="h-4 w-4 mr-2" />
              New Case Study
            </Link>
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        {/* Search */}
        <form className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            name="search"
            placeholder="Search case studies..."
            defaultValue={search}
            className="pl-8"
          />
        </form>

        {/* Tag Filters */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {allTags.map((tag) => {
              const isSelected = selectedTags.includes(tag)
              const newTags = isSelected
                ? selectedTags.filter((t) => t !== tag)
                : [...selectedTags, tag]
              return (
                <Link
                  key={tag}
                  href={buildFilterUrl({
                    search,
                    tags: newTags.length > 0 ? newTags.join(',') : undefined,
                    status,
                  })}
                >
                  <Badge
                    variant={isSelected ? 'default' : 'outline'}
                    className="cursor-pointer hover:bg-muted"
                  >
                    {tag}
                  </Badge>
                </Link>
              )
            })}
          </div>
        )}

        {/* Status Filter (Admin only) */}
        {isAdmin && (
          <div className="flex gap-1">
            {['all', 'published', 'draft'].map((s) => (
              <Link
                key={s}
                href={buildFilterUrl({ search, tags: tagFilter, status: s })}
              >
                <Badge
                  variant={(status || 'all') === s ? 'default' : 'outline'}
                  className="cursor-pointer capitalize"
                >
                  {s}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Case Study Grid */}
      {caseStudies.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No case studies found</p>
            {search || selectedTags.length > 0 ? (
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting your search or filters
              </p>
            ) : isAdmin ? (
              <Button variant="outline" className="mt-4" asChild>
                <Link href="/case-studies/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first case study
                </Link>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">
                No case studies available yet
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {caseStudies.map((caseStudy) => (
            <CaseStudyCard
              key={caseStudy.id}
              id={caseStudy.id}
              name={caseStudy.name}
              description={caseStudy.description}
              icon={caseStudy.icon}
              client_name={caseStudy.client_name}
              industry={caseStudy.industry}
              tags={caseStudy.tags || []}
              status={caseStudy.status || 'published'}
              blueprint={caseStudy.blueprint as any}
            />
          ))}
        </div>
      )}

      {/* Results count */}
      {caseStudies.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {caseStudies.length} case stud{caseStudies.length !== 1 ? 'ies' : 'y'}
        </p>
      )}
    </div>
  )
}
