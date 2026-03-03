import Link from 'next/link'
import { requireRole } from '@/lib/auth/guards'
import { getBlueprints, getBlueprintTags } from '@/lib/api/blueprints'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Layers, Plus, Search } from 'lucide-react'
import { BlueprintCard } from '@/features/blueprints/components/BlueprintCard'

interface BlueprintsPageProps {
  searchParams: Promise<{
    search?: string
    tags?: string
    status?: string
  }>
}

export default async function BlueprintsPage({ searchParams }: BlueprintsPageProps) {
  const profile = await requireRole(['admin', 'internal', 'dfy'])
  const { search, tags: tagFilter, status } = await searchParams

  const isAdmin = profile.role === 'admin' || profile.role === 'internal'
  const isDFY = profile.role === 'dfy'

  // Parse tag filter
  const selectedTags = tagFilter ? tagFilter.split(',').filter(Boolean) : []

  // Fetch blueprints with filters
  let blueprints: Awaited<ReturnType<typeof getBlueprints>> = []
  let allTags: string[] = []

  try {
    blueprints = await getBlueprints({
      search: search || undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      status: isAdmin ? (status as 'draft' | 'published' | 'all') || 'all' : 'published',
    })
    allTags = await getBlueprintTags()
  } catch (error) {
    console.error('Failed to fetch blueprints:', error)
  }

  // Build filter URL helper
  const buildFilterUrl = (params: Record<string, string | undefined>) => {
    const searchParams = new URLSearchParams()
    if (params.search) searchParams.set('search', params.search)
    if (params.tags) searchParams.set('tags', params.tags)
    if (params.status) searchParams.set('status', params.status)
    const queryString = searchParams.toString()
    return queryString ? `/blueprints?${queryString}` : '/blueprints'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Blueprints</h1>
          <p className="text-muted-foreground">
            {isDFY
              ? 'Browse automation solutions to sell'
              : 'Pre-built automation solutions catalog'}
          </p>
        </div>
        {isAdmin && (
          <Button asChild>
            <Link href="/blueprints/new">
              <Plus className="h-4 w-4 mr-2" />
              New Blueprint
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
            placeholder="Search blueprints..."
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

      {/* Blueprint Grid */}
      {blueprints.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Layers className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No blueprints found</p>
            {search || selectedTags.length > 0 ? (
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting your search or filters
              </p>
            ) : isAdmin ? (
              <Button variant="outline" className="mt-4" asChild>
                <Link href="/blueprints/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first blueprint
                </Link>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">
                No blueprints available yet
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-3">
          {blueprints.map((blueprint) => (
            <BlueprintCard
              key={blueprint.id}
              id={blueprint.id}
              name={blueprint.name}
              description={blueprint.description}
              icon={blueprint.icon}
              image_url={blueprint.image_url}
              base_price={blueprint.base_price}
              estimated_hours={blueprint.estimated_hours}
              tags={blueprint.tags || []}
              status={blueprint.status || 'published'}
              pricing_tiers={blueprint.pricing_tiers || []}
            />
          ))}
        </div>
      )}

      {/* Results count */}
      {blueprints.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {blueprints.length} blueprint{blueprints.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
