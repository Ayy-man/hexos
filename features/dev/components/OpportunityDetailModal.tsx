'use client'

import { useState } from 'react'
import { format, formatDistanceToNow, isPast } from 'date-fns'
import {
  Star,
  EyeOff,
  Clock,
  Calendar,
  AlertCircle,
  Briefcase,
  BarChart3,
  ArrowRight,
  X,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { OpportunityWithPrefs, ProjectComplexity } from '@/lib/api/project-invitations'

interface OpportunityDetailModalProps {
  opportunity: OpportunityWithPrefs | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onApply: (coverMessage: string) => void
  onToggleStar: () => void
  onToggleHide: () => void
  isApplying?: boolean
  isStarring?: boolean
  isHiding?: boolean
}

const complexityConfig: Record<ProjectComplexity, { label: string; color: string }> = {
  low: { label: 'Low', color: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' },
  medium: { label: 'Medium', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' },
  high: { label: 'High', color: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' },
}

export function OpportunityDetailModal({
  opportunity,
  open,
  onOpenChange,
  onApply,
  onToggleStar,
  onToggleHide,
  isApplying,
  isStarring,
  isHiding,
}: OpportunityDetailModalProps) {
  const [coverMessage, setCoverMessage] = useState('')
  const [showApplyForm, setShowApplyForm] = useState(false)

  if (!opportunity) return null

  const isExpired = !!(opportunity.expires_at && isPast(new Date(opportunity.expires_at)))
  const expiresIn = opportunity.expires_at
    ? formatDistanceToNow(new Date(opportunity.expires_at), { addSuffix: true })
    : null

  const handleApply = () => {
    onApply(coverMessage)
    setCoverMessage('')
    setShowApplyForm(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <span>Opportunities</span>
          <span>/</span>
          <span className="text-foreground truncate">{opportunity.title}</span>
        </div>

        {/* Title */}
        <DialogHeader className="pb-0">
          <DialogTitle className="text-xl font-semibold pr-8">
            {opportunity.title}
          </DialogTitle>
        </DialogHeader>

        {/* Meta row: Status, Client, Dates */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {/* Status */}
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
            Open
          </Badge>

          {/* Client */}
          {opportunity.project && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Briefcase className="h-4 w-4" />
              <span>{opportunity.project.client_name}</span>
            </div>
          )}

          {/* Date range */}
          {opportunity.deadline && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {format(new Date(), 'MMM d, yyyy')}
                <ArrowRight className="h-3 w-3 inline mx-1" />
                {format(new Date(opportunity.deadline), 'MMM d, yyyy')}
              </span>
            </div>
          )}
        </div>

        {/* Tags */}
        {opportunity.tech_stack && opportunity.tech_stack.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {opportunity.tech_stack.map((tech) => (
              <Badge key={tech} variant="secondary">
                {tech}
              </Badge>
            ))}
          </div>
        )}

        <Separator className="my-4" />

        {/* Description */}
        {opportunity.description && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              Description
            </Label>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {opportunity.description}
            </p>
          </div>
        )}

        {/* Details grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
          {/* Estimated hours */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Estimated
            </Label>
            <p className="text-lg font-semibold">
              {opportunity.estimated_hours || '—'} hours
            </p>
          </div>

          {/* Complexity */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <BarChart3 className="h-3 w-3" />
              Complexity
            </Label>
            <Badge className={cn('mt-1', complexityConfig[opportunity.complexity].color)}>
              {complexityConfig[opportunity.complexity].label}
            </Badge>
          </div>

          {/* Expiry */}
          {opportunity.expires_at && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Expires
              </Label>
              <p className={cn('text-sm font-medium', isExpired && 'text-red-500')}>
                {isExpired ? 'Expired' : expiresIn}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(opportunity.expires_at), 'MMM d, yyyy')}
              </p>
            </div>
          )}
        </div>

        {/* Requirements */}
        {opportunity.requirements && (
          <>
            <Separator className="my-4" />
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                Requirements
              </Label>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {opportunity.requirements}
              </p>
            </div>
          </>
        )}

        <Separator className="my-4" />

        {/* Apply form (expandable) */}
        {showApplyForm ? (
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-between">
              <Label>Cover Message (optional)</Label>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowApplyForm(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Textarea
              placeholder="Introduce yourself and explain why you're a good fit for this opportunity..."
              value={coverMessage}
              onChange={(e) => setCoverMessage(e.target.value)}
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowApplyForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleApply} disabled={isApplying}>
                {isApplying ? 'Submitting...' : 'Submit Application'}
              </Button>
            </div>
          </div>
        ) : (
          /* Action buttons */
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleStar}
                disabled={isStarring}
              >
                <Star
                  className={cn(
                    'h-4 w-4 mr-1.5',
                    opportunity.is_starred
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-muted-foreground'
                  )}
                />
                {opportunity.is_starred ? 'Starred' : 'Star'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleHide}
                disabled={isHiding}
              >
                <EyeOff
                  className={cn(
                    'h-4 w-4 mr-1.5',
                    opportunity.is_hidden ? 'text-primary' : 'text-muted-foreground'
                  )}
                />
                {opportunity.is_hidden ? 'Hidden' : 'Hide'}
              </Button>
            </div>

            <Button
              onClick={() => setShowApplyForm(true)}
              disabled={isExpired}
            >
              {isExpired ? 'Expired' : 'Apply'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
