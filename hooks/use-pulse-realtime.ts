'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PulseDailyTask, PulseStats, DailyPointsMap } from '@/lib/types/pulse'
import { PULSE_POINTS } from '@/lib/types/pulse'

interface UsePulseRealtimeOptions {
  userId: string
  initialTasks: PulseDailyTask[]
  initialStats: PulseStats
  initialHeatmapData: DailyPointsMap
  today: string
}

/**
 * Hook to subscribe to real-time pulse task updates via Supabase Realtime
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

  // Calculate stats from tasks
  const recalculateStats = useCallback((taskList: PulseDailyTask[]) => {
    const todayTasks = taskList.filter(t => t.date === today)
    const completedTasks = todayTasks.filter(t => t.completed_at)
    const todayPoints = completedTasks.reduce((sum, t) => {
      const points = t.linked_action_id ? PULSE_POINTS.linked_task_completed : PULSE_POINTS.task_completed
      return sum + points
    }, 0)

    setStats(prev => ({
      ...prev,
      todayPoints,
      streak: prev.streak, // Keep streak from server
      weekPoints: prev.weekPoints, // Recalculated on refresh
    }))

    // Update heatmap for today
    setHeatmapData(prev => ({
      ...prev,
      [today]: todayPoints,
    }))
  }, [today])

  // Subscribe to realtime task changes
  useEffect(() => {
    if (!userId) return

    const supabase = createClient()

    const channel = supabase
      .channel(`pulse-tasks-${userId}`)
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
            // Don't add if already exists (optimistic update already added it)
            if (prev.some(t => t.id === newTask.id)) {
              // Replace the optimistic version with the real one
              return prev.map(t => t.id === newTask.id ? newTask : t)
            }
            const updated = [...prev, newTask]
            recalculateStats(updated)
            return updated
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
          setTasks(prev => {
            const updated = prev.map(t => t.id === updatedTask.id ? updatedTask : t)
            recalculateStats(updated)
            return updated
          })
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
          setTasks(prev => {
            const updated = prev.filter(t => t.id !== deletedId)
            recalculateStats(updated)
            return updated
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, recalculateStats])

  // Optimistic update helpers
  const addOptimisticTask = useCallback((task: PulseDailyTask) => {
    setTasks(prev => [...prev, task])
    recalculateStats([...tasks, task])
  }, [tasks, recalculateStats])

  const updateOptimisticTask = useCallback((taskId: string, updates: Partial<PulseDailyTask>) => {
    setTasks(prev => {
      const updated = prev.map(t => t.id === taskId ? { ...t, ...updates } : t)
      recalculateStats(updated)
      return updated
    })
  }, [recalculateStats])

  const removeOptimisticTask = useCallback((taskId: string) => {
    setTasks(prev => {
      const updated = prev.filter(t => t.id !== taskId)
      recalculateStats(updated)
      return updated
    })
  }, [recalculateStats])

  return {
    tasks,
    stats,
    heatmapData,
    addOptimisticTask,
    updateOptimisticTask,
    removeOptimisticTask,
  }
}
