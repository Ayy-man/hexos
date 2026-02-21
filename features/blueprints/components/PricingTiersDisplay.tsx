'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check } from 'lucide-react'
import type { PricingTier } from '@/lib/api/blueprints'

interface PricingTiersDisplayProps {
  tiers: PricingTier[]
}

export function PricingTiersDisplay({ tiers }: PricingTiersDisplayProps) {
  if (!tiers || tiers.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Pricing Tiers</h3>
      <div className="grid gap-4 md:grid-cols-2">
        {tiers.map((tier, index) => (
          <Card key={index} className={index === tiers.length - 1 ? 'border-cyan-500' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {tier.name}
                {index === tiers.length - 1 && (
                  <Badge variant="default" className="bg-cyan-600 text-white">Recommended</Badge>
                )}
              </CardTitle>
              <CardDescription>
                <span className="text-2xl font-bold text-foreground">
                  ${tier.setup_price.toLocaleString()}
                </span>
                <span className="text-muted-foreground"> setup</span>
                {tier.monthly_price > 0 && (
                  <>
                    <span className="text-muted-foreground"> + </span>
                    <span className="font-semibold text-foreground">
                      ${tier.monthly_price}/mo
                    </span>
                  </>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {tier.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 mt-0.5 text-cyan-600 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
