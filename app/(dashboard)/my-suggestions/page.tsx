import { requireRole } from '@/lib/auth/guards'
import { getMySuggestions } from '@/lib/api/suggestions'
import { MySuggestionsList } from '@/features/suggestions/components/MySuggestionsList'
import { NewSuggestionDialog } from '@/features/suggestions/components/NewSuggestionDialog'

export const metadata = {
  title: 'My Suggestions | hexOS',
}

export default async function MySuggestionsPage() {
  // Only DFY and Dev users can access this page
  const profile = await requireRole(['dev', 'dfy'])

  const suggestions = await getMySuggestions()

  return (
    <div className="container max-w-4xl py-8">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">My Suggestions</h1>
            <p className="text-muted-foreground">
              Track your submitted suggestions and communicate with the team
            </p>
          </div>
          <NewSuggestionDialog />
        </div>

        {suggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium">No suggestions yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Use the Suggestion Box in the sidebar to submit your first suggestion
            </p>
          </div>
        ) : (
          <MySuggestionsList suggestions={suggestions} currentUserId={profile.id} />
        )}
      </div>
    </div>
  )
}
