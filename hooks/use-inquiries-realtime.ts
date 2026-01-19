'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ProposalStage, Priority } from '@/lib/api/inquiries'

// Type for inquiry from getInquiries
export interface InquiryWithRelations {
  id: string
  prospect_company_name: string | null
  partner_name: string
  submission_type: string
  form_path: string
  created_at: string
  proposal_stage: ProposalStage | null
  priority: Priority | null
  due_date: string | null
  price_dfy: number | null
  admin_viewed_at: string | null
  blueprint: { name: string } | null
  submitter: { name: string; email: string } | null
  assignee: { id: string; name: string; email: string } | null
  project?: { id: string; project_name: string } | null
}

interface UseInquiriesRealtimeOptions {
  initialInquiries: InquiryWithRelations[]
  onStageChange?: (inquiryId: string, newStage: ProposalStage) => void
}

/**
 * Hook to subscribe to real-time inquiry updates via Supabase Realtime
 * Listens for stage changes, priority updates, and new inquiries
 */
export function useInquiriesRealtime({
  initialInquiries,
  onStageChange,
}: UseInquiriesRealtimeOptions) {
  const [inquiries, setInquiries] = useState<InquiryWithRelations[]>(initialInquiries)

  // Refetch all inquiries with relations
  const refetch = useCallback(async () => {
    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('inquiries')
        .select(`
          *,
          blueprint:blueprints(name),
          submitter:profiles!submitted_by(name, email),
          assignee:profiles!assigned_to(id, name, email),
          project:projects!converted_to_project_id(id, project_name)
        `)
        .is('deleted_at', null)
        .is('archived_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error

      const normalized = (data || []).map(normalizeInquiry)
      setInquiries(normalized)
    } catch (error) {
      console.error('Failed to fetch inquiries:', error)
    }
  }, [])

  // Update a single inquiry optimistically
  const updateInquiryStage = useCallback((inquiryId: string, stage: ProposalStage) => {
    setInquiries(prev =>
      prev.map(inquiry =>
        inquiry.id === inquiryId
          ? { ...inquiry, proposal_stage: stage }
          : inquiry
      )
    )
    onStageChange?.(inquiryId, stage)
  }, [onStageChange])

  // Subscribe to realtime inquiry changes
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('inquiries-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'inquiries',
        },
        async (payload) => {
          // New inquiry created - fetch with relations
          const newInquiry = payload.new as { id: string }

          const { data } = await supabase
            .from('inquiries')
            .select(`
              *,
              blueprint:blueprints(name),
              submitter:profiles!submitted_by(name, email),
              assignee:profiles!assigned_to(id, name, email),
              project:projects!converted_to_project_id(id, project_name)
            `)
            .eq('id', newInquiry.id)
            .single()

          if (data) {
            const normalized = normalizeInquiry(data)
            setInquiries(prev => [normalized, ...prev])
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'inquiries',
        },
        async (payload) => {
          // Inquiry updated - could be stage change, priority, etc.
          const updated = payload.new as { id: string; proposal_stage?: ProposalStage }
          const old = payload.old as { id: string; proposal_stage?: ProposalStage }

          // Fetch updated inquiry with relations
          const { data } = await supabase
            .from('inquiries')
            .select(`
              *,
              blueprint:blueprints(name),
              submitter:profiles!submitted_by(name, email),
              assignee:profiles!assigned_to(id, name, email),
              project:projects!converted_to_project_id(id, project_name)
            `)
            .eq('id', updated.id)
            .single()

          if (data) {
            const normalized = normalizeInquiry(data)

            // Check if it was archived or deleted
            if (data.archived_at || data.deleted_at) {
              // Remove from list
              setInquiries(prev => prev.filter(i => i.id !== updated.id))
            } else {
              // Update in list
              setInquiries(prev =>
                prev.map(inquiry =>
                  inquiry.id === updated.id ? normalized : inquiry
                )
              )
            }

            // Notify if stage changed
            if (old.proposal_stage !== updated.proposal_stage && updated.proposal_stage) {
              onStageChange?.(updated.id, updated.proposal_stage)
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'inquiries',
        },
        (payload) => {
          // Inquiry deleted (hard delete)
          const deleted = payload.old as { id: string }
          setInquiries(prev => prev.filter(i => i.id !== deleted.id))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [onStageChange])

  // Sync with initial props when they change
  useEffect(() => {
    setInquiries(initialInquiries)
  }, [initialInquiries])

  return {
    inquiries,
    refetch,
    updateInquiryStage,
  }
}

// Helper to normalize Supabase relations (handle array vs object)
function normalizeInquiry(inquiry: Record<string, unknown>): InquiryWithRelations {
  const blueprint = Array.isArray(inquiry.blueprint)
    ? inquiry.blueprint[0]
    : inquiry.blueprint
  const submitter = Array.isArray(inquiry.submitter)
    ? inquiry.submitter[0]
    : inquiry.submitter
  const assignee = Array.isArray(inquiry.assignee)
    ? inquiry.assignee[0]
    : inquiry.assignee
  const project = Array.isArray(inquiry.project)
    ? inquiry.project[0]
    : inquiry.project

  return {
    ...inquiry,
    blueprint,
    submitter,
    assignee,
    project,
  } as InquiryWithRelations
}
