'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { formatDistanceToNow, format, isPast } from 'date-fns'
import { Building2, Calendar, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dropTargetStage, setDropTargetStage] = useState<ProposalStage | null>(null)

  // Group inquiries by stage
  const groupedInquiries = useMemo(() => {
    const groups: Record<ProposalStage, Inquiry[]> = {
      agreed: [],
      proposal_sent: [],
      proposal_verify: [],
      on_hold: [],
      pending: [],
    }

    inquiries.forEach((inquiry) => {
      const stage = inquiry.proposal_stage || 'pending'
      groups[stage].push(inquiry)
    })

    return groups
  }, [inquiries])

  const handleDragStart = (e: React.DragEvent, inquiryId: string) => {
    setDraggedId(inquiryId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', inquiryId)
    // Add a visual cue for the dragged element
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5'
    }
  }

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedId(null)
    setDropTargetStage(null)
    // Reset opacity
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1'
    }
  }

  const handleDragOver = (e: React.DragEvent, stage: ProposalStage) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTargetStage(stage)
  }

  const handleDragLeave = () => {
    setDropTargetStage(null)
  }

  const handleDrop = (e: React.DragEvent, stage: ProposalStage) => {
    e.preventDefault()
    // Try to get ID from dataTransfer first (more reliable across browsers)
    const inquiryId = e.dataTransfer.getData('text/plain') || draggedId
    if (inquiryId && onStageChange) {
      // Only trigger if actually moving to a different stage
      const inquiry = inquiries.find(i => i.id === inquiryId)
      const currentStage = inquiry?.proposal_stage || 'pending'
      if (currentStage !== stage) {
        onStageChange(inquiryId, stage)
      }
    }
    setDraggedId(null)
    setDropTargetStage(null)
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

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {STAGE_ORDER.map((stage) => {
        const stageInquiries = groupedInquiries[stage]
        const isDropTarget = dropTargetStage === stage

        return (
          <div
            key={stage}
            className={cn(
              'flex-shrink-0 w-[280px] rounded-lg bg-muted/30 border-t-4',
              STAGE_COLORS[stage],
              isDropTarget && 'ring-2 ring-cyan-500 ring-offset-2'
            )}
            onDragOver={(e) => handleDragOver(e, stage)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, stage)}
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
            <div className="p-2 space-y-2 min-h-[400px]">
              {stageInquiries.map((inquiry) => (
                <InquiryCard
                  key={inquiry.id}
                  inquiry={inquiry}
                  isDragging={draggedId === inquiry.id}
                  onDragStart={(e) => handleDragStart(e, inquiry.id)}
                  onDragEnd={handleDragEnd}
                  formatValue={formatValue}
                />
              ))}

              {stageInquiries.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Drop inquiries here
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

interface InquiryCardProps {
  inquiry: Inquiry
  isDragging: boolean
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: (e: React.DragEvent) => void
  formatValue: (value: number | null) => string | null
}

function InquiryCard({
  inquiry,
  isDragging,
  onDragStart,
  onDragEnd,
  formatValue,
}: InquiryCardProps) {
  const isOverdue = inquiry.due_date && isPast(new Date(inquiry.due_date))

  return (
    <Card
      draggable={true}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        'cursor-grab active:cursor-grabbing transition-all select-none',
        isDragging && 'opacity-50 scale-95 ring-2 ring-primary'
      )}
    >
      <CardContent className="p-3 space-y-2">
        {/* Company Name */}
        <Link
          href={`/inquiries/${inquiry.id}`}
          className="flex items-center gap-2 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="font-medium text-sm truncate">
            {inquiry.prospect_company_name || 'Unnamed'}
          </span>
        </Link>

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

        {/* Created Date */}
        <div className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(inquiry.created_at), { addSuffix: true })}
        </div>
      </CardContent>
    </Card>
  )
}
