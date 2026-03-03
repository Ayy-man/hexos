'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, DollarSign } from 'lucide-react'
import type { PricingTier } from '@/lib/api/blueprints'

interface BlueprintCardProps {
  id: string
  name: string
  description: string | null
  icon: string | null
  image_url?: string | null
  base_price: number | null
  estimated_hours: number | null
  tags: string[]
  status: string
  pricing_tiers: PricingTier[]
}

export function BlueprintCard({
  id,
  name,
  description,
  icon,
  image_url,
  base_price,
  estimated_hours,
  tags,
  status,
  pricing_tiers,
}: BlueprintCardProps) {
  // Calculate starting price from tiers or base_price
  const startingPrice = pricing_tiers?.length > 0
    ? Math.min(...pricing_tiers.map(t => t.setup_price))
    : base_price

  return (
    <Card className="group hover:shadow-md transition-shadow overflow-hidden">
      {image_url && (
        <Link href={`/blueprints/${id}`}>
          <div className="relative aspect-video w-full">
            <Image
              src={image_url}
              alt={name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        </Link>
      )}
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
      </CardContent>
    </Card>
  )
}
