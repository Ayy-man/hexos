'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2, Clock, DollarSign, MessageSquare } from 'lucide-react'
import { submitBidAction } from '../actions/bidActions'

interface BidFormProps {
  opportunityId: string
  opportunityTitle: string
  estimatedWeeks?: number
  onSuccess?: () => void
}

export function BidForm({
  opportunityId,
  opportunityTitle,
  estimatedWeeks,
  onSuccess,
}: BidFormProps) {
  const [proposedWeeks, setProposedWeeks] = useState(estimatedWeeks?.toString() || '')
  const [proposedPrice, setProposedPrice] = useState('')
  const [coverMessage, setCoverMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const weeks = parseFloat(proposedWeeks)
    if (!weeks || weeks <= 0) {
      toast.error('Please enter a valid number of weeks')
      return
    }

    const price = proposedPrice ? parseFloat(proposedPrice.replace(/[^0-9.]/g, '')) : undefined
    if (price !== undefined && price < 0) {
      toast.error('Price cannot be negative')
      return
    }

    startTransition(async () => {
      try {
        await submitBidAction({
          opportunityId,
          proposedWeeks: weeks,
          proposedPrice: price,
          coverMessage: coverMessage.trim() || undefined,
        })

        toast.success('Bid submitted successfully')
        onSuccess?.()

        // Reset form
        setProposedWeeks(estimatedWeeks?.toString() || '')
        setProposedPrice('')
        setCoverMessage('')
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Failed to submit bid'
        )
      }
    })
  }

  // Sanitize currency input - allow only numbers and decimal
  const handlePriceChange = (value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, '')
    // Ensure only one decimal point
    const parts = sanitized.split('.')
    if (parts.length > 2) {
      setProposedPrice(parts[0] + '.' + parts.slice(1).join(''))
    } else {
      setProposedPrice(sanitized)
    }
  }

  const weeksValue = parseFloat(proposedWeeks) || 0
  const isValidWeeks = weeksValue > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Submit Your Bid</CardTitle>
        <CardDescription>
          Bid on: {opportunityTitle}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Proposed Weeks */}
          <div className="space-y-2">
            <Label htmlFor="proposedWeeks" className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Proposed Timeline (weeks) *
            </Label>
            <Input
              id="proposedWeeks"
              type="number"
              step="0.5"
              min="0.5"
              value={proposedWeeks}
              onChange={(e) => setProposedWeeks(e.target.value)}
              placeholder={estimatedWeeks ? `Estimated: ${estimatedWeeks} weeks` : 'Enter weeks'}
              required
            />
            {estimatedWeeks && weeksValue !== estimatedWeeks && weeksValue > 0 && (
              <p className="text-xs text-muted-foreground">
                {weeksValue < estimatedWeeks
                  ? `${(estimatedWeeks - weeksValue).toFixed(1)} weeks faster than estimate`
                  : `${(weeksValue - estimatedWeeks).toFixed(1)} weeks longer than estimate`}
              </p>
            )}
          </div>

          {/* Proposed Price */}
          <div className="space-y-2">
            <Label htmlFor="proposedPrice" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Proposed Price (optional)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="proposedPrice"
                type="text"
                inputMode="decimal"
                value={proposedPrice}
                onChange={(e) => handlePriceChange(e.target.value)}
                placeholder="0.00"
                className="pl-7"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Leave blank to let the client propose a budget
            </p>
          </div>

          {/* Cover Message */}
          <div className="space-y-2">
            <Label htmlFor="coverMessage" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              Cover Message (optional)
            </Label>
            <Textarea
              id="coverMessage"
              value={coverMessage}
              onChange={(e) => setCoverMessage(e.target.value)}
              placeholder="Why are you a good fit for this opportunity? Share relevant experience..."
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {coverMessage.length}/500 characters
            </p>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isPending || !isValidWeeks}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Bid'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
