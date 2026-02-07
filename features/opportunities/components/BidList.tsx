'use client'

import { useState, useTransition, useMemo } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Inbox, ArrowUpDown, Loader2 } from 'lucide-react'
import { BidCard } from './BidCard'
import { updateBidStatusAction } from '../actions/bidActions'
import type { DevOpportunityBid, BidStatus } from '@/lib/api/bid-types'

interface BidListProps {
  opportunityId: string
  bids: DevOpportunityBid[]
  estimatedWeeks?: number
}

type SortOption = 'newest' | 'oldest' | 'lowest_weeks' | 'highest_weeks' | 'lowest_price' | 'highest_price'

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'lowest_weeks', label: 'Lowest weeks' },
  { value: 'highest_weeks', label: 'Highest weeks' },
  { value: 'lowest_price', label: 'Lowest price' },
  { value: 'highest_price', label: 'Highest price' },
]

export function BidList({
  opportunityId,
  bids: initialBids,
  estimatedWeeks,
}: BidListProps) {
  const [bids, setBids] = useState(initialBids)
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [isPending, startTransition] = useTransition()
  const [updatingBidId, setUpdatingBidId] = useState<string | null>(null)

  // Sort bids based on selected option
  const sortedBids = useMemo(() => {
    const sorted = [...bids]

    switch (sortBy) {
      case 'newest':
        return sorted.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      case 'oldest':
        return sorted.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      case 'lowest_weeks':
        return sorted.sort((a, b) => a.proposed_weeks - b.proposed_weeks)
      case 'highest_weeks':
        return sorted.sort((a, b) => b.proposed_weeks - a.proposed_weeks)
      case 'lowest_price':
        return sorted.sort((a, b) => {
          // Null prices go to the end
          if (a.proposed_price === null) return 1
          if (b.proposed_price === null) return -1
          return a.proposed_price - b.proposed_price
        })
      case 'highest_price':
        return sorted.sort((a, b) => {
          // Null prices go to the end
          if (a.proposed_price === null) return 1
          if (b.proposed_price === null) return -1
          return b.proposed_price - a.proposed_price
        })
      default:
        return sorted
    }
  }, [bids, sortBy])

  const handleStatusChange = (bidId: string, status: BidStatus) => {
    setUpdatingBidId(bidId)

    // Optimistic update
    setBids((prev) =>
      prev.map((b) =>
        b.id === bidId
          ? {
              ...b,
              status,
              reviewed_at: new Date().toISOString(),
            }
          : b
      )
    )

    startTransition(async () => {
      try {
        await updateBidStatusAction(bidId, opportunityId, status)
        toast.success(`Bid ${status}`)
      } catch (error) {
        // Revert optimistic update
        setBids(initialBids)
        toast.error(
          error instanceof Error ? error.message : 'Failed to update bid status'
        )
      } finally {
        setUpdatingBidId(null)
      }
    })
  }

  // Count active bids (pending + shortlisted)
  const activeBidCount = bids.filter(
    (b) => b.status === 'pending' || b.status === 'shortlisted'
  ).length

  if (bids.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="font-medium text-lg mb-1">No bids yet</h3>
        <p className="text-sm text-muted-foreground">
          Bids will appear here when developers submit them.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with count and sort */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">
            {bids.length} {bids.length === 1 ? 'Bid' : 'Bids'}
          </h3>
          {activeBidCount > 0 && activeBidCount < bids.length && (
            <span className="text-sm text-muted-foreground">
              ({activeBidCount} active)
            </span>
          )}
          {isPending && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-[160px]">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bid cards */}
      <div className="space-y-3">
        {sortedBids.map((bid) => (
          <BidCard
            key={bid.id}
            bid={bid}
            estimatedWeeks={estimatedWeeks}
            onStatusChange={(status) => handleStatusChange(bid.id, status)}
            isUpdating={updatingBidId === bid.id}
          />
        ))}
      </div>
    </div>
  )
}
