'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { format, isPast } from 'date-fns'
import { Building2, Calendar, User, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanColumnContent,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay,
  type KanbanMoveEvent,
} from '@/components/ui/sortable'
import { StageBadge, STAGE_ORDER, getStageName } from './StageBadge'
import { PriorityBadge } from './PriorityBadge'
import type { ProposalStage, Priority } from '@/lib/api/inquiries'

// Type for inquiry from getInquiries
interface Inquiry {
  id: string
  prospect_company_name: string | null
  partner_name: string
  submission_type: string
  form_path: string
  created_at: string
  proposal_stage: ProposalStage | null
  priority: Priority | null
  due_date: string | null
  estimated_value: number | null
  blueprint: { name: string } | null
  submitter: { name: string; email: string } | null
  assignee: { id: string; name: string; email: string } | null
}

interface InquiryBoardViewProps {
  inquiries: Inquiry[]
  onStageChange?: (id: string, stage: ProposalStage) => void
}

const STAGE_COLORS: Record<ProposalStage, string> = {
  pending: 'border-t-red-500',
  proposal_sent: 'border-t-blue-500',
  proposal_verify: 'border-t-yellow-500',
  on_hold: 'border-t-orange-500',
  agreed: 'border-t-green-500',
}

export function InquiryBoardView({ inquiries, onStageChange }: InquiryBoardViewProps) {
  // Group inquiries by stage into the format Kanban expects
  const groupedInquiries = useMemo(() => {
    const groups: Record<ProposalStage, Inquiry[]> = {
      pending: [],
      proposal_sent: [],
      proposal_verify: [],
      on_hold: [],
      agreed: [],
    }

    inquiries.forEach((inquiry) => {
      const stage = inquiry.proposal_stage || 'pending'
      groups[stage].push(inquiry)
    })

    return groups
  }, [inquiries])

  const handleMove = (event: KanbanMoveEvent) => {
    const { activeContainer, overContainer } = event

    // Find the inquiry that was moved
    const movedInquiry = groupedInquiries[activeContainer as ProposalStage]?.find(
      (inquiry) => inquiry.id === event.event.active.id
    )

    if (movedInquiry && activeContainer !== overContainer && onStageChange) {
      onStageChange(movedInquiry.id, overContainer as ProposalStage)
    }
  }

  const handleValueChange = (newColumns: Record<string, Inquiry[]>) => {
    // This is called for internal reordering within columns
    // For now, we don't need to persist the order within columns
    // The onMove callback handles cross-column moves
  }

  const formatValue = (value: number | null) => {
    if (!value) return null
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Find an inquiry by ID for the overlay
  const findInquiryById = (id: string): Inquiry | undefined => {
    for (const stage of STAGE_ORDER) {
      const found = groupedInquiries[stage].find((i) => i.id === id)
      if (found) return found
    }
    return undefined
  }

  return (
    <Kanban
      value={groupedInquiries}
      onValueChange={handleValueChange}
      getItemValue={(item) => item.id}
      onMove={handleMove}
      className="pb-4"
    >
      <KanbanBoard className="flex gap-4 overflow-x-auto sm:grid-cols-5">
        {STAGE_ORDER.map((stage) => {
          const stageInquiries = groupedInquiries[stage]

          return (
            <KanbanColumn
              key={stage}
              value={stage}
              disabled
              className={cn(
                'flex-shrink-0 w-[280px] rounded-lg bg-muted/30 border-t-4',
                STAGE_COLORS[stage]
              )}
            >
              {/* Column Header */}
              <div className="p-3 border-b">
                <div className="flex items-center justify-between">
                  <StageBadge stage={stage} />
                  <Badge variant="secondary" className="text-xs">
                    {stageInquiries.length}
                  </Badge>
                </div>
              </div>

              {/* Column Content */}
              <KanbanColumnContent value={stage} className="p-2 min-h-[400px]">
                {stageInquiries.map((inquiry) => (
                  <KanbanItem key={inquiry.id} value={inquiry.id}>
                    <InquiryCard
                      inquiry={inquiry}
                      formatValue={formatValue}
                    />
                  </KanbanItem>
                ))}

                {stageInquiries.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Drop inquiries here
                  </div>
                )}
              </KanbanColumnContent>
            </KanbanColumn>
          )
        })}
      </KanbanBoard>

      {/* Drag Overlay - shows a preview of the dragged card */}
      <KanbanOverlay>
        {({ value }) => {
          const inquiry = findInquiryById(value as string)
          if (!inquiry) return null
          return (
            <InquiryCard
              inquiry={inquiry}
              formatValue={formatValue}
              isDragging
            />
          )
        }}
      </KanbanOverlay>
    </Kanban>
  )
}

interface InquiryCardProps {
  inquiry: Inquiry
  formatValue: (value: number | null) => string | null
  isDragging?: boolean
}

function InquiryCard({
  inquiry,
  formatValue,
  isDragging = false,
}: InquiryCardProps) {
  const isOverdue = inquiry.due_date && isPast(new Date(inquiry.due_date))

  return (
    <Card
      className={cn(
        'transition-all select-none group',
        isDragging && 'shadow-lg ring-2 ring-primary'
      )}
    >
      <CardContent className="p-3 space-y-2">
        {/* Drag Handle + Company Name */}
        <div className="flex items-center gap-2">
          <KanbanItemHandle className="text-muted-foreground hover:text-foreground transition-colors">
            <GripVertical className="h-4 w-4" />
          </KanbanItemHandle>
          <Link
            href={`/inquiries/${inquiry.id}`}
            className="flex items-center gap-2 hover:underline flex-1 min-w-0"
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          >
            <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium text-sm truncate">
              {inquiry.prospect_company_name || 'Unnamed'}
            </span>
          </Link>
        </div>

        {/* Priority & Value */}
        <div className="flex items-center justify-between">
          <PriorityBadge priority={inquiry.priority} showLabel={false} />
          {formatValue(inquiry.estimated_value) && (
            <span className="text-sm font-medium text-green-600 dark:text-green-400">
              {formatValue(inquiry.estimated_value)}
            </span>
          )}
        </div>

        {/* Partner & Due Date */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span className="truncate max-w-[100px]">{inquiry.partner_name}</span>
          </div>
          {inquiry.due_date && (
            <div className={cn(
              'flex items-center gap-1',
              isOverdue && 'text-red-500'
            )}>
              <Calendar className="h-3 w-3" />
              <span>{format(new Date(inquiry.due_date), 'MMM d')}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
