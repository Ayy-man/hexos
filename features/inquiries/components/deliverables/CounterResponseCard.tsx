'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowRight, Check, X, Pencil, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProposalDeliverable } from '@/lib/api/proposal-deliverables'

interface CounterResponseCardProps {
  deliverable: ProposalDeliverable
  onAccept: () => void | Promise<void>
  onReject: (reason?: string) => void | Promise<void>
  onEdit: () => void
  isSubmitting?: boolean
}

export function CounterResponseCard({
  deliverable,
  onAccept,
  onReject,
  onEdit,
  isSubmitting = false,
}: CounterResponseCardProps) {
  const [showRejectReason, setShowRejectReason] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  // Check what's being countered
  const hasCounterName = deliverable.counter_name !== null
  const hasCounterDescription = deliverable.counter_description !== null
  const hasCounterPrice = deliverable.counter_price !== null

  const handleReject = async () => {
    await onReject(rejectReason || undefined)
    setShowRejectReason(false)
    setRejectReason('')
  }

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />

          <div className="flex-1 space-y-3">
            <div>
              <p className="font-medium text-sm">Admin Counter Offer</p>
              {deliverable.counter_note && (
                <p className="text-sm text-muted-foreground mt-1">
                  &ldquo;{deliverable.counter_note}&rdquo;
                </p>
              )}
            </div>

            {/* Show what's being countered */}
            <div className="space-y-2 text-sm">
              {hasCounterName && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-20">Name:</span>
                  <span className="line-through text-muted-foreground">
                    {deliverable.name}
                  </span>
                  <ArrowRight className="h-3 w-3 text-amber-600" />
                  <span className="font-medium text-amber-700 dark:text-amber-400">
                    {deliverable.counter_name}
                  </span>
                </div>
              )}

              {hasCounterDescription && (
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground w-20">Desc:</span>
                  <div className="flex-1">
                    <span className="line-through text-muted-foreground text-xs">
                      {deliverable.description || '(none)'}
                    </span>
                    <ArrowRight className="inline h-3 w-3 mx-1 text-amber-600" />
                    <span className="font-medium text-amber-700 dark:text-amber-400 text-xs">
                      {deliverable.counter_description}
                    </span>
                  </div>
                </div>
              )}

              {hasCounterPrice && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-20">Price:</span>
                  <span className="line-through text-muted-foreground">
                    ${deliverable.price?.toLocaleString() || '0'}
                  </span>
                  <ArrowRight className="h-3 w-3 text-amber-600" />
                  <span className="font-medium text-amber-700 dark:text-amber-400">
                    ${deliverable.counter_price?.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Reject reason input */}
            {showRejectReason && (
              <div className="space-y-2">
                <Textarea
                  placeholder="Why are you rejecting this counter? (optional)"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={2}
                  className="text-sm"
                />
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {showRejectReason ? (
                <>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleReject}
                    disabled={isSubmitting}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Confirm Reject
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowRejectReason(false)}
                    disabled={isSubmitting}
                  >
                    Back
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    onClick={onAccept}
                    disabled={isSubmitting}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Accept Counter
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowRejectReason(true)}
                    disabled={isSubmitting}
                    className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onEdit}
                    disabled={isSubmitting}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit Again
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
