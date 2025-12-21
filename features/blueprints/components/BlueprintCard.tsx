'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, DollarSign, ArrowRight } from 'lucide-react'
import type { PricingTier } from '@/lib/api/blueprints'

interface BlueprintCardProps {
  id: string
  name: string
  description: string | null
  icon: string | null
  base_price: number | null
  estimated_hours: number | null
  tags: string[]
  status: string
  pricing_tiers: PricingTier[]
  showActions?: boolean
  isDFY?: boolean
}

export function BlueprintCard({
  id,
  name,
  description,
  icon,
  base_price,
  estimated_hours,
  tags,
  status,
  pricing_tiers,
  showActions = false,
  isDFY = false,
}: BlueprintCardProps) {
  // Calculate starting price from tiers or base_price
  const startingPrice = pricing_tiers?.length > 0
    ? Math.min(...pricing_tiers.map(t => t.setup_price))
    : base_price

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {icon && <span className="text-2xl">{icon}</span>}
            <div>
              <CardTitle className="text-lg group-hover:text-cyan-600 transition-colors">
                <Link href={`/blueprints/${id}`}>{name}</Link>
              </CardTitle>
              {status === 'draft' && (
                <Badge variant="secondary" className="mt-1">Draft</Badge>
              )}
            </div>
          </div>
        </div>
        {description && (
          <CardDescription className="line-clamp-2">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Tags */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex gap-4">
            {startingPrice !== null && startingPrice !== undefined && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <DollarSign className="h-3.5 w-3.5" />
                <span>From ${startingPrice.toLocaleString()}</span>
              </div>
            )}
            {estimated_hours && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>~{estimated_hours}h</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {showActions && isDFY && (
          <div className="flex gap-2 pt-2">
            <Button size="sm" className="flex-1" asChild>
              <Link href={`/inquiries/new?blueprint=${id}&type=closed`}>
                Closed Deal
              </Link>
            </Button>
            <Button size="sm" variant="outline" className="flex-1" asChild>
              <Link href={`/inquiries/new?blueprint=${id}&type=proposal`}>
                Request Proposal
              </Link>
            </Button>
          </div>
        )}

        {!showActions && (
          <Button variant="ghost" size="sm" className="w-full group-hover:bg-muted" asChild>
            <Link href={`/blueprints/${id}`}>
              View Details
              <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
