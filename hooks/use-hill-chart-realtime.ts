'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { DeliverableWithHistory, PositionHistoryEntry } from '@/lib/api/hill-chart'

interface Deliverable {
  id: string
  project_id: string
  parent_id: string | null
  title: string
  description: string | null
  status: string
  estimated_hours: number | null
  start_date: string | null
  due_date: string | null
  completed_at: string | null
  sort_order: number
  created_at: string
  hill_position: number
  hill_color: string | null
}

interface UseHillChartRealtimeOptions {
  projectId: string
  initialDeliverables: Deliverable[]
}

/**
 * Hook to subscribe to real-time updates for hill chart deliverables
 * Automatically refetches deliverables and their position history when changes occur
 */
// Helper to deduplicate history entries by day (keep latest per day)
function deduplicateHistoryByDay(history: PositionHistoryEntry[]): PositionHistoryEntry[] {
  const sorted = [...history].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
  const entriesByDay = new Map<string, PositionHistoryEntry>()
  sorted.forEach((entry) => {
    const date = new Date(entry.created_at)
    const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    entriesByDay.set(dayKey, entry)
  })
  return Array.from(entriesByDay.values())
}

export function useHillChartRealtime({
  projectId,
  initialDeliverables,
}: UseHillChartRealtimeOptions) {
  const [deliverables, setDeliverables] = useState<DeliverableWithHistory[]>(
    initialDeliverables.map((d) => ({
      ...d,
      position_history: deduplicateHistoryByDay(
        ((d as any).position_history as PositionHistoryEntry[]) || []
      ),
    }))
  )
  const [isRefetching, setIsRefetching] = useState(false)

  const refetch = useCallback(async () => {
    if (isRefetching) return
    setIsRefetching(true)

    try {
      const supabase = createClient()

      // Fetch all deliverables with their history
      const { data: dels, error: delError } = await supabase
        .from('deliverables')
        .select(
          `
          *,
          position_history:deliverable_position_history(
            id,
            position,
            note,
            created_at,
            created_by
          )
        `
        )
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true })

      if (delError) throw delError

      if (!dels || dels.length === 0) {
        setDeliverables([])
        return
      }

      // Deduplicate history by day (keep latest per day)
      const deliverablesWithSortedHistory = dels.map((d) => ({
        ...d,
        position_history: deduplicateHistoryByDay(
          (d.position_history as PositionHistoryEntry[]) || []
        ),
      })) as DeliverableWithHistory[]

      setDeliverables(deliverablesWithSortedHistory)
    } catch (error) {
      console.error('Failed to refetch deliverables:', error)
    } finally {
      setIsRefetching(false)
    }
  }, [projectId, isRefetching])

  // Refetch on mount to ensure fresh data (safety net)
  useEffect(() => {
    refetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const supabase = createClient()

    // Get deliverable IDs for history filter
    const deliverableIds = initialDeliverables.map((d) => d.id)

    // Subscribe to deliverables table changes
    const channel = supabase
      .channel(`hill-chart-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deliverables',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          // Refetch on any deliverable change
          refetch()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deliverable_position_history',
        },
        (payload) => {
          // Only refetch if the history entry is for one of our deliverables
          const entry = (payload.new || payload.old) as PositionHistoryEntry
          if (entry && deliverableIds.includes(entry.deliverable_id)) {
            refetch()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, refetch, initialDeliverables])

  // Optimistic update helper - updates position and upserts today's history entry
  const optimisticUpdate = useCallback(
    (deliverableId: string, newPosition: number) => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      setDeliverables((prev) =>
        prev.map((d) => {
          if (d.id !== deliverableId) return d

          const history = (d.position_history as PositionHistoryEntry[]) || []

          // Check if there's already an entry for today
          const todayEntryIndex = history.findIndex((h) => {
            const entryDate = new Date(h.created_at)
            entryDate.setHours(0, 0, 0, 0)
            return entryDate.getTime() === today.getTime()
          })

          let newHistory: PositionHistoryEntry[]
          if (todayEntryIndex >= 0) {
            // Update existing entry for today
            newHistory = history.map((h, i) =>
              i === todayEntryIndex ? { ...h, position: newPosition } : h
            )
          } else {
            // Add new entry for today
            newHistory = [
              ...history,
              {
                id: `optimistic-${Date.now()}`,
                deliverable_id: deliverableId,
                position: newPosition,
                note: null,
                created_at: new Date().toISOString(),
                created_by: null,
              } as PositionHistoryEntry,
            ]
          }

          return {
            ...d,
            hill_position: newPosition,
            position_history: newHistory,
          }
        })
      )
    },
    []
  )

  return {
    deliverables,
    isRefetching,
    refetch,
    optimisticUpdate,
  }
}
