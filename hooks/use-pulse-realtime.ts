'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PulseDailyTask, PulseStats, DailyPointsMap } from '@/lib/types/pulse'

interface PulseEvent {
  id: string
  user_id: string
  event_type: string
  points: number
  source_type: string
  source_id: string | null
  created_at: string
}

interface UsePulseRealtimeOptions {
  userId: string
  initialTasks: PulseDailyTask[]
  initialStats: PulseStats
  initialHeatmapData: DailyPointsMap
  today: string
}

/**
 * Hook to subscribe to real-time pulse updates via Supabase Realtime
 * - Subscribes to pulse_daily_tasks for task UI state
 * - Subscribes to pulse_events for points (source of truth)
 */
export function usePulseRealtime({
  userId,
  initialTasks,
  initialStats,
  initialHeatmapData,
  today,
}: UsePulseRealtimeOptions) {
  const [tasks, setTasks] = useState<PulseDailyTask[]>(initialTasks)
  const [stats, setStats] = useState<PulseStats>(initialStats)
  const [heatmapData, setHeatmapData] = useState<DailyPointsMap>(initialHeatmapData)

  // Sync with initial props when they change (e.g., from server refresh)
  useEffect(() => {
    setTasks(initialTasks)
  }, [initialTasks])

  useEffect(() => {
    setStats(initialStats)
  }, [initialStats])

  useEffect(() => {
    setHeatmapData(initialHeatmapData)
  }, [initialHeatmapData])

  // Subscribe to realtime changes
  useEffect(() => {
    if (!userId) return

    const supabase = createClient()

    const channel = supabase
      .channel(`pulse-${userId}`)
      // Task changes (for UI state: checkboxes, titles, etc.)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pulse_daily_tasks',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newTask = payload.new as PulseDailyTask
          setTasks(prev => {
            if (prev.some(t => t.id === newTask.id)) {
              return prev.map(t => t.id === newTask.id ? newTask : t)
            }
            return [...prev, newTask]
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pulse_daily_tasks',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updatedTask = payload.new as PulseDailyTask
          setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t))
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'pulse_daily_tasks',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id
          setTasks(prev => prev.filter(t => t.id !== deletedId))
        }
      )
      // Event changes (for points - source of truth)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pulse_events',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const event = payload.new as PulseEvent
          const eventDate = event.created_at.split('T')[0]

          // Add points to stats
          setStats(prev => ({
            ...prev,
            todayPoints: eventDate === today ? prev.todayPoints + event.points : prev.todayPoints,
            weekPoints: prev.weekPoints + event.points,
          }))

          // Update heatmap
          if (eventDate === today) {
            setHeatmapData(prev => ({
              ...prev,
              [today]: (prev[today] || 0) + event.points,
            }))
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'pulse_events',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const event = payload.old as PulseEvent
          const eventDate = event.created_at.split('T')[0]

          // Subtract points from stats
          setStats(prev => ({
            ...prev,
            todayPoints: eventDate === today ? Math.max(0, prev.todayPoints - event.points) : prev.todayPoints,
            weekPoints: Math.max(0, prev.weekPoints - event.points),
          }))

          // Update heatmap
          if (eventDate === today) {
            setHeatmapData(prev => ({
              ...prev,
              [today]: Math.max(0, (prev[today] || 0) - event.points),
            }))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, today])

  return {
    tasks,
    stats,
    heatmapData,
  }
}
