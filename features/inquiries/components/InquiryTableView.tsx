'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { formatDistanceToNow, format, isPast } from 'date-fns'
import { ChevronDown, ChevronRight, Building2, MoreHorizontal } from 'lucide-react'
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

export function InquiryTableView({ inquiries, onStageChange }: InquiryTableViewProps) {
  // Track which stages are collapsed
  const [collapsedStages, setCollapsedStages] = useState<Set<ProposalStage>>(new Set())

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

  return (
    <div className="space-y-2">
      {STAGE_ORDER.map((stage) => {
        const stageInquiries = groupedInquiries[stage]
        const isCollapsed = collapsedStages.has(stage)
        const count = stageInquiries.length

        return (
          <div key={stage} className="border rounded-lg overflow-hidden">
            {/* Stage Header */}
            <button
              onClick={() => toggleStage(stage)}
              className="w-full flex items-center gap-2 px-4 py-2 bg-muted/50 hover:bg-muted/70 transition-colors text-left"
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
            </button>

            {/* Stage Content */}
            {!isCollapsed && count > 0 && (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[300px]">Name</TableHead>
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
                    <TableRow key={inquiry.id} className="group">
                      <TableCell>
                        <Link
                          href={`/inquiries/${inquiry.id}`}
                          className="flex items-center gap-2 hover:underline"
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
