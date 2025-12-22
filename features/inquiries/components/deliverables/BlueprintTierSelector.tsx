'use client'

import { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BlueprintSummary, PricingTier } from '@/lib/api/blueprints'

interface BlueprintTierSelectorProps {
  blueprints: BlueprintSummary[]
  onSelect: (
    blueprintId: string,
    tierName: string,
    tierPrice: number,
    features: string[]
  ) => void
}

export function BlueprintTierSelector({
  blueprints,
  onSelect,
}: BlueprintTierSelectorProps) {
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<string>('')
  const [selectedTierName, setSelectedTierName] = useState<string>('')

  const selectedBlueprint = blueprints.find((b) => b.id === selectedBlueprintId)
  const tiers = selectedBlueprint?.pricing_tiers || []

  const handleBlueprintChange = (blueprintId: string) => {
    setSelectedBlueprintId(blueprintId)
    setSelectedTierName('')
  }

  const handleTierSelect = (tierName: string) => {
    setSelectedTierName(tierName)

    const tier = tiers.find((t) => t.name === tierName)
    if (tier && selectedBlueprintId) {
      onSelect(
        selectedBlueprintId,
        tier.name,
        tier.setup_price,
        tier.features
      )
    }
  }

  return (
    <div className="space-y-4">
      {/* Blueprint selector */}
      <div className="space-y-2">
        <Label>Select Blueprint</Label>
        <Select
          value={selectedBlueprintId}
          onValueChange={handleBlueprintChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose a blueprint..." />
          </SelectTrigger>
          <SelectContent>
            {blueprints.map((blueprint) => (
              <SelectItem key={blueprint.id} value={blueprint.id}>
                <div className="flex items-center gap-2">
                  {blueprint.icon && <span>{blueprint.icon}</span>}
                  <span>{blueprint.name}</span>
                  {blueprint.pricing_tiers.length > 0 && (
                    <span className="text-muted-foreground text-xs">
                      ({blueprint.pricing_tiers.length} tiers)
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tier selector */}
      {selectedBlueprint && tiers.length > 0 && (
        <div className="space-y-2">
          <Label>Select Tier</Label>
          <RadioGroup
            value={selectedTierName}
            onValueChange={handleTierSelect}
            className="space-y-3"
          >
            {tiers.map((tier, index) => (
              <TierCard
                key={tier.name}
                tier={tier}
                isSelected={selectedTierName === tier.name}
                isRecommended={index === tiers.length - 1}
              />
            ))}
          </RadioGroup>
        </div>
      )}

      {/* No tiers fallback */}
      {selectedBlueprint && tiers.length === 0 && (
        <div className="text-sm text-muted-foreground p-4 bg-muted rounded-lg">
          This blueprint doesn&apos;t have pricing tiers configured.
          Use the custom option to add deliverables manually.
        </div>
      )}
    </div>
  )
}

interface TierCardProps {
  tier: PricingTier
  isSelected: boolean
  isRecommended: boolean
}

function TierCard({ tier, isSelected, isRecommended }: TierCardProps) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-colors',
        isSelected && 'border-primary ring-1 ring-primary'
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <RadioGroupItem
            value={tier.name}
            id={tier.name}
            className="mt-1"
          />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <Label
                htmlFor={tier.name}
                className="text-base font-medium cursor-pointer"
              >
                {tier.name}
                {isRecommended && (
                  <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                    Recommended
                  </span>
                )}
              </Label>
              <div className="text-right">
                <div className="font-semibold">
                  ${tier.setup_price.toLocaleString()}
                </div>
                {tier.monthly_price > 0 && (
                  <div className="text-xs text-muted-foreground">
                    +${tier.monthly_price}/mo
                  </div>
                )}
              </div>
            </div>

            {/* Features list */}
            {tier.features.length > 0 && (
              <ul className="text-sm text-muted-foreground space-y-1">
                {tier.features.slice(0, 5).map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
                {tier.features.length > 5 && (
                  <li className="text-xs">
                    +{tier.features.length - 5} more features
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
