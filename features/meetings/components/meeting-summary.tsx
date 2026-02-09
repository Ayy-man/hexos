'use client'

import type { KeyDecision } from '@/lib/types/meetings'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface MeetingSummaryProps {
  summary: string | null
  keyDecisions: KeyDecision[] | null
}

export function MeetingSummary({ summary, keyDecisions }: MeetingSummaryProps) {
  if (!summary && (!keyDecisions || keyDecisions.length === 0)) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-muted-foreground">
          Summary not available yet
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Section */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Meeting Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{
                __html: summary
                  .split('\n')
                  .filter((line) => line.trim())
                  .map((line) => {
                    // Convert markdown bullet points to HTML
                    if (line.trim().startsWith('- ')) {
                      return `<li>${line.trim().substring(2)}</li>`
                    }
                    return `<p>${line}</p>`
                  })
                  .join('')
                  .replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>'),
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Key Decisions Section */}
      {keyDecisions && keyDecisions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Key Decisions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {keyDecisions.map((decision, index) => (
                <div
                  key={index}
                  className="border-l-4 border-emerald-500 pl-4 py-2"
                >
                  <h4 className="font-semibold mb-1">{decision.decision}</h4>
                  {decision.context && (
                    <p className="text-sm text-muted-foreground">
                      {decision.context}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
