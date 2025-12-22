'use client'

import { Timeline, type TimelineItem } from '@/components/ui/timeline'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StageBadge, getStageName, STAGE_ORDER } from './StageBadge'
import type { ProposalStage } from '@/lib/api/inquiries'
import { FileText, Send, CheckCircle, Clock, PauseCircle, History, Eye, Briefcase, Search } from 'lucide-react'

interface StageHistoryEntry {
  from: ProposalStage | null
  to: ProposalStage
  changed_by: string
  changed_at: string
  notes?: string
}

interface StageHistoryTimelineProps {
  currentStage: ProposalStage | null
  stageHistory: StageHistoryEntry[]
  stageEnteredAt: string | null
  createdAt: string
  className?: string
}

const STAGE_ICONS: Record<ProposalStage, React.ReactNode> = {
  unopened: <Clock className="h-3 w-3" />,
  admin_reviewed: <Eye className="h-3 w-3" />,
  in_queue: <Send className="h-3 w-3" />,
  working: <Briefcase className="h-3 w-3" />,
  on_hold: <PauseCircle className="h-3 w-3" />,
  final_review: <Search className="h-3 w-3" />,
  ready: <CheckCircle className="h-3 w-3" />,
  sent: <Send className="h-3 w-3" />,
}

function getTimelineStatus(stage: ProposalStage, currentStage: ProposalStage): TimelineItem['status'] {
  const currentIndex = STAGE_ORDER.indexOf(currentStage)
  const stageIndex = STAGE_ORDER.indexOf(stage)

  if (stage === currentStage) return 'active'
  // STAGE_ORDER is ordered from unopened (0) to ready (6), so lower index = earlier stage
  if (stageIndex < currentIndex) return 'completed'
  return 'pending'
}

export function StageHistoryTimeline({
  currentStage,
  stageHistory,
  stageEnteredAt,
  createdAt,
  className,
}: StageHistoryTimelineProps) {
  const stage = currentStage || 'unopened'

  // Build timeline items from stage history
  const historyItems: TimelineItem[] = []

  // Add creation event
  historyItems.push({
    id: 'created',
    title: 'Inquiry Submitted',
    description: 'Proposal request was submitted',
    timestamp: new Date(createdAt),
    status: 'completed',
    icon: <FileText className="h-3 w-3" />,
  })

  // Add stage change events from history
  if (stageHistory && stageHistory.length > 0) {
    stageHistory.forEach((entry, index) => {
      historyItems.push({
        id: `history-${index}`,
        title: `Stage: ${getStageName(entry.to)}`,
        description: entry.notes || `Moved from ${entry.from ? getStageName(entry.from) : 'initial'} to ${getStageName(entry.to)}`,
        timestamp: new Date(entry.changed_at),
        status: 'completed',
        icon: STAGE_ICONS[entry.to],
      })
    })
  }

  // Add current stage if different from last history entry
  const lastHistoryStage = stageHistory?.[stageHistory.length - 1]?.to
  if (stage !== lastHistoryStage) {
    historyItems.push({
      id: 'current',
      title: `Current: ${getStageName(stage)}`,
      description: stageEnteredAt
        ? `Since ${new Date(stageEnteredAt).toLocaleDateString()}`
        : 'Current stage',
      timestamp: stageEnteredAt ? new Date(stageEnteredAt) : new Date(),
      status: 'active',
      icon: STAGE_ICONS[stage],
    })
  } else {
    // Mark the last item as active
    if (historyItems.length > 0) {
      historyItems[historyItems.length - 1].status = 'active'
    }
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4" />
          Proposal Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Stage Badge */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Current Stage</span>
          <StageBadge stage={stage} />
        </div>

        {/* Timeline */}
        <div className="pt-2 border-t">
          <Timeline
            items={historyItems}
            variant="compact"
            timestampPosition="inline"
            showTimestamps={true}
          />
        </div>

        {/* Stage Progress Indicator */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-2">Overall Progress</p>
          <div className="flex gap-1">
            {STAGE_ORDER.map((s) => {
              const isCurrent = s === stage
              const isPassed = STAGE_ORDER.indexOf(s) < STAGE_ORDER.indexOf(stage)

              return (
                <div
                  key={s}
                  className={`h-2 flex-1 rounded-full transition-colors ${
                    isCurrent
                      ? 'bg-primary animate-pulse'
                      : isPassed
                        ? 'bg-primary'
                        : 'bg-muted'
                  }`}
                  title={getStageName(s)}
                />
              )
            })}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-muted-foreground">Unopened</span>
            <span className="text-[10px] text-muted-foreground">Ready</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
