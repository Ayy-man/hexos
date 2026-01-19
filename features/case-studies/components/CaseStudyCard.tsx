'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, Briefcase, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CaseStudyCardProps {
  id: string
  name: string
  description: string | null
  icon: string | null
  image_url?: string | null
  client_name: string | null
  industry: string | null
  tags: string[]
  status: string
  blueprint?: { id: string; name: string; icon: string | null } | null
  showBlueprintLink?: boolean
}

export function CaseStudyCard({
  id,
  name,
  description,
  icon,
  image_url,
  client_name,
  industry,
  tags,
  status,
  blueprint,
  showBlueprintLink = true,
}: CaseStudyCardProps) {
  return (
    <Card className="group hover:shadow-md transition-shadow overflow-hidden">
      {image_url && (
        <Link href={`/case-studies/${id}`}>
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
                <Link href={`/case-studies/${id}`}>{name}</Link>
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
        {/* Client & Industry */}
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          {client_name && (
            <div className="flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" />
              <span>{client_name}</span>
            </div>
          )}
          {industry && (
            <div className="flex items-center gap-1">
              <Briefcase className="h-3.5 w-3.5" />
              <span>{industry}</span>
            </div>
          )}
        </div>

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

        {/* Related Blueprint Link */}
        {showBlueprintLink && blueprint && (
          <div className="pt-2 border-t">
            <Button variant="ghost" size="sm" className="h-auto p-0 text-sm" asChild>
              <Link href={`/blueprints/${blueprint.id}`} className="flex items-center gap-2">
                {blueprint.icon && <span>{blueprint.icon}</span>}
                <span className="text-muted-foreground">Related: {blueprint.name}</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
