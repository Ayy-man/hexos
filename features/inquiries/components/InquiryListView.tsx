'use client'

import { useState, useTransition, useEffect } from 'react'
import { LayoutList, LayoutGrid } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { InquiryTableView } from './InquiryTableView'
import { InquiryBoardView } from './InquiryBoardView'
import { updateStageAction } from '../actions/inquiryActions'
import { getStageName } from './StageBadge'
import { useIsMobile } from '@/hooks/use-mobile'
import { useInquiriesRealtime, type InquiryWithRelations } from '@/hooks/use-inquiries-realtime'
import type { ProposalStage, Priority } from '@/lib/api/inquiries'

interface Inquiry {
  id: string
  prospect_company_name: string | null
  partner_name: string
  submission_type: string
  form_path: string
  created_at: string
  status: string
  proposal_stage: ProposalStage | null
  priority: Priority | null
  due_date: string | null
  price_dfy: number | null
  admin_viewed_at?: string | null
  blueprint: { name: string } | null
  submitter: { name: string; email: string } | null
  assignee: { id: string; name: string; email: string } | null
  archived_at: string | null
}

interface InquiryListViewProps {
  inquiries: Inquiry[]
  defaultView?: 'table' | 'board'
}

export function InquiryListView({ inquiries: initialInquiries, defaultView = 'table' }: InquiryListViewProps) {
  const isMobile = useIsMobile()
  const [view, setView] = useState<'table' | 'board'>(defaultView)
  const [isPending, startTransition] = useTransition()

  // Use realtime hook for live updates
  const { inquiries, updateInquiryStage } = useInquiriesRealtime({
    initialInquiries: initialInquiries as InquiryWithRelations[],
    onStageChange: (inquiryId, newStage) => {
      // Optional: Show toast for changes made by other users
      const inquiry = inquiries.find(i => i.id === inquiryId)
      if (inquiry) {
        console.log(`Inquiry ${inquiry.prospect_company_name} moved to ${getStageName(newStage)}`)
      }
    },
  })

  // Default to board view on mobile (better UX for kanban cards)
  useEffect(() => {
    if (isMobile && defaultView === 'table') {
      setView('board')
    }
  }, [isMobile, defaultView])

  const handleStageChange = (id: string, stage: ProposalStage) => {
    const inquiry = inquiries.find((i) => i.id === id)
    const companyName = inquiry?.prospect_company_name || 'Inquiry'
    const currentStage = inquiry?.proposal_stage || 'unopened'

    // Don't do anything if same stage
    if (currentStage === stage) return

    // Optimistically update via realtime hook
    updateInquiryStage(id, stage)

    startTransition(async () => {
      try {
        await updateStageAction(id, stage)
        toast.success(`Moved to ${getStageName(stage)}`, {
          description: companyName,
        })
        // No need to router.refresh() - realtime will handle the sync
      } catch (error) {
        console.error('Failed to update stage:', error)
        toast.error('Failed to update stage', {
          description: error instanceof Error ? error.message : 'Please try again',
        })
        // Revert on error by updating back to original stage
        updateInquiryStage(id, currentStage)
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex justify-end">
        <Tabs value={view} onValueChange={(v) => setView(v as 'table' | 'board')}>
          <TabsList>
            <TabsTrigger value="table" className="gap-2">
              <LayoutList className="h-4 w-4" />
              Table
            </TabsTrigger>
            <TabsTrigger value="board" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              Board
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* View Content */}
      <div className={isPending ? 'opacity-60 pointer-events-none' : ''}>
        {view === 'table' ? (
          <InquiryTableView
            inquiries={inquiries}
            onStageChange={handleStageChange}
          />
        ) : (
          <InquiryBoardView
            inquiries={inquiries}
            onStageChange={handleStageChange}
          />
        )}
      </div>
    </div>
  )
}
