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
import type { UserRole } from '@/lib/auth/types'

interface QuickPricingEditorProps {
  inquiryId: string
  priceDfy: number | null
  priceHexona: number | null
  priceDev: number | null
  pricingNotes: string | null
  userRole: UserRole
  readOnly?: boolean
}

export function QuickPricingEditor({
  inquiryId,
  priceDfy: initialPriceDfy,
  priceHexona: initialPriceHexona,
  priceDev: initialPriceDev,
  pricingNotes: initialNotes,
  userRole,
  readOnly = false,
}: QuickPricingEditorProps) {
  const isAdmin = userRole === 'admin'
  const isInternal = userRole === 'internal'
  const canEdit = isAdmin
  const canViewInternal = isAdmin || isInternal

  const [priceDfyValue, setPriceDfyValue] = useState(initialPriceDfy?.toString() || '')
  const [priceHexonaValue, setPriceHexonaValue] = useState(initialPriceHexona?.toString() || '')
  const [priceDevValue, setPriceDevValue] = useState(initialPriceDev?.toString() || '')
  const [notes, setNotes] = useState(initialNotes || '')
  const [isPending, startTransition] = useTransition()
  const [hasChanges, setHasChanges] = useState(false)

  const handleValueChange = (setter: (v: string) => void) => (newValue: string) => {
    // Only allow numbers and decimal point
    const sanitized = newValue.replace(/[^0-9.]/g, '')
    setter(sanitized)
    setHasChanges(true)
  }

  const handleNotesChange = (newNotes: string) => {
    setNotes(newNotes)
    setHasChanges(true)
  }

  const handleSave = () => {
    startTransition(async () => {
      try {
        const priceDfy = priceDfyValue ? parseFloat(priceDfyValue) : null
        const priceHexona = priceHexonaValue ? parseFloat(priceHexonaValue) : null
        const priceDev = priceDevValue ? parseFloat(priceDevValue) : null
        await updatePricingAction(inquiryId, priceDfy, priceHexona, priceDev, notes || null)
        setHasChanges(false)
        toast.success('Pricing updated')
      } catch (error) {
        console.error('Failed to update pricing:', error)
        toast.error('Failed to update pricing')
      }
    })
  }

  const formatDisplayValue = (value: string) => {
    if (!value) return ''
    const num = parseFloat(value)
    if (isNaN(num)) return value
    return new Intl.NumberFormat('en-US').format(num)
  }

  const formatCurrency = (value: number | null) => {
    if (value == null) return '—'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value)
  }

  if (readOnly || !canEdit) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Pricing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Client Price (DFY)</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(initialPriceDfy)}
            </p>
          </div>
          {canViewInternal && (
            <>
              <div>
                <p className="text-sm text-muted-foreground">Our Price (Hexona)</p>
                <p className="text-lg font-semibold">{formatCurrency(initialPriceHexona)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dev Cost</p>
                <p className="text-lg font-semibold">{formatCurrency(initialPriceDev)}</p>
              </div>
            </>
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
          <Label htmlFor="price-dfy">Client Price (DFY)</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              $
            </span>
            <Input
              id="price-dfy"
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={formatDisplayValue(priceDfyValue)}
              onChange={(e) => handleValueChange(setPriceDfyValue)(e.target.value)}
              className="pl-7"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="price-hexona">Our Price (Hexona)</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              $
            </span>
            <Input
              id="price-hexona"
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={formatDisplayValue(priceHexonaValue)}
              onChange={(e) => handleValueChange(setPriceHexonaValue)(e.target.value)}
              className="pl-7"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="price-dev">Dev Cost</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              $
            </span>
            <Input
              id="price-dev"
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={formatDisplayValue(priceDevValue)}
              onChange={(e) => handleValueChange(setPriceDevValue)(e.target.value)}
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
