export default function Loading() {
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-7 w-48 animate-pulse rounded bg-bg-surface" />
      </div>
      <div className="rounded-lg border border-border-hairline bg-bg-card p-8">
        <div className="space-y-3">
          <div className="h-4 w-3/4 animate-pulse rounded bg-bg-surface" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-bg-surface" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-bg-surface" />
        </div>
      </div>
    </div>
  )
}
