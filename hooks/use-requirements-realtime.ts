'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ProjectRequirement } from '@/lib/api/project-requirements'

interface UseRequirementsRealtimeOptions {
  projectId: string
  initialRequirements: ProjectRequirement[]
}

/**
 * Hook to subscribe to real-time updates for project requirements
 * Automatically refetches all requirements when any change occurs
 */
export function useRequirementsRealtime({
  projectId,
  initialRequirements,
}: UseRequirementsRealtimeOptions) {
  const [requirements, setRequirements] = useState(initialRequirements)
  const [isRefetching, setIsRefetching] = useState(false)
  const isRefetchingRef = useRef(false)

  const refetch = useCallback(async () => {
    if (isRefetchingRef.current) return
    isRefetchingRef.current = true
    setIsRefetching(true)

    try {
      const supabase = createClient()

      // Get requirements
      const { data: reqs, error: reqError } = await supabase
        .from('project_requirements')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true })

      if (reqError) throw reqError
      if (!reqs || reqs.length === 0) {
        setRequirements([])
        return
      }

      // Get all dependencies for these requirements
      const reqIds = reqs.map((r) => r.id)
      const { data: dependencies, error: depError } = await supabase
        .from('requirement_dependencies')
        .select('*')
        .in('requirement_id', reqIds)

      if (depError) throw depError

      // Create a map of requirements by id for dependency lookup
      const reqMap = new Map(reqs.map((r) => [r.id, r]))

      // Attach dependencies to each requirement
      const requirementsWithDeps = reqs.map((req) => ({
        ...req,
        dependencies: (dependencies || [])
          .filter((d) => d.requirement_id === req.id)
          .map((d) => ({
            ...d,
            depends_on: reqMap.get(d.depends_on_id),
          })),
      }))

      setRequirements(requirementsWithDeps as ProjectRequirement[])
    } catch (error) {
      console.error('Failed to refetch requirements:', error)
    } finally {
      isRefetchingRef.current = false
      setIsRefetching(false)
    }
  }, [projectId])

  useEffect(() => {
    const supabase = createClient()

    // Subscribe to requirements table changes
    const channel = supabase
      .channel(`requirements-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_requirements',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          // Refetch on any change
          refetch()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'requirement_dependencies',
        },
        () => {
          // Dependencies changed - refetch
          refetch()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, refetch])

  return {
    requirements,
    isRefetching,
    refetch,
  }
}
