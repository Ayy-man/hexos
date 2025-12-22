'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDistanceToNow, format, isPast } from 'date-fns'
import { ChevronDown, ChevronRight, Building2, MoreHorizontal, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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

interface InquiryTableViewProps {
  inquiries: Inquiry[]
  onStageChange?: (id: string, stage: ProposalStage) => void
}

function groupInquiriesByStage(inquiries: Inquiry[]): Record<ProposalStage, Inquiry[]> {
  const groups: Record<ProposalStage, Inquiry[]> = {
    unopened: [],
    admin_reviewed: [],
    in_queue: [],
    working: [],
    on_hold: [],
    final_review: [],
    ready: [],
    sent: [],
    closed: [],
    lost: [],
  }

  inquiries.forEach((inquiry) => {
    const stage = inquiry.proposal_stage || 'unopened'
    groups[stage].push(inquiry)
  })

  return groups
}

export function InquiryTableView({ inquiries, onStageChange }: InquiryTableViewProps) {
  // Track which stages are collapsed
  const [collapsedStages, setCollapsedStages] = useState<Set<ProposalStage>>(new Set())

  // Local state for grouped inquiries
  const [groupedInquiries, setGroupedInquiries] = useState<Record<ProposalStage, Inquiry[]>>(() =>
    groupInquiriesByStage(inquiries)
  )

  // Track drag over stage for visual feedback
  const [dragOverStage, setDragOverStage] = useState<ProposalStage | null>(null)
  const [draggedInquiry, setDraggedInquiry] = useState<{ id: string; stage: ProposalStage } | null>(null)

  // Sync with props
  useEffect(() => {
    setGroupedInquiries(groupInquiriesByStage(inquiries))
  }, [inquiries])

  const toggleStage = (stage: ProposalStage) => {
    setCollapsedStages((prev) => {
      const next = new Set(prev)
      if (next.has(stage)) {
        next.delete(stage)
      } else {
        next.add(stage)
      }
      return next
    })
  }

  const formatValue = (value: number | null) => {
    if (!value) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatDueDate = (date: string | null) => {
    if (!date) return '-'
    const d = new Date(date)
    const isOverdue = isPast(d)
    return (
      <span className={cn(isOverdue && 'text-red-500 font-medium')}>
        {format(d, 'MMM d')}
      </span>
    )
  }

  // Handle HTML5 drag events for cross-stage moves
  const handleDragStart = (e: React.DragEvent, inquiryId: string, stage: ProposalStage) => {
    e.dataTransfer.setData('text/plain', inquiryId)
    e.dataTransfer.effectAllowed = 'move'
    setDraggedInquiry({ id: inquiryId, stage })
  }

  const handleDragEnd = () => {
    setDraggedInquiry(null)
    setDragOverStage(null)
  }

  const handleDragOverStage = (e: React.DragEvent, stage: ProposalStage) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggedInquiry && draggedInquiry.stage !== stage) {
      setDragOverStage(stage)
    }
  }

  const handleDragLeaveStage = () => {
    setDragOverStage(null)
  }

  const handleDropOnStage = (e: React.DragEvent, stage: ProposalStage) => {
    e.preventDefault()
    const inquiryId = e.dataTransfer.getData('text/plain')
    if (inquiryId && draggedInquiry && draggedInquiry.stage !== stage && onStageChange) {
      onStageChange(inquiryId, stage)
    }
    setDraggedInquiry(null)
    setDragOverStage(null)
  }

  return (
    <div className="space-y-2">
      {STAGE_ORDER.map((stage) => {
        const stageInquiries = groupedInquiries[stage]
        const isCollapsed = collapsedStages.has(stage)
        const count = stageInquiries.length
        const isDropTarget = dragOverStage === stage

        return (
          <div
            key={stage}
            className={cn(
              'border rounded-lg overflow-hidden transition-all',
              isDropTarget && 'ring-2 ring-primary ring-offset-2'
            )}
            onDragOver={(e) => handleDragOverStage(e, stage)}
            onDragLeave={handleDragLeaveStage}
            onDrop={(e) => handleDropOnStage(e, stage)}
          >
            {/* Stage Header */}
            <button
              onClick={() => toggleStage(stage)}
              className={cn(
                'w-full flex items-center gap-2 px-4 py-2 bg-muted/50 hover:bg-muted/70 transition-colors text-left',
                isDropTarget && 'bg-primary/10'
              )}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
              <StageBadge stage={stage} />
              <span className="text-sm text-muted-foreground ml-1">
                {count}
              </span>
              {isDropTarget && (
                <span className="text-xs text-primary ml-2">Drop here to move</span>
              )}
            </button>

            {/* Stage Content */}
            {!isCollapsed && count > 0 && (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead className="w-[280px]">Name</TableHead>
                    <TableHead>DFY</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stageInquiries.map((inquiry) => (
                    <TableRow
                      key={inquiry.id}
                      className="group cursor-grab active:cursor-grabbing"
                      draggable
                      onDragStart={(e) => handleDragStart(e, inquiry.id, stage)}
                      onDragEnd={handleDragEnd}
                    >
                      <TableCell className="w-[40px]">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/inquiries/${inquiry.id}`}
                          className="flex items-center gap-2 hover:underline"
                          draggable={false}
                        >
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {inquiry.prospect_company_name || 'Unnamed'}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {inquiry.partner_name}
                      </TableCell>
                      <TableCell>
                        {formatDueDate(inquiry.due_date)}
                      </TableCell>
                      <TableCell>
                        <PriorityBadge priority={inquiry.priority} />
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatValue(inquiry.estimated_value)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDistanceToNow(new Date(inquiry.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/inquiries/${inquiry.id}`}>
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {STAGE_ORDER.filter((s) => s !== stage).map((targetStage) => (
                              <DropdownMenuItem
                                key={targetStage}
                                onClick={() => onStageChange?.(inquiry.id, targetStage)}
                              >
                                Move to {getStageName(targetStage)}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* Empty State */}
            {!isCollapsed && count === 0 && (
              <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                No inquiries in this stage
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
