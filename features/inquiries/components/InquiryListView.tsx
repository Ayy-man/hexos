'use client'

import { useState, useTransition, useOptimistic } from 'react'
import { LayoutList, LayoutGrid } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { InquiryTableView } from './InquiryTableView'
import { InquiryBoardView } from './InquiryBoardView'
import { updateStageAction } from '../actions/inquiryActions'
import { getStageName } from './StageBadge'
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
  estimated_value: number | null
  blueprint: { name: string } | null
  submitter: { name: string; email: string } | null
  assignee: { id: string; name: string; email: string } | null
  archived_at: string | null
}

interface InquiryListViewProps {
  inquiries: Inquiry[]
  defaultView?: 'table' | 'board'
}

export function InquiryListView({ inquiries, defaultView = 'table' }: InquiryListViewProps) {
  const [view, setView] = useState<'table' | 'board'>(defaultView)
  const [isPending, startTransition] = useTransition()

  // Optimistic updates for smoother UX
  const [optimisticInquiries, setOptimisticInquiries] = useOptimistic(
    inquiries,
    (state, { id, stage }: { id: string; stage: ProposalStage }) =>
      state.map((inquiry) =>
        inquiry.id === id ? { ...inquiry, proposal_stage: stage } : inquiry
      )
  )

  const handleStageChange = (id: string, stage: ProposalStage) => {
    const inquiry = inquiries.find((i) => i.id === id)
    const companyName = inquiry?.prospect_company_name || 'Inquiry'

    startTransition(async () => {
      // Optimistically update the UI
      setOptimisticInquiries({ id, stage })

      try {
        await updateStageAction(id, stage)
        toast.success(`Moved to ${getStageName(stage)}`, {
          description: companyName,
        })
      } catch (error) {
        console.error('Failed to update stage:', error)
        toast.error('Failed to update stage', {
          description: error instanceof Error ? error.message : 'Please try again',
        })
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
            inquiries={optimisticInquiries}
            onStageChange={handleStageChange}
          />
        ) : (
          <InquiryBoardView
            inquiries={optimisticInquiries}
            onStageChange={handleStageChange}
          />
        )}
      </div>
    </div>
  )
}
