import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

// Projects page skeleton
export function ProjectsListSkeleton() {
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-24 md:h-8 md:w-32" />
        <Skeleton className="h-9 w-16 md:w-28" />
      </div>

      {/* Mobile cards skeleton */}
      <div className="space-y-3 md:hidden">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <div className="mt-3 flex gap-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table skeleton */}
      <div className="hidden overflow-hidden rounded-lg border border-stone-200 bg-white md:block dark:border-stone-800 dark:bg-stone-900">
        <div className="bg-stone-50 dark:bg-stone-800/50 px-4 py-3">
          <div className="flex gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        <div className="divide-y divide-stone-200 dark:divide-stone-800">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-4">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Inquiries page skeleton
export function InquiriesListSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-7 w-32 md:h-8" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-24" />
      </div>

      {/* Stats cards - 2x2 on mobile, 5 cols on desktop */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="p-3 md:p-0">
            <CardHeader className="p-0 pb-1 md:p-6 md:pb-2">
              <Skeleton className="h-4 w-16" />
            </CardHeader>
            <CardContent className="p-0 md:p-6 md:pt-0">
              <Skeleton className="h-7 w-8 md:h-8" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* List skeleton */}
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <div className="mt-3 flex gap-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Blueprints/Case Studies grid skeleton
export function CatalogGridSkeleton({ title = 'Loading' }: { title?: string }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Skeleton className="h-7 w-28 md:h-8" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <Skeleton className="h-9 w-full max-w-sm" />
        <div className="flex flex-wrap gap-1">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-6 w-16 rounded-full" />
          ))}
        </div>
      </div>

      {/* Grid - 2 cols mobile, 3 cols desktop */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900"
          >
            <div className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              <Skeleton className="h-5 w-12 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Dashboard stats skeleton
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-7 w-28 md:h-8" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>

      {/* Stats - 2x2 on mobile, 4 cols on desktop */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-3 md:p-0">
            <CardHeader className="flex flex-row items-center justify-between p-0 pb-1 md:p-6 md:pb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent className="p-0 md:p-6 md:pt-0">
              <Skeleton className="h-7 w-12 md:h-8" />
              <Skeleton className="h-3 w-16 mt-1 hidden md:block" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent projects skeleton */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-2 w-2 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-28" />
                </div>
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

// Conversations skeleton
export function ConversationsSkeleton() {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="border-b">
        <div className="px-4 md:px-6 pt-4 pb-0">
          <Skeleton className="h-7 w-32" />
        </div>
        <div className="px-4 md:px-6 py-3">
          <div className="flex gap-4">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 min-h-0">
        {/* List */}
        <div className="w-full md:w-80 md:border-r p-3 space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Chat panel - desktop only */}
        <div className="hidden md:flex flex-1 items-center justify-center">
          <div className="text-center space-y-2">
            <Skeleton className="h-12 w-12 mx-auto rounded-full" />
            <Skeleton className="h-5 w-40 mx-auto" />
            <Skeleton className="h-4 w-56 mx-auto" />
          </div>
        </div>
      </div>
    </div>
  )
}
