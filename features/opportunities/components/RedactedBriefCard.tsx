'use client'

import { useState, useTransition } from 'react'
import { RefreshCw, Shield, Clock, Layers, Code2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { RedactedBrief, BriefExtraction } from '@/lib/api/brief-extractions'
import type { BriefSourceType } from '@/lib/api/brief-extractions'
import { regenerateBriefAction } from '../actions/briefActions'

interface RedactedBriefCardProps {
  extraction: BriefExtraction
  sourceType: BriefSourceType
  sourceId: string
  sourceData?: Record<string, unknown>
  showRegenerateButton?: boolean // Admin only
  onRegenerate?: (newExtraction: BriefExtraction) => void
}

/**
 * Display component for showing redacted briefs to developers.
 * Shows structured brief data with industry, scope, tech stack, deliverables.
 * Admins can force regeneration with the regenerate button.
 */
export function RedactedBriefCard({
  extraction,
  sourceType,
  sourceId,
  sourceData,
  showRegenerateButton = false,
  onRegenerate,
}: RedactedBriefCardProps) {
  const [isPending, startTransition] = useTransition()
  const [localExtraction, setLocalExtraction] = useState(extraction)

  const brief = localExtraction.brief_content as RedactedBrief

  const handleRegenerate = () => {
    if (!sourceData) {
      toast.error('Source data required to regenerate brief')
      return
    }

    startTransition(async () => {
      try {
        const newExtraction = await regenerateBriefAction({
          sourceType,
          sourceId,
          sourceData,
        })
        setLocalExtraction(newExtraction)
        toast.success('Brief regenerated successfully')
        onRegenerate?.(newExtraction)
      } catch (error) {
        console.error('Failed to regenerate brief:', error)
        toast.error(error instanceof Error ? error.message : 'Failed to regenerate brief')
      }
    })
  }

  // Format the created_at date
  const formattedDate = new Date(localExtraction.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  // Complexity badge colors
  const complexityColors = {
    low: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    medium: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    high: 'bg-red-500/10 text-red-700 dark:text-red-400',
  }

  return (
    <Card>
      {/* Header */}
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            <CardTitle>Project Brief</CardTitle>
          </div>
          {showRegenerateButton && sourceData && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={isPending}
            >
              <RefreshCw className={cn('h-4 w-4 mr-2', isPending && 'animate-spin')} />
              {isPending ? 'Regenerating...' : 'Regenerate'}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        {/* Industry & Problem Type */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Industry</p>
            <p className="font-medium">{brief.industry}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Problem Type</p>
            <p className="font-medium">{brief.problem_type}</p>
          </div>
        </div>

        {/* Scope Summary */}
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Scope</p>
          <div className="bg-muted/50 rounded-lg p-4 border-l-4 border-cyan-500">
            <p className="text-sm leading-relaxed">{brief.scope_summary}</p>
          </div>
        </div>

        {/* Tech Stack */}
        {brief.tech_stack.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Code2 className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">Tech Stack</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {brief.tech_stack.map((tech, index) => (
                <Badge key={index} variant="secondary">
                  {tech}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Deliverables */}
        {brief.deliverables_overview.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">Deliverables</p>
            </div>
            <ul className="space-y-1.5">
              {brief.deliverables_overview.map((deliverable, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span>{deliverable}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Complexity & Duration */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Complexity</p>
            <Badge
              variant="secondary"
              className={cn(complexityColors[brief.complexity])}
            >
              {brief.complexity.charAt(0).toUpperCase() + brief.complexity.slice(1)}
            </Badge>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">Duration</p>
            </div>
            <p className="font-medium">{brief.estimated_duration}</p>
          </div>
        </div>

        {/* Special Requirements */}
        {brief.special_requirements && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <p className="text-sm font-medium text-muted-foreground">Special Requirements</p>
            </div>
            <p className="text-sm text-muted-foreground">{brief.special_requirements}</p>
          </div>
        )}
      </CardContent>

      {/* Footer */}
      <CardFooter className="border-t pt-4">
        <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            <span>
              {brief.redacted_fields.length > 0
                ? `${brief.redacted_fields.length} sensitive field${brief.redacted_fields.length === 1 ? '' : 's'} redacted`
                : 'No sensitive data detected'}
            </span>
          </div>
          <span>Generated {formattedDate}</span>
        </div>
      </CardFooter>
    </Card>
  )
}
