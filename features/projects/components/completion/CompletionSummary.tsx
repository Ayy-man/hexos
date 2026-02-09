'use client'

import { useState } from 'react'
import { RefreshCw, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { ProjectWithRelations } from '@/lib/api/projects'

interface CompletionSummaryProps {
  project: ProjectWithRelations
}

export function CompletionSummary({ project }: CompletionSummaryProps) {
  const [showRetainerForm, setShowRetainerForm] = useState(false)
  const [showTaskForm, setShowTaskForm] = useState(false)

  if (!project.completion_summary) {
    return null
  }

  const summary = project.completion_summary as {
    total_deliverables?: number
    total_deliverables_all?: number
    timeline_days?: number
    start_date?: string
    completion_date?: string
    team_members?: Array<{ id: string; name: string; role: string }>
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString()
  }

  return (
    <Card className="py-3">
      <CardHeader className="p-0 px-4">
        <CardTitle className="text-base font-medium">Completion Summary</CardTitle>
      </CardHeader>
      <CardContent className="p-0 px-4 mt-3">
        <div className="space-y-3">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-stone-500 dark:text-stone-400">
                Deliverables
              </div>
              <div className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                {summary.total_deliverables || 0}
                {summary.total_deliverables_all ? ` / ${summary.total_deliverables_all}` : ''}
              </div>
            </div>

            {summary.timeline_days && (
              <div>
                <div className="text-xs text-stone-500 dark:text-stone-400">
                  Duration
                </div>
                <div className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                  {summary.timeline_days} days
                </div>
              </div>
            )}
          </div>

          {/* Timeline */}
          {summary.start_date && summary.completion_date && (
            <div>
              <div className="text-xs text-stone-500 dark:text-stone-400 mb-1">
                Timeline
              </div>
              <div className="text-sm text-stone-700 dark:text-stone-300">
                {formatDate(summary.start_date)} → {formatDate(summary.completion_date)}
              </div>
            </div>
          )}

          {/* Team Members */}
          {summary.team_members && summary.team_members.length > 0 && (
            <div>
              <div className="text-xs text-stone-500 dark:text-stone-400 mb-1">
                Team
              </div>
              <div className="text-sm text-stone-700 dark:text-stone-300">
                {summary.team_members.map(m => m.name).join(', ')}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRetainerForm(true)}
              className="flex-1"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Convert to Retainer
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTaskForm(true)}
              className="flex-1"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Create Task
            </Button>
          </div>

          {/* Placeholder forms (will be implemented in retainer tasks plan) */}
          {showRetainerForm && (
            <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 dark:border-stone-800 dark:bg-stone-800/50">
              <p className="text-sm text-stone-600 dark:text-stone-400">
                Retainer conversion form coming soon...
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRetainerForm(false)}
                className="mt-2"
              >
                Close
              </Button>
            </div>
          )}

          {showTaskForm && (
            <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 dark:border-stone-800 dark:bg-stone-800/50">
              <p className="text-sm text-stone-600 dark:text-stone-400">
                Task creation form coming soon...
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTaskForm(false)}
                className="mt-2"
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
