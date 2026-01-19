'use client'

import { Check, DollarSign, Clock, Package } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { BlueprintSummary, PricingTier } from '@/lib/api/blueprints'

interface BlueprintDetailsSidebarProps {
  blueprint: BlueprintSummary | null
  selectedTier: string | null
  onSelectTier: (tierName: string, tier: PricingTier) => void
  className?: string
}

export function BlueprintDetailsSidebar({
  blueprint,
  selectedTier,
  onSelectTier,
  className,
}: BlueprintDetailsSidebarProps) {
  if (!blueprint) {
    return (
      <Card className={cn('border-dashed', className)}>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Package className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">
            Select a blueprint to see tier details and pricing
          </p>
        </CardContent>
      </Card>
    )
  }

  const tiers = blueprint.pricing_tiers || []
  const hasTiers = tiers.length > 0

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          {blueprint.icon && <span className="text-lg">{blueprint.icon}</span>}
          <CardTitle className="text-base">{blueprint.name}</CardTitle>
        </div>
        {blueprint.description && (
          <p className="text-sm text-muted-foreground mt-1">
            {blueprint.description}
          </p>
        )}
        <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
          {blueprint.base_price && (
            <div className="flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5" />
              <span>From ${blueprint.base_price.toLocaleString()}</span>
            </div>
          )}
          {blueprint.estimated_hours && (
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{blueprint.estimated_hours}h estimated</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {hasTiers ? (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Select a Tier</Label>
            <RadioGroup
              value={selectedTier || ''}
              onValueChange={(tierName) => {
                const tier = tiers.find((t) => t.name === tierName)
                if (tier) onSelectTier(tierName, tier)
              }}
              className="space-y-2"
            >
              {tiers.map((tier, index) => {
                const isRecommended = index === tiers.length - 1
                const isSelected = selectedTier === tier.name

                return (
                  <div
                    key={tier.name}
                    className={cn(
                      'relative rounded-lg border p-3 cursor-pointer transition-colors',
                      isSelected && 'border-primary bg-primary/5 ring-1 ring-primary'
                    )}
                    onClick={() => onSelectTier(tier.name, tier)}
                  >
                    <div className="flex items-start gap-3">
                      <RadioGroupItem
                        value={tier.name}
                        id={`tier-${tier.name}`}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <Label
                            htmlFor={`tier-${tier.name}`}
                            className="font-medium cursor-pointer"
                          >
                            {tier.name}
                            {isRecommended && (
                              <Badge variant="default" className="ml-2 text-[10px]">
                                Recommended
                              </Badge>
                            )}
                          </Label>
                          <div className="text-right flex-shrink-0">
                            <div className="font-semibold text-sm">
                              ${tier.setup_price.toLocaleString()}
                            </div>
                            {tier.monthly_price > 0 && (
                              <div className="text-[10px] text-muted-foreground">
                                +${tier.monthly_price}/mo
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Features list - show first 4 */}
                        {tier.features.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {tier.features.slice(0, 4).map((feature, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-1.5 text-xs text-muted-foreground"
                              >
                                <Check className="h-3 w-3 text-green-500 flex-shrink-0 mt-0.5" />
                                <span className="line-clamp-1">{feature}</span>
                              </li>
                            ))}
                            {tier.features.length > 4 && (
                              <li className="text-[10px] text-muted-foreground pl-4">
                                +{tier.features.length - 4} more features
                              </li>
                            )}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </RadioGroup>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground bg-muted rounded-lg p-4 text-center">
            This blueprint doesn&apos;t have pricing tiers configured.
            The final price will be determined during proposal creation.
          </div>
        )}

        {/* Tags */}
        {blueprint.tags.length > 0 && (
          <div className="pt-3 border-t">
            <div className="flex flex-wrap gap-1">
              {blueprint.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px]">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
