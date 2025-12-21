'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { DollarSign, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'
import { updatePricingAction } from '../actions/inquiryActions'

interface QuickPricingEditorProps {
  inquiryId: string
  initialValue: number | null
  initialNotes: string | null
  readOnly?: boolean
}

export function QuickPricingEditor({
  inquiryId,
  initialValue,
  initialNotes,
  readOnly = false,
}: QuickPricingEditorProps) {
  const [value, setValue] = useState(initialValue?.toString() || '')
  const [notes, setNotes] = useState(initialNotes || '')
  const [isPending, startTransition] = useTransition()
  const [hasChanges, setHasChanges] = useState(false)

  const handleValueChange = (newValue: string) => {
    // Only allow numbers and decimal point
    const sanitized = newValue.replace(/[^0-9.]/g, '')
    setValue(sanitized)
    setHasChanges(true)
  }

  const handleNotesChange = (newNotes: string) => {
    setNotes(newNotes)
    setHasChanges(true)
  }

  const handleSave = () => {
    startTransition(async () => {
      try {
        const numericValue = value ? parseFloat(value) : null
        await updatePricingAction(inquiryId, numericValue, notes || null)
        setHasChanges(false)
        toast.success('Pricing updated')
      } catch (error) {
        console.error('Failed to update pricing:', error)
        toast.error('Failed to update pricing')
      }
    })
  }

  const formatDisplayValue = () => {
    if (!value) return ''
    const num = parseFloat(value)
    if (isNaN(num)) return value
    return new Intl.NumberFormat('en-US').format(num)
  }

  if (readOnly) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Pricing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {initialValue ? (
            <div>
              <p className="text-sm text-muted-foreground">Estimated Value</p>
              <p className="text-2xl font-bold text-green-600">
                ${new Intl.NumberFormat('en-US').format(initialValue)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No pricing set</p>
          )}
          {initialNotes && (
            <div>
              <p className="text-sm text-muted-foreground">Notes</p>
              <p className="text-sm whitespace-pre-wrap">{initialNotes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Pricing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="estimated-value">Estimated Value</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              $
            </span>
            <Input
              id="estimated-value"
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={formatDisplayValue()}
              onChange={(e) => handleValueChange(e.target.value)}
              className="pl-7"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="pricing-notes">Notes (optional)</Label>
          <Textarea
            id="pricing-notes"
            placeholder="Add pricing breakdown, inclusions, terms..."
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            rows={3}
          />
        </div>

        <Button
          onClick={handleSave}
          disabled={isPending || !hasChanges}
          className="w-full"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : hasChanges ? (
            'Save Changes'
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Saved
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
