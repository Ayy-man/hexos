'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ArrowRight } from 'lucide-react'
import type { ProposalDeliverable } from '@/lib/api/proposal-deliverables'

interface CounterOfferDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deliverable: ProposalDeliverable
  onSubmit: (
    counterName: string | undefined,
    counterDescription: string | undefined,
    counterPrice: number | undefined,
    counterNote: string | undefined
  ) => Promise<void>
  isSubmitting?: boolean
}

export function CounterOfferDialog({
  open,
  onOpenChange,
  deliverable,
  onSubmit,
  isSubmitting = false,
}: CounterOfferDialogProps) {
  // Initialize with current values (DFY's proposed changes)
  const [counterName, setCounterName] = useState(deliverable.name)
  const [counterDescription, setCounterDescription] = useState(
    deliverable.description || ''
  )
  const [counterPrice, setCounterPrice] = useState(
    deliverable.price?.toString() || ''
  )
  const [counterNote, setCounterNote] = useState('')

  // Check if any values changed from DFY's proposed values
  const hasNameChange = counterName !== deliverable.name
  const hasDescriptionChange = counterDescription !== (deliverable.description || '')
  const hasPriceChange =
    (counterPrice || '') !== (deliverable.price?.toString() || '')
  const hasAnyChange = hasNameChange || hasDescriptionChange || hasPriceChange

  const handleSubmit = async () => {
    await onSubmit(
      hasNameChange ? counterName : undefined,
      hasDescriptionChange ? counterDescription : undefined,
      hasPriceChange ? (counterPrice ? parseFloat(counterPrice) : undefined) : undefined,
      counterNote || undefined
    )
    // Reset form on successful submit
    setCounterNote('')
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      // Reset to current values when closing
      setCounterName(deliverable.name)
      setCounterDescription(deliverable.description || '')
      setCounterPrice(deliverable.price?.toString() || '')
      setCounterNote('')
    }
    onOpenChange(isOpen)
  }

  // Display original values for reference
  const originalName = deliverable.original_name || deliverable.name
  const originalDescription =
    deliverable.original_description || deliverable.description
  const originalPrice = deliverable.original_price ?? deliverable.price

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Counter Offer</DialogTitle>
          <DialogDescription>
            Propose changes to this deliverable. The DFY partner will need to
            accept, reject, or revise your counter.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Show original → DFY edit if there was a change */}
          {deliverable.original_name &&
            deliverable.original_name !== deliverable.name && (
              <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                <span className="font-medium">DFY changed name:</span>
                <span className="ml-2 line-through">{originalName}</span>
                <ArrowRight className="inline h-3 w-3 mx-1" />
                <span className="text-foreground">{deliverable.name}</span>
              </div>
            )}

          {/* Name field */}
          <div className="space-y-2">
            <Label htmlFor="counter-name">Name</Label>
            <Input
              id="counter-name"
              value={counterName}
              onChange={(e) => setCounterName(e.target.value)}
              placeholder="Deliverable name"
            />
            {hasNameChange && (
              <p className="text-xs text-amber-600">
                Changed from: &ldquo;{deliverable.name}&rdquo;
              </p>
            )}
          </div>

          {/* Description field */}
          <div className="space-y-2">
            <Label htmlFor="counter-description">Description</Label>
            <Textarea
              id="counter-description"
              value={counterDescription}
              onChange={(e) => setCounterDescription(e.target.value)}
              placeholder="Description (optional)"
              rows={3}
            />
            {hasDescriptionChange && (
              <p className="text-xs text-amber-600">Description modified</p>
            )}
          </div>

          {/* Price field */}
          <div className="space-y-2">
            <Label htmlFor="counter-price">Price</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="counter-price"
                type="number"
                value={counterPrice}
                onChange={(e) => setCounterPrice(e.target.value)}
                placeholder="0.00"
                className="pl-7"
              />
            </div>
            {hasPriceChange && deliverable.price !== null && (
              <p className="text-xs text-amber-600">
                Changed from: ${deliverable.price?.toLocaleString()}
              </p>
            )}
          </div>

          {/* Note field */}
          <div className="space-y-2">
            <Label htmlFor="counter-note">Note (explain your counter)</Label>
            <Textarea
              id="counter-note"
              value={counterNote}
              onChange={(e) => setCounterNote(e.target.value)}
              placeholder="Explain why you're proposing these changes..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || (!hasAnyChange && !counterNote)}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Counter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
