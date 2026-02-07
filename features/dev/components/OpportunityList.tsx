'use client'

import { useState, useTransition, useMemo } from 'react'
import { Briefcase, Star, Eye, EyeOff, Filter } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { OpportunityCard } from './OpportunityCard'
import { OpportunityDetailModal } from './OpportunityDetailModal'
import { applyToOpportunityAction } from '@/features/dev/actions/invitationActions'
import {
  toggleStarAction,
  toggleHideAction,
} from '@/features/dev/actions/opportunityPrefsActions'
import type { OpportunityWithPrefs } from '@/lib/api/opportunity-types'

interface OpportunityListProps {
  opportunities: OpportunityWithPrefs[]
}

export function OpportunityList({ opportunities }: OpportunityListProps) {
  const [selectedOpportunity, setSelectedOpportunity] = useState<OpportunityWithPrefs | null>(null)
  const [showHidden, setShowHidden] = useState(false)
  const [starredOnly, setStarredOnly] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [actioningId, setActioningId] = useState<string | null>(null)
  const [actionType, setActionType] = useState<'star' | 'hide' | 'apply' | null>(null)

  // Filter and sort opportunities
  const filteredOpportunities = useMemo(() => {
    let result = opportunities

    // Filter hidden
    if (!showHidden) {
      result = result.filter(o => !o.is_hidden)
    }

    // Filter starred only
    if (starredOnly) {
      result = result.filter(o => o.is_starred)
    }

    // Sort: starred first, then by created_at
    return result.sort((a, b) => {
      if (a.is_starred && !b.is_starred) return -1
      if (!a.is_starred && b.is_starred) return 1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [opportunities, showHidden, starredOnly])

  const handleToggleStar = (opportunityId: string) => {
    setActioningId(opportunityId)
    setActionType('star')
    startTransition(async () => {
      const result = await toggleStarAction(opportunityId)
      if (result.success) {
        toast.success(result.isStarred ? 'Starred' : 'Unstarred')
      } else {
        toast.error(result.message || 'Failed to update')
      }
      setActioningId(null)
      setActionType(null)
    })
  }

  const handleToggleHide = (opportunityId: string) => {
    setActioningId(opportunityId)
    setActionType('hide')
    startTransition(async () => {
      const result = await toggleHideAction(opportunityId)
      if (result.success) {
        toast.success(result.isHidden ? 'Hidden' : 'Unhidden')
        // Close modal if hiding the currently selected opportunity
        if (selectedOpportunity?.id === opportunityId && result.isHidden) {
          setSelectedOpportunity(null)
        }
      } else {
        toast.error(result.message || 'Failed to update')
      }
      setActioningId(null)
      setActionType(null)
    })
  }

  const handleApply = (coverMessage: string) => {
    if (!selectedOpportunity) return

    setActioningId(selectedOpportunity.id)
    setActionType('apply')
    startTransition(async () => {
      const result = await applyToOpportunityAction({
        opportunityId: selectedOpportunity.id,
        coverMessage: coverMessage || undefined,
      })

      if (result.success) {
        toast.success('Application submitted!')
        setSelectedOpportunity(null)
      } else {
        toast.error(result.message || 'Failed to apply')
      }
      setActioningId(null)
      setActionType(null)
    })
  }

  // Empty state
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

  const starredCount = opportunities.filter(o => o.is_starred).length
  const hiddenCount = opportunities.filter(o => o.is_hidden).length

  return (
    <>
      {/* Filters */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {filteredOpportunities.length} opportunities
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Starred only toggle */}
          <div className="flex items-center gap-2">
            <Switch
              id="starred-only"
              checked={starredOnly}
              onCheckedChange={setStarredOnly}
            />
            <Label htmlFor="starred-only" className="text-sm flex items-center gap-1">
              <Star className="h-3 w-3" />
              Starred only
              {starredCount > 0 && (
                <span className="text-muted-foreground">({starredCount})</span>
              )}
            </Label>
          </div>

          {/* Show hidden toggle */}
          <div className="flex items-center gap-2">
            <Switch
              id="show-hidden"
              checked={showHidden}
              onCheckedChange={setShowHidden}
            />
            <Label htmlFor="show-hidden" className="text-sm flex items-center gap-1">
              {showHidden ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              Show hidden
              {hiddenCount > 0 && (
                <span className="text-muted-foreground">({hiddenCount})</span>
              )}
            </Label>
          </div>
        </div>
      </div>

      {/* No results after filtering */}
      {filteredOpportunities.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center">
              {starredOnly
                ? 'No starred opportunities. Star some to see them here!'
                : 'All opportunities are hidden. Toggle "Show hidden" to see them.'}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setStarredOnly(false)
                setShowHidden(true)
              }}
            >
              Show all
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Opportunity grid */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredOpportunities.map((opportunity) => (
            <OpportunityCard
              key={opportunity.id}
              opportunity={opportunity}
              onClick={() => setSelectedOpportunity(opportunity)}
              onToggleStar={() => handleToggleStar(opportunity.id)}
              onToggleHide={() => handleToggleHide(opportunity.id)}
              isStarring={actioningId === opportunity.id && actionType === 'star'}
              isHiding={actioningId === opportunity.id && actionType === 'hide'}
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <OpportunityDetailModal
        opportunity={selectedOpportunity}
        open={!!selectedOpportunity}
        onOpenChange={(open) => !open && setSelectedOpportunity(null)}
        onApply={handleApply}
        onToggleStar={() => selectedOpportunity && handleToggleStar(selectedOpportunity.id)}
        onToggleHide={() => selectedOpportunity && handleToggleHide(selectedOpportunity.id)}
        isApplying={actioningId === selectedOpportunity?.id && actionType === 'apply'}
        isStarring={actioningId === selectedOpportunity?.id && actionType === 'star'}
        isHiding={actioningId === selectedOpportunity?.id && actionType === 'hide'}
      />
    </>
  )
}
