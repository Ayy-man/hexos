import { Card } from '@/components/ui/card'
import { format } from 'date-fns'
import type { PulseInsights } from '@/lib/types/pulse'

interface PersonalRecordsCardProps {
  insights: PulseInsights
}

export function PersonalRecordsCard({ insights }: PersonalRecordsCardProps) {
  return (
    <Card className="p-6">
      <h2 className="text-sm font-medium text-muted-foreground mb-4">PERSONAL RECORDS</h2>

      <div className="space-y-4">
        <div>
          <div className="text-lg font-medium">
            {insights.bestDay?.points || 0} pts
          </div>
          <div className="text-sm text-muted-foreground">
            Best day
            {insights.bestDay && (
              <span className="ml-1">
                • {format(new Date(insights.bestDay.date), 'MMM d, yyyy')}
              </span>
            )}
          </div>
        </div>

        <div>
          <div className="text-lg font-medium">
            {insights.bestWeek?.points || 0} pts
          </div>
          <div className="text-sm text-muted-foreground">
            Best week
            {insights.bestWeek && (
              <span className="ml-1">
                • {format(new Date(insights.bestWeek.startDate), 'MMM d, yyyy')}
              </span>
            )}
          </div>
        </div>

        <div>
          <div className="text-lg font-medium">
            {insights.bestMonth?.points || 0} pts
          </div>
          <div className="text-sm text-muted-foreground">
            Best month
            {insights.bestMonth && (
              <span className="ml-1">• {insights.bestMonth.month}</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
