import { Card } from '@/components/ui/card'
import type { PulseInsights } from '@/lib/types/pulse'

interface TaskCompletionChartProps {
  insights: PulseInsights
}

export function TaskCompletionChart({ insights }: TaskCompletionChartProps) {
  const data = [
    { label: 'Same day', value: insights.sameDay, color: 'bg-green-500' },
    { label: 'Next day', value: insights.nextDay, color: 'bg-yellow-500' },
    { label: 'Rolled 2+ days', value: insights.rolledMultiple, color: 'bg-orange-500' },
    { label: 'Abandoned', value: insights.abandoned, color: 'bg-red-500' },
  ]

  return (
    <Card className="p-6">
      <h2 className="text-sm font-medium text-muted-foreground mb-4">TASK COMPLETION</h2>

      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.label} className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm">{item.label}</span>
                <span className="text-sm font-medium">{item.value}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${item.color} transition-all`}
                  style={{ width: `${item.value}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t">
        <p className="text-sm text-muted-foreground">
          Avg times rolled before completion:{' '}
          <span className="font-medium text-foreground">
            {insights.avgTimesRolled.toFixed(1)}x
          </span>
        </p>
      </div>
    </Card>
  )
}
