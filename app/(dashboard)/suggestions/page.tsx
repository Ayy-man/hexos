import { requireRole } from '@/lib/auth/guards'
import { getSuggestions, getSuggestionCounts } from '@/lib/api/suggestions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Lightbulb, CheckCircle, XCircle, Eye, Clock } from 'lucide-react'
import { SuggestionsList } from '@/features/suggestions/components/SuggestionsList'

const statusConfig = {
  new: { label: 'New', icon: Clock, color: 'bg-blue-500' },
  reviewed: { label: 'Reviewed', icon: Eye, color: 'bg-yellow-500' },
  implemented: { label: 'Implemented', icon: CheckCircle, color: 'bg-green-500' },
  declined: { label: 'Declined', icon: XCircle, color: 'bg-red-500' },
}

export default async function SuggestionsPage() {
  await requireRole(['admin', 'internal'])

  let suggestions: Awaited<ReturnType<typeof getSuggestions>> = []
  let counts: Awaited<ReturnType<typeof getSuggestionCounts>> = {
    new: 0,
    reviewed: 0,
    implemented: 0,
    declined: 0,
  }

  try {
    suggestions = await getSuggestions()
    counts = await getSuggestionCounts()
  } catch (error) {
    console.error('Failed to fetch suggestions:', error)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Lightbulb className="h-6 w-6 text-yellow-500" />
          Suggestions
        </h1>
        <p className="text-muted-foreground">
          Review and manage user suggestions for hexOS improvements
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {Object.entries(statusConfig).map(([status, config]) => {
          const Icon = config.icon
          const count = counts[status as keyof typeof counts] || 0
          return (
            <Card key={status}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium capitalize">
                  {config.label}
                </CardTitle>
                <div className={`p-2 rounded-full ${config.color}/10`}>
                  <Icon className={`h-4 w-4 ${config.color.replace('bg-', 'text-')}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{count}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Suggestions List */}
      {suggestions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Lightbulb className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No suggestions yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              When users submit suggestions, they&apos;ll appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <SuggestionsList suggestions={suggestions} />
      )}
    </div>
  )
}
