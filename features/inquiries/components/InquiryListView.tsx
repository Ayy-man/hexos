'use client'

import { useState, useTransition, useOptimistic } from 'react'
import { useRouter } from 'next/navigation'
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
  price_dfy: number | null
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
  const router = useRouter()

  // Local state for immediate updates (more reliable than useOptimistic for this case)
  const [localInquiries, setLocalInquiries] = useState(inquiries)

  // Sync with server data when it changes
  if (JSON.stringify(inquiries) !== JSON.stringify(localInquiries) && !isPending) {
    setLocalInquiries(inquiries)
  }

  const handleStageChange = (id: string, stage: ProposalStage) => {
    const inquiry = localInquiries.find((i) => i.id === id)
    const companyName = inquiry?.prospect_company_name || 'Inquiry'
    const currentStage = inquiry?.proposal_stage || 'unopened'

    // Don't do anything if same stage
    if (currentStage === stage) return

    // Immediately update local state
    setLocalInquiries((prev) =>
      prev.map((i) => (i.id === id ? { ...i, proposal_stage: stage } : i))
    )

    startTransition(async () => {
      try {
        await updateStageAction(id, stage)
        toast.success(`Moved to ${getStageName(stage)}`, {
          description: companyName,
        })
        // Force refresh to get updated data from server
        router.refresh()
      } catch (error) {
        console.error('Failed to update stage:', error)
        toast.error('Failed to update stage', {
          description: error instanceof Error ? error.message : 'Please try again',
        })
        // Revert on error
        setLocalInquiries((prev) =>
          prev.map((i) => (i.id === id ? { ...i, proposal_stage: currentStage } : i))
        )
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
            inquiries={localInquiries}
            onStageChange={handleStageChange}
          />
        ) : (
          <InquiryBoardView
            inquiries={localInquiries}
            onStageChange={handleStageChange}
          />
        )}
      </div>
    </div>
  )
}
