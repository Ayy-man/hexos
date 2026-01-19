'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Zap, Hammer, Check, AlertTriangle, Calendar } from 'lucide-react'
import { toast } from 'sonner'

import { HillChart } from './HillChart'
import { ParentDeliverableCard } from './ParentDeliverableCard'
import { SubDeliverableCard } from './SubDeliverableCard'
import { StatCard } from './StatCard'
import { getDeadlineInfo } from './utils'
import type { HillChartItem, ParentHillChartItem, HistoryEntry, TestingInfo } from './types'
import type { ProjectWithRelations } from '@/lib/api/projects'
import type { UserRole } from '@/lib/auth/types'
import {
  isHillChartEditable,
  shouldShowHillChart,
  getPhaseForStatus,
  getPhaseName,
} from '@/lib/utils/projectPhases'
import { useHillChartRealtime } from '@/hooks/use-hill-chart-realtime'
import {
  updatePositionAction,
} from '@/features/projects/actions/hillChartActions'

interface HillChartTabProps {
  project: ProjectWithRelations
  userRole: UserRole
  isAdmin: boolean
  testingInfo: Record<string, TestingInfo>
}

export function HillChartTab({ project, userRole, isAdmin, testingInfo }: HillChartTabProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedDeliverableId, setSelectedDeliverableId] = useState<string | null>(null)

  // Convert testingInfo from Record to Map for internal use
  const testingInfoMap = useMemo(() => new Map(Object.entries(testingInfo)), [testingInfo])

  // Phase-based visibility and editability
  const showHillChart = shouldShowHillChart(project.status)
  const hillChartEditable = isHillChartEditable(project.status)
  const currentPhase = getPhaseForStatus(project.status)

  // Permission check - combine role permissions with phase permissions
  const canEdit = (isAdmin || userRole === 'internal' || userRole === 'dev' || userRole === 'dfy') && hillChartEditable

  // Use realtime hook for deliverables with history
  const { deliverables: realtimeDeliverables, optimisticUpdate } = useHillChartRealtime({
    projectId: project.id,
    initialDeliverables: (project.deliverables || []).map((d) => ({
      id: d.id,
      project_id: project.id,
      parent_id: d.parent_id,
      title: d.title,
      description: d.description,
      status: d.status,
      estimated_hours: d.estimated_hours,
      start_date: d.start_date,
      due_date: d.due_date,
      completed_at: d.completed_at,
      sort_order: d.sort_order,
      created_at: new Date().toISOString(), // Placeholder - not used
      hill_position: (d as any).hill_position || 0,
      hill_color: (d as any).hill_color || null,
      position_history: (d as any).position_history || [],
    })),
  })

  // Transform deliverables to hill chart format
  const { parentItems } = useMemo(() => {
    const deliverables = realtimeDeliverables || []
    const parents = deliverables.filter((d) => !d.parent_id)
    const children = deliverables.filter((d) => d.parent_id)

    // Group children by parent
    const childMap = new Map<string, typeof children>()
    children.forEach((c) => {
      if (c.parent_id) {
        const existing = childMap.get(c.parent_id) || []
        existing.push(c)
        childMap.set(c.parent_id, existing)
      }
    })

    // Transform position_history to HillChartItem history format
    const toHistory = (positionHistory: any[]): HistoryEntry[] => {
      if (!positionHistory || positionHistory.length === 0) return []
      return positionHistory.map((h) => ({
        x: h.position,
        timestamp: h.created_at,
      }))
    }

    // Build synthetic parent history from children's history
    // For each unique timestamp, calculate average position of all children at that point
    const buildParentHistory = (childItems: HillChartItem[]): HistoryEntry[] => {
      if (childItems.length === 0) return []

      // Collect all unique timestamps from children
      const allTimestamps = new Set<string>()
      childItems.forEach((c) => {
        c.history?.forEach((h) => allTimestamps.add(h.timestamp))
      })

      if (allTimestamps.size === 0) return []

      // Sort timestamps chronologically
      const sortedTimestamps = Array.from(allTimestamps).sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime()
      )

      // For each timestamp, calculate average position
      return sortedTimestamps.map((timestamp) => {
        const positionsAtTime = childItems.map((child) => {
          // Find the most recent history entry at or before this timestamp
          const historyUpToTime = (child.history || [])
            .filter((h) => h.timestamp <= timestamp)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

          // Use the most recent entry, or fall back to current position
          return historyUpToTime[0]?.x ?? child.x
        })

        const avg = Math.round(
          positionsAtTime.reduce((sum, pos) => sum + pos, 0) / positionsAtTime.length
        )

        return { x: avg, timestamp }
      })
    }

    // Transform to hill chart format
    const parentHillItems: ParentHillChartItem[] = parents.map((parent) => {
      const parentChildren = childMap.get(parent.id) || []

      // Transform children to HillChartItem
      const childItems: HillChartItem[] = parentChildren.map((c) => ({
        id: c.id,
        name: c.title,
        x: c.hill_position || 0,
        color: c.hill_color || generateColor(c.title),
        deadline: c.due_date,
        history: toHistory((c as any).position_history || []),
        testing: testingInfoMap.get(c.id), // Add testing info if available
      }))

      // Calculate parent position as average of children
      const avgPosition =
        childItems.length > 0
          ? Math.round(childItems.reduce((sum, c) => sum + c.x, 0) / childItems.length)
          : parent.hill_position || 0

      // Build synthetic history from children's history
      const parentHistory = buildParentHistory(childItems)

      return {
        id: parent.id,
        name: parent.title,
        x: avgPosition,
        color: parent.hill_color || generateColor(parent.title),
        deadline: parent.due_date,
        history: parentHistory,
        subCount: childItems.length,
        children: childItems,
      }
    })

    return { parentItems: parentHillItems }
  }, [realtimeDeliverables, testingInfoMap])

  // Get current items based on selection
  const selectedParent = selectedDeliverableId
    ? parentItems.find((p) => p.id === selectedDeliverableId)
    : null
  const currentItems: HillChartItem[] = selectedParent
    ? selectedParent.children
    : parentItems

  // Calculate stats
  const stats = useMemo(() => {
    return {
      figuring: currentItems.filter((t) => t.x < 50).length,
      making: currentItems.filter((t) => t.x >= 50 && t.x < 90).length,
      done: currentItems.filter((t) => t.x >= 90).length,
      overdue: currentItems.filter((t) => {
        const deadline = getDeadlineInfo(t.deadline, t.x)
        return deadline.isOverdue
      }).length,
    }
  }, [currentItems])

  // Handle position update from drag
  const handleItemUpdate = (id: string, newX: number) => {
    console.log('[handleItemUpdate] Called:', { id, projectId: project.id, newX, canEdit })
    if (!canEdit) {
      console.log('[handleItemUpdate] BLOCKED - canEdit is false')
      return
    }

    // Optimistic update - instant UI feedback
    optimisticUpdate(id, newX)
    console.log('[handleItemUpdate] Optimistic update done, calling server action...')

    startTransition(async () => {
      try {
        console.log('[handleItemUpdate] Calling updatePositionAction...')
        await updatePositionAction(id, project.id, newX)
        console.log('[handleItemUpdate] SUCCESS - Server action completed')
        // Refresh server components to update Testing tab visibility
        router.refresh()
      } catch (error) {
        toast.error('Failed to update position')
        console.error('[handleItemUpdate] FAILED:', error)
      }
    })
  }

  // Handle quick update buttons
  const handleQuickUpdate = (id: string, newX: number) => {
    console.log('[handleQuickUpdate] Called:', { id, projectId: project.id, newX, canEdit })
    if (!canEdit) {
      console.log('[handleQuickUpdate] BLOCKED - canEdit is false')
      return
    }

    // Optimistic update - instant UI feedback
    optimisticUpdate(id, newX)
    console.log('[handleQuickUpdate] Optimistic update done, calling server action...')

    startTransition(async () => {
      try {
        console.log('[handleQuickUpdate] Calling updatePositionAction...')
        await updatePositionAction(id, project.id, newX)
        console.log('[handleQuickUpdate] SUCCESS - Server action completed')
        toast.success(`Saved: ${Math.round(newX)}%`)
        // Refresh server components to update Testing tab visibility
        router.refresh()
      } catch (error) {
        toast.error('Failed to save - please refresh')
        console.error('[handleQuickUpdate] FAILED:', error)
      }
    })
  }

  // Phase-based visibility: hide during early phases
  if (!showHillChart) {
    return (
      <Card className="border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <CardContent className="py-12 text-center">
          <p className="mb-2 text-zinc-500 dark:text-zinc-400">Hill Chart not available yet</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-600">
            Progress tracking will be available once the project enters the development phase.
          </p>
          <p className="mt-4 text-xs text-zinc-400 dark:text-zinc-600">
            Current phase: <span className="font-medium">{getPhaseName(currentPhase)}</span>
          </p>
        </CardContent>
      </Card>
    )
  }

  // Empty state
  if (parentItems.length === 0) {
    return (
      <Card className="border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <CardContent className="py-12 text-center">
          <p className="mb-2 text-zinc-500 dark:text-zinc-400">No deliverables to track</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-600">
            Add deliverables in the Deliverables tab to visualize progress here.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Check if in read-only mode (delivery or closed phases)
  const isReadOnlyPhase = showHillChart && !hillChartEditable

  return (
    <div className="space-y-4">
      {/* Read-only banner for delivery/closed phases */}
      {isReadOnlyPhase && (
        <Card className="border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
          <CardContent className="py-3 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
            <Calendar className="h-4 w-4" />
            <span>
              This project is in the <span className="font-medium">{getPhaseName(currentPhase)}</span> phase.
              Progress is view-only.
            </span>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <Card className="border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <CardContent className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {selectedDeliverableId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDeliverableId(null)}
                className="border-zinc-300 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {selectedParent ? selectedParent.name : 'Project Hill Chart'}
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-600">
                {selectedParent
                  ? `${selectedParent.children.length} sub-deliverables`
                  : `${parentItems.length} deliverables`}
                {selectedParent?.deadline && (
                  <span className="text-zinc-400 dark:text-zinc-500"> • Due {selectedParent.deadline}</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="rounded-md border border-zinc-200 bg-zinc-100 px-3 py-1.5 dark:border-zinc-800 dark:bg-zinc-950">
              <span className="text-xs text-zinc-500 dark:text-zinc-600">Today: </span>
              <span className="text-sm font-semibold text-cyan-500">
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hill Chart */}
      <Card className="border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <CardContent className="p-4">
          <HillChart
            items={currentItems}
            onItemUpdate={selectedDeliverableId ? handleItemUpdate : undefined}
            readOnly={!selectedDeliverableId}
            isEditMode={!!selectedDeliverableId && canEdit}
            width={864}
            height={300}
          />
        </CardContent>
      </Card>

      {/* Stats Row */}
      <div
        className={`grid gap-3 ${stats.overdue > 0 ? 'grid-cols-4' : 'grid-cols-3'}`}
      >
        <StatCard
          label="Figuring Out"
          value={stats.figuring}
          colorClass="text-amber-500"
          icon={<Zap className="h-3.5 w-3.5" />}
        />
        <StatCard
          label="Making It"
          value={stats.making}
          colorClass="text-cyan-500"
          icon={<Hammer className="h-3.5 w-3.5" />}
        />
        <StatCard
          label="Done"
          value={stats.done}
          colorClass="text-green-500"
          icon={<Check className="h-3.5 w-3.5" />}
        />
        {stats.overdue > 0 && (
          <StatCard
            label="Overdue"
            value={stats.overdue}
            colorClass="text-red-500"
            icon={<AlertTriangle className="h-3.5 w-3.5" />}
          />
        )}
      </div>

      {/* Items Grid */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {selectedDeliverableId ? 'Sub-deliverables' : 'Deliverables'}
        </h3>

        {selectedDeliverableId && selectedParent ? (
          // Expanded sub-deliverable cards
          <div className="grid gap-4 md:grid-cols-2">
            {selectedParent.children.map((item) => (
              <SubDeliverableCard
                key={item.id}
                item={item}
                testing={item.testing}
                onQuickUpdate={handleQuickUpdate}
                isLoading={isPending}
                disabled={!canEdit}
              />
            ))}
          </div>
        ) : (
          // Parent cards
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {parentItems.map((item) => (
              <ParentDeliverableCard
                key={item.id}
                item={item}
                onClick={() => setSelectedDeliverableId(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Help text */}
      <p className="text-center text-xs text-zinc-500 dark:text-zinc-600">
        {selectedDeliverableId
          ? 'Drag dots on the chart or use quick buttons to update progress'
          : 'Click a deliverable to expand and track sub-item progress'}
      </p>
    </div>
  )
}

// Helper to generate consistent color from string
function generateColor(text: string): string {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }

  const colors = [
    '#ef4444', // red
    '#f59e0b', // amber
    '#84cc16', // lime
    '#22c55e', // green
    '#06b6d4', // cyan
    '#3b82f6', // blue
    '#a855f7', // purple
    '#ec4899', // pink
  ]

  return colors[Math.abs(hash) % colors.length]
}
