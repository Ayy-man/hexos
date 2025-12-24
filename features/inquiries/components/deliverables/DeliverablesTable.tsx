'use client'

import { useState, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, CheckCheck } from 'lucide-react'
import { DeliverableRow } from './DeliverableRow'
import { TotalsDiff } from './DeliverableDiff'
import { needsReview } from './DeliverableStatusBadge'
import type {
  ProposalDeliverable,
  UpdateDeliverableInput,
  DeliverableHistoryEntry,
} from '@/lib/api/proposal-deliverables'

interface DeliverablesTableProps {
  deliverables: ProposalDeliverable[]
  isEditable: boolean
  isReviewer: boolean
  isDfyOwner?: boolean
  onUpdate: (id: string, input: UpdateDeliverableInput) => Promise<void>
  onRemove: (id: string) => Promise<void>
  onRevert: (id: string) => Promise<void>
  onReview?: (
    id: string,
    decision: 'approved' | 'rejected' | 'countered',
    counterName?: string,
    counterDescription?: string,
    counterPrice?: number,
    counterNote?: string
  ) => Promise<void>
  onAcceptCounter?: (id: string) => Promise<void>
  onRejectCounter?: (id: string, reason?: string) => Promise<void>
  onGetHistory?: (id: string) => Promise<DeliverableHistoryEntry[]>
  onBulkApprove?: (ids: string[]) => Promise<void>
  onAddDeliverable?: () => void
  onOpenComments?: (id: string) => void
  commentCounts?: Record<string, number>
}

export function DeliverablesTable({
  deliverables,
  isEditable,
  isReviewer,
  isDfyOwner = false,
  onUpdate,
  onRemove,
  onRevert,
  onReview,
  onAcceptCounter,
  onRejectCounter,
  onGetHistory,
  onBulkApprove,
  onAddDeliverable,
  onOpenComments,
  commentCounts = {},
}: DeliverablesTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Calculate totals
  const { originalTotal, currentTotal, pendingReviewCount } = useMemo(() => {
    let original = 0
    let current = 0
    let pending = 0

    deliverables.forEach((d) => {
      // Skip removed items from current total
      if (d.change_status !== 'removed' && d.change_status !== 'rejected') {
        const effectivePrice = d.counter_price ?? d.price ?? 0
        current += effectivePrice
      }

      // Original total from ai_parsed items
      if (d.source === 'ai_parsed') {
        const origPrice = d.original_price ?? d.price ?? 0
        original += origPrice
      }

      // Count pending reviews
      if (needsReview(d.change_status)) {
        pending++
      }
    })

    return {
      originalTotal: original,
      currentTotal: current,
      pendingReviewCount: pending,
    }
  }, [deliverables])

  // Items that can be selected for bulk actions
  const selectableItems = useMemo(
    () => deliverables.filter((d) => needsReview(d.change_status)),
    [deliverables]
  )

  const allSelected =
    selectableItems.length > 0 &&
    selectableItems.every((d) => selectedIds.has(d.id))

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(selectableItems.map((d) => d.id)))
    }
  }

  const handleSelectOne = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  const handleBulkApprove = async () => {
    if (!onBulkApprove || selectedIds.size === 0) return
    await onBulkApprove(Array.from(selectedIds))
    setSelectedIds(new Set())
  }

  if (deliverables.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No deliverables yet.</p>
        {onAddDeliverable && (
          <Button
            variant="outline"
            className="mt-4"
            onClick={onAddDeliverable}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Deliverable
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Bulk actions bar */}
      {isReviewer && selectableItems.length > 0 && (
        <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={allSelected}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} of {selectableItems.length} pending items
              selected
            </span>
          </div>
          {selectedIds.size > 0 && onBulkApprove && (
            <Button size="sm" onClick={handleBulkApprove}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Approve Selected
            </Button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Deliverable</TableHead>
              <TableHead className="max-w-xs">Description</TableHead>
              <TableHead className="text-right w-[120px]">Price</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="text-right w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deliverables.map((deliverable) => (
              <DeliverableRow
                key={deliverable.id}
                deliverable={deliverable}
                isEditable={isEditable}
                isReviewer={isReviewer}
                isDfyOwner={isDfyOwner}
                commentCount={commentCounts[deliverable.id]}
                onUpdate={onUpdate}
                onRemove={onRemove}
                onRevert={onRevert}
                onReview={onReview}
                onAcceptCounter={onAcceptCounter}
                onRejectCounter={onRejectCounter}
                onGetHistory={onGetHistory}
                onOpenComments={onOpenComments}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Totals */}
      <div className="flex items-center justify-between pt-4 border-t">
        <TotalsDiff
          originalTotal={originalTotal}
          currentTotal={currentTotal}
        />
        {isEditable && onAddDeliverable && (
          <Button variant="outline" onClick={onAddDeliverable}>
            <Plus className="h-4 w-4 mr-2" />
            Add Deliverable
          </Button>
        )}
      </div>
    </div>
  )
}
