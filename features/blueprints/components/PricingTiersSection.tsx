'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { PricingTiersDisplay } from './PricingTiersDisplay'
import { PricingTiersEditor } from './PricingTiersEditor'
import { updateBlueprintAction } from '../actions/blueprintActions'
import type { PricingTier } from '@/lib/api/blueprints'

interface PricingTiersSectionProps {
  blueprintId: string
  initialTiers: PricingTier[]
  isEditMode: boolean
}

export function PricingTiersSection({
  blueprintId,
  initialTiers,
  isEditMode,
}: PricingTiersSectionProps) {
  const [tiers, setTiers] = useState<PricingTier[]>(initialTiers)
  const [isPending, startTransition] = useTransition()
  const [hasChanges, setHasChanges] = useState(false)

  const handleTiersChange = (newTiers: PricingTier[]) => {
    setTiers(newTiers)
    setHasChanges(true)
  }

  const handleSave = () => {
    startTransition(async () => {
      try {
        await updateBlueprintAction(blueprintId, { pricing_tiers: tiers })
        setHasChanges(false)
        toast.success('Pricing tiers saved')
      } catch (error) {
        console.error('Failed to save tiers:', error)
        toast.error('Failed to save pricing tiers')
      }
    })
  }

  if (!isEditMode) {
    // View mode - show display component only if tiers exist
    if (!tiers || tiers.length === 0) {
      return null
    }
    return <PricingTiersDisplay tiers={tiers} />
  }

  // Edit mode
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Pricing Tiers</CardTitle>
            <CardDescription>
              Configure pricing options for this blueprint
            </CardDescription>
          </div>
          {hasChanges && (
            <Button onClick={handleSave} disabled={isPending} size="sm">
              {isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Tiers
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <PricingTiersEditor value={tiers} onChange={handleTiersChange} />
      </CardContent>
    </Card>
  )
}
