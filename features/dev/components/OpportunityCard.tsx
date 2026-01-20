'use client'

import { formatDistanceToNow, isPast } from 'date-fns'
import { Star, EyeOff, Clock, AlertCircle, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatDuration, type OpportunityWithPrefs, type ProjectComplexity } from '@/lib/api/project-invitations'
import { CommitmentStatusBadge } from '@/features/opportunities/components/CommitmentStatusBadge'

interface OpportunityCardProps {
  opportunity: OpportunityWithPrefs
  onClick: () => void
  onToggleStar: () => void
  onToggleHide: () => void
  isStarring?: boolean
  isHiding?: boolean
  hasExistingBid?: boolean
}

const complexityColors: Record<ProjectComplexity, string> = {
  low: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  high: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
}

export function OpportunityCard({
  opportunity,
  onClick,
  onToggleStar,
  onToggleHide,
  isStarring,
  isHiding,
  hasExistingBid,
}: OpportunityCardProps) {
  const isExpired = opportunity.expires_at && isPast(new Date(opportunity.expires_at))
  const expiresIn = opportunity.expires_at
    ? formatDistanceToNow(new Date(opportunity.expires_at), { addSuffix: true })
    : null

  return (
    <Card
      className={cn(
        'group cursor-pointer transition-all hover:shadow-md hover:border-primary/50',
        opportunity.is_hidden && 'opacity-50',
        isExpired && 'opacity-60 grayscale'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Header with title and actions */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm line-clamp-1">{opportunity.title}</h3>
            {opportunity.project && (
              <p className="text-xs text-muted-foreground truncate">
                {opportunity.project.client_name}
              </p>
            )}
          </div>

          {/* Star/Hide buttons */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation()
                onToggleStar()
              }}
              disabled={isStarring}
            >
              <Star
                className={cn(
                  'h-4 w-4',
                  opportunity.is_starred
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-muted-foreground'
                )}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation()
                onToggleHide()
              }}
              disabled={isHiding}
            >
              <EyeOff
                className={cn(
                  'h-4 w-4',
                  opportunity.is_hidden ? 'text-primary' : 'text-muted-foreground'
                )}
              />
            </Button>
          </div>
        </div>

        {/* Duration - prominent */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold">
              {formatDuration(opportunity).split(' ')[0]}
            </span>
            <span className="text-sm text-muted-foreground">
              {formatDuration(opportunity).split(' ').slice(1).join(' ')}
            </span>
          </div>
          {/* Commitment status */}
          {opportunity.commitment_status && (
            <CommitmentStatusBadge status={opportunity.commitment_status} size="sm" />
          )}
        </div>

        {/* Bid info row */}
        <div className="flex items-center gap-3 mb-3 text-xs text-muted-foreground">
          {opportunity.bids_count !== undefined && opportunity.bids_count > 0 && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {opportunity.bids_count} bid{opportunity.bids_count !== 1 ? 's' : ''}
            </span>
          )}
          {hasExistingBid && (
            <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
              Bid submitted
            </Badge>
          )}
        </div>

        {/* Tags row */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <Badge className={cn('text-xs', complexityColors[opportunity.complexity])}>
            {opportunity.complexity}
          </Badge>
          {opportunity.tech_stack?.slice(0, 2).map((tech) => (
            <Badge key={tech} variant="secondary" className="text-xs">
              {tech}
            </Badge>
          ))}
          {(opportunity.tech_stack?.length || 0) > 2 && (
            <Badge variant="secondary" className="text-xs">
              +{opportunity.tech_stack!.length - 2}
            </Badge>
          )}
        </div>

        {/* Expiry indicator */}
        {opportunity.expires_at && (
          <div
            className={cn(
              'flex items-center gap-1.5 text-xs',
              isExpired ? 'text-red-500' : 'text-muted-foreground'
            )}
          >
            {isExpired ? (
              <>
                <AlertCircle className="h-3 w-3" />
                <span>Expired</span>
              </>
            ) : (
              <>
                <Clock className="h-3 w-3" />
                <span>Expires {expiresIn}</span>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
