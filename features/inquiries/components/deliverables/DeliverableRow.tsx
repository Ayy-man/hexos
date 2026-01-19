'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { TableRow, TableCell } from '@/components/ui/table'
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  RotateCcw,
  MessageSquare,
  Check,
  X,
  ArrowRightLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DeliverableDiff, PriceDiff } from './DeliverableDiff'
import { DeliverableStatusBadge, needsReview } from './DeliverableStatusBadge'
import { CounterOfferDialog } from './CounterOfferDialog'
import { CounterResponseCard } from './CounterResponseCard'
import { DeliverableHistory } from './DeliverableHistory'
import type { ProposalDeliverable, UpdateDeliverableInput, DeliverableHistoryEntry } from '@/lib/api/proposal-deliverables'

interface DeliverableRowProps {
  deliverable: ProposalDeliverable
  isEditable: boolean
  isReviewer: boolean
  isDfyOwner?: boolean
  commentCount?: number
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
  onOpenComments?: (id: string) => void
}

export function DeliverableRow({
  deliverable,
  isEditable,
  isReviewer,
  isDfyOwner = false,
  commentCount = 0,
  onUpdate,
  onRemove,
  onRevert,
  onReview,
  onAcceptCounter,
  onRejectCounter,
  onGetHistory,
  onOpenComments,
}: DeliverableRowProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isCounterDialogOpen, setIsCounterDialogOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  // State for inline action expansion (approve/reject with optional note)
  const [pendingAction, setPendingAction] = useState<'approve' | 'reject' | null>(null)
  const [actionNote, setActionNote] = useState('')

  // Edit form state
  const [editName, setEditName] = useState(deliverable.name)
  const [editDescription, setEditDescription] = useState(
    deliverable.description || ''
  )
  const [editPrice, setEditPrice] = useState(deliverable.price?.toString() || '')

  const isRemoved = deliverable.change_status === 'removed'
  const hasChanges = needsReview(deliverable.change_status)
  const isCountered = deliverable.change_status === 'countered'
  const needsDfyResponse = isCountered && isDfyOwner

  const handleSaveEdit = () => {
    startTransition(async () => {
      await onUpdate(deliverable.id, {
        name: editName,
        description: editDescription || undefined,
        price: editPrice ? parseFloat(editPrice) : undefined,
      })
      setIsEditing(false)
    })
  }

  const handleCancelEdit = () => {
    setEditName(deliverable.name)
    setEditDescription(deliverable.description || '')
    setEditPrice(deliverable.price?.toString() || '')
    setIsEditing(false)
  }

  const handleRemove = () => {
    startTransition(async () => {
      await onRemove(deliverable.id)
    })
  }

  const handleRevert = () => {
    startTransition(async () => {
      await onRevert(deliverable.id)
    })
  }

  const handleApprove = () => {
    if (!onReview) return
    setPendingAction('approve')
  }

  const handleReject = () => {
    if (!onReview) return
    setPendingAction('reject')
  }

  const handleConfirmAction = () => {
    if (!onReview || !pendingAction) return
    startTransition(async () => {
      await onReview(
        deliverable.id,
        pendingAction === 'approve' ? 'approved' : 'rejected',
        undefined, // counterName
        undefined, // counterDescription
        undefined, // counterPrice
        actionNote || undefined // note (only if provided)
      )
      setPendingAction(null)
      setActionNote('')
    })
  }

  const handleCancelAction = () => {
    setPendingAction(null)
    setActionNote('')
  }

  const handleCounter = async (
    counterName?: string,
    counterDescription?: string,
    counterPrice?: number,
    counterNote?: string
  ) => {
    if (!onReview) return
    await onReview(
      deliverable.id,
      'countered',
      counterName,
      counterDescription,
      counterPrice,
      counterNote
    )
    setIsCounterDialogOpen(false)
  }

  const handleAcceptCounter = () => {
    if (!onAcceptCounter) return
    startTransition(async () => {
      await onAcceptCounter(deliverable.id)
    })
  }

  const handleRejectCounter = async (reason?: string) => {
    if (!onRejectCounter) return
    await onRejectCounter(deliverable.id, reason)
  }

  const handleEditAgain = () => {
    // Start editing mode with current values
    setEditName(deliverable.name)
    setEditDescription(deliverable.description || '')
    setEditPrice(deliverable.price?.toString() || '')
    setIsEditing(true)
  }

  return (
    <>
      <TableRow
        className={cn(
          isRemoved && 'opacity-50 bg-muted/50',
          isPending && 'opacity-70',
          (needsDfyResponse || pendingAction) && 'border-b-0'
        )}
      >
      {/* Name */}
      <TableCell className="font-medium">
        {isEditing ? (
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="h-8"
          />
        ) : (
          <div className="space-y-1">
            <div className={cn(isRemoved && 'line-through')}>
              {deliverable.original_name &&
              deliverable.original_name !== deliverable.name ? (
                <DeliverableDiff
                  originalValue={deliverable.original_name}
                  currentValue={deliverable.name}
                />
              ) : (
                deliverable.name
              )}
            </div>
            {/* History timeline */}
            {onGetHistory && (
              <DeliverableHistory
                deliverableId={deliverable.id}
                getHistory={onGetHistory}
              />
            )}
          </div>
        )}
      </TableCell>

      {/* Description */}
      <TableCell className="max-w-xs">
        {isEditing ? (
          <Textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            className="min-h-[60px] text-sm"
            rows={2}
          />
        ) : (
          <div
            className={cn(
              'text-sm text-muted-foreground truncate',
              isRemoved && 'line-through'
            )}
          >
            {deliverable.description || '-'}
          </div>
        )}
      </TableCell>

      {/* Price */}
      <TableCell className="text-right">
        {isEditing ? (
          <Input
            type="text"
            inputMode="decimal"
            value={editPrice}
            onChange={(e) => setEditPrice(e.target.value.replace(/[^0-9.]/g, ''))}
            className="h-8 w-24 text-right"
            placeholder="0.00"
          />
        ) : (
          <PriceDiff
            originalPrice={deliverable.original_price}
            currentPrice={deliverable.price}
            counterPrice={deliverable.counter_price}
            className={cn(isRemoved && 'line-through')}
          />
        )}
      </TableCell>

      {/* Status */}
      <TableCell>
        <DeliverableStatusBadge status={deliverable.change_status} />
      </TableCell>

      {/* Actions */}
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          {/* Comment button */}
          {onOpenComments && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onOpenComments(deliverable.id)}
            >
              <MessageSquare className="h-4 w-4" />
              {commentCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  {commentCount}
                </span>
              )}
            </Button>
          )}

          {/* Editing mode buttons */}
          {isEditing && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-green-600"
                onClick={handleSaveEdit}
                disabled={isPending}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600"
                onClick={handleCancelEdit}
                disabled={isPending}
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          )}

          {/* Counter offer dialog (for admin) */}
          <CounterOfferDialog
            open={isCounterDialogOpen}
            onOpenChange={setIsCounterDialogOpen}
            deliverable={deliverable}
            onSubmit={handleCounter}
            isSubmitting={isPending}
          />

          {/* Reviewer actions */}
          {isReviewer && hasChanges && !isEditing && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                onClick={handleApprove}
                disabled={isPending}
                title="Approve"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100"
                onClick={handleReject}
                disabled={isPending}
                title="Reject"
              >
                <X className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-100"
                onClick={() => setIsCounterDialogOpen(true)}
                disabled={isPending}
                title="Counter"
              >
                <ArrowRightLeft className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Dropdown menu for edit/remove/revert (only for DFY during editing) */}
          {isEditable && !isEditing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!isRemoved && (
                  <>
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleRemove}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </DropdownMenuItem>
                  </>
                )}
                {hasChanges && (
                  <>
                    {!isRemoved && <DropdownMenuSeparator />}
                    <DropdownMenuItem onClick={handleRevert}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Revert to Original
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </TableCell>
    </TableRow>

    {/* Inline action confirmation row (approve/reject with optional note) */}
    {pendingAction && (
      <TableRow className="hover:bg-transparent">
        <TableCell colSpan={5} className="pt-0 pb-4">
          <div className={cn(
            "p-4 rounded-lg border",
            pendingAction === 'approve'
              ? "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20"
              : "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20"
          )}>
            <div className="space-y-3">
              <p className="font-medium text-sm">
                {pendingAction === 'approve' ? 'Approve' : 'Reject'} this deliverable?
              </p>
              <Textarea
                placeholder="Add a note (optional)..."
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault()
                    handleConfirmAction()
                  }
                }}
                rows={2}
                className="text-sm"
                autoFocus
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleConfirmAction}
                  disabled={isPending}
                  className={pendingAction === 'approve'
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                  }
                >
                  <Check className="h-4 w-4 mr-1" />
                  Confirm {pendingAction === 'approve' ? 'Approval' : 'Rejection'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelAction}
                  disabled={isPending}
                >
                  Cancel
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Press Ctrl+Enter to submit
              </p>
            </div>
          </div>
        </TableCell>
      </TableRow>
    )}

    {/* Counter response row for DFY */}
    {needsDfyResponse && (
      <TableRow className="hover:bg-transparent">
        <TableCell colSpan={5} className="pt-0 pb-4">
          <CounterResponseCard
            deliverable={deliverable}
            onAccept={handleAcceptCounter}
            onReject={handleRejectCounter}
            onEdit={handleEditAgain}
            isSubmitting={isPending}
          />
        </TableCell>
      </TableRow>
    )}
    </>
  )
}
