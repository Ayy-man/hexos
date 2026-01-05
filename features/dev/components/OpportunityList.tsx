'use client'

import { useState, useTransition } from 'react'
import { Briefcase, Code2, CalendarDays, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { applyToOpportunityAction } from '@/features/dev/actions/invitationActions'
import type { ProjectOpportunity } from '@/lib/api/project-invitations'

interface OpportunityListProps {
  opportunities: ProjectOpportunity[]
}

const complexityColors = {
  low: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200',
  high: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200',
}

export function OpportunityList({ opportunities }: OpportunityListProps) {
  const [selectedOpportunity, setSelectedOpportunity] = useState<ProjectOpportunity | null>(null)
  const [coverMessage, setCoverMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleApply = () => {
    if (!selectedOpportunity) return

    startTransition(async () => {
      const result = await applyToOpportunityAction({
        opportunityId: selectedOpportunity.id,
        coverMessage: coverMessage || undefined,
      })

      if (result.success) {
        toast.success('Application submitted!')
        setSelectedOpportunity(null)
        setCoverMessage('')
      } else {
        toast.error(result.message || 'Failed to apply')
      }
    })
  }

  if (opportunities.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Briefcase className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground text-center">
            No open opportunities at the moment.
            <br />
            Check back later or wait for a direct invitation.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {opportunities.map((opportunity) => (
          <Card key={opportunity.id} className="overflow-hidden">
            <CardContent className="p-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold line-clamp-1">{opportunity.title}</h3>
                  {opportunity.project && (
                    <p className="text-sm text-muted-foreground">
                      {opportunity.project.client_name}
                    </p>
                  )}
                </div>
                <Badge className={complexityColors[opportunity.complexity]}>
                  {opportunity.complexity}
                </Badge>
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                {opportunity.description || 'No description provided'}
              </p>

              {/* Details */}
              <div className="flex flex-wrap gap-2 mb-4">
                {opportunity.estimated_hours && (
                  <Badge variant="secondary">
                    <Clock className="h-3 w-3 mr-1" />
                    {opportunity.estimated_hours}h
                  </Badge>
                )}
                {opportunity.deadline && (
                  <Badge variant="secondary">
                    <CalendarDays className="h-3 w-3 mr-1" />
                    {new Date(opportunity.deadline).toLocaleDateString()}
                  </Badge>
                )}
              </div>

              {/* Tech Stack */}
              {opportunity.tech_stack && opportunity.tech_stack.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {opportunity.tech_stack.slice(0, 4).map((tech) => (
                    <Badge key={tech} variant="outline" className="text-xs">
                      {tech}
                    </Badge>
                  ))}
                  {opportunity.tech_stack.length > 4 && (
                    <Badge variant="outline" className="text-xs">
                      +{opportunity.tech_stack.length - 4}
                    </Badge>
                  )}
                </div>
              )}

              {/* Actions */}
              <Button
                className="w-full"
                onClick={() => setSelectedOpportunity(opportunity)}
              >
                Apply
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Apply Dialog */}
      <Dialog open={!!selectedOpportunity} onOpenChange={(open) => !open && setSelectedOpportunity(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply to {selectedOpportunity?.title}</DialogTitle>
            <DialogDescription>
              Send your application for this project opportunity.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedOpportunity?.description && (
              <div>
                <p className="text-sm font-medium mb-1">Description</p>
                <p className="text-sm text-muted-foreground">
                  {selectedOpportunity.description}
                </p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-1 block">
                Cover Message (optional)
              </label>
              <Textarea
                placeholder="Introduce yourself and explain why you're a good fit..."
                value={coverMessage}
                onChange={(e) => setCoverMessage(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedOpportunity(null)}>
              Cancel
            </Button>
            <Button onClick={handleApply} disabled={isPending}>
              {isPending ? 'Submitting...' : 'Submit Application'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
