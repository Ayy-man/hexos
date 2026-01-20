'use client'

import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import {
  MoreHorizontal,
  Clock,
  DollarSign,
  ChevronDown,
  CheckCircle2,
  XCircle,
  ListChecks,
  User,
  Mail,
} from 'lucide-react'
import type { DevOpportunityBid, BidStatus } from '@/lib/api/bids'

interface BidCardProps {
  bid: DevOpportunityBid
  estimatedWeeks?: number
  onStatusChange?: (status: BidStatus) => void
  isUpdating?: boolean
}

const statusColors: Record<BidStatus, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  shortlisted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  accepted: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
  withdrawn: 'bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300',
}

const statusLabels: Record<BidStatus, string> = {
  pending: 'Pending',
  shortlisted: 'Shortlisted',
  accepted: 'Accepted',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
}

export function BidCard({
  bid,
  estimatedWeeks,
  onStatusChange,
  isUpdating,
}: BidCardProps) {
  const hasLongMessage = (bid.cover_message?.length || 0) > 150
  const canShortlist = bid.status === 'pending'
  const canAccept = bid.status === 'shortlisted'
  const canReject = bid.status === 'pending' || bid.status === 'shortlisted'
  const showActions = onStatusChange && (canShortlist || canAccept || canReject)

  const weeksDiff = estimatedWeeks ? bid.proposed_weeks - estimatedWeeks : 0

  return (
    <Card className={cn(
      'transition-all',
      bid.status === 'withdrawn' && 'opacity-50',
      bid.status === 'rejected' && 'opacity-60'
    )}>
      <CardContent className="p-4">
        {/* Header: Developer info + Status badge + Actions */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-medium text-sm truncate">
                {bid.dev?.name || 'Unknown Developer'}
              </span>
            </div>
            {bid.dev?.email && (
              <div className="flex items-center gap-2 mt-1">
                <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground truncate">
                  {bid.dev.email}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge className={cn('text-xs', statusColors[bid.status])}>
              {statusLabels[bid.status]}
            </Badge>

            {showActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={isUpdating}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canShortlist && (
                    <DropdownMenuItem onClick={() => onStatusChange?.('shortlisted')}>
                      <ListChecks className="h-4 w-4 mr-2" />
                      Shortlist
                    </DropdownMenuItem>
                  )}
                  {canAccept && (
                    <DropdownMenuItem onClick={() => onStatusChange?.('accepted')}>
                      <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                      Accept
                    </DropdownMenuItem>
                  )}
                  {canReject && (
                    <>
                      {(canShortlist || canAccept) && <DropdownMenuSeparator />}
                      <DropdownMenuItem
                        onClick={() => onStatusChange?.('rejected')}
                        className="text-red-600 focus:text-red-600"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Metrics: Weeks + Price */}
        <div className="flex flex-wrap gap-4 mb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">{bid.proposed_weeks}</span>
            <span className="text-sm text-muted-foreground">weeks</span>
            {weeksDiff !== 0 && (
              <span className={cn(
                'text-xs',
                weeksDiff < 0 ? 'text-green-600' : 'text-amber-600'
              )}>
                ({weeksDiff > 0 ? '+' : ''}{weeksDiff.toFixed(1)})
              </span>
            )}
          </div>

          {bid.proposed_price !== null && (
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">
                ${bid.proposed_price.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Cover Message */}
        {bid.cover_message && (
          hasLongMessage ? (
            <Collapsible>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {bid.cover_message}
                </p>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 px-2">
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Show more
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {bid.cover_message}
                  </p>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ) : (
            <p className="text-sm text-muted-foreground">
              {bid.cover_message}
            </p>
          )
        )}

        {/* Footer: Submitted date */}
        <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Submitted {formatDistanceToNow(new Date(bid.created_at), { addSuffix: true })}
          </span>
          {bid.reviewed_at && (
            <span>
              Reviewed {formatDistanceToNow(new Date(bid.reviewed_at), { addSuffix: true })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
