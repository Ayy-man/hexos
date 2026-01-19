'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Send, Loader2, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { requestUpdatesAction } from '@/features/inquiries/actions/reminderActions'
import type { StaleProposal, BundledProposalRequest } from '@/lib/api/proposal-reminders'

interface AdminProposalUpdatePanelProps {
  proposals: StaleProposal[]
  bundles: BundledProposalRequest[]
  onUpdate?: () => void
}

export function AdminProposalUpdatePanel({
  proposals,
  bundles,
  onUpdate,
}: AdminProposalUpdatePanelProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  const toggleProposal = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const toggleDfyPartner = (dfyId: string) => {
    const bundle = bundles.find((b) => b.dfyPartnerId === dfyId)
    if (!bundle) return

    const proposalIds = bundle.proposals.map((p) => p.id)
    const allSelected = proposalIds.every((id) => selectedIds.has(id))

    const newSelected = new Set(selectedIds)
    if (allSelected) {
      proposalIds.forEach((id) => newSelected.delete(id))
    } else {
      proposalIds.forEach((id) => newSelected.add(id))
    }
    setSelectedIds(newSelected)
  }

  const selectAll = () => {
    setSelectedIds(new Set(proposals.map((p) => p.id)))
  }

  const selectAllStale = () => {
    // Select only proposals older than 21 days (stale)
    const staleIds = proposals.filter((p) => p.days_since_sent >= 21).map((p) => p.id)
    setSelectedIds(new Set(staleIds))
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  const handleRequestUpdates = () => {
    if (selectedIds.size === 0) {
      toast.error('Please select at least one proposal')
      return
    }

    startTransition(async () => {
      try {
        const result = await requestUpdatesAction(Array.from(selectedIds))
        if (result.success) {
          toast.success(result.message)
          setSelectedIds(new Set())
          onUpdate?.()
        } else {
          toast.error(result.message)
        }
      } catch (error) {
        console.error('Error requesting updates:', error)
        toast.error('Failed to request updates')
      }
    })
  }

  if (proposals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Proposal Status Requests</CardTitle>
          <CardDescription>No sent proposals awaiting updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500/50 mb-4" />
            <p className="text-muted-foreground">All proposals are up to date!</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const staleCount = proposals.filter((p) => p.days_since_sent >= 21).length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Proposal Status Requests</CardTitle>
            <CardDescription>
              {proposals.length} sent proposal{proposals.length !== 1 ? 's' : ''}
              {staleCount > 0 && (
                <span className="text-amber-600 dark:text-amber-400 ml-1">
                  ({staleCount} stale)
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <Badge variant="secondary">{selectedIds.size} selected</Badge>
            )}
            <Button
              onClick={handleRequestUpdates}
              disabled={selectedIds.size === 0 || isPending}
              size="sm"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Request Updates
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick select buttons */}
        <div className="flex flex-wrap gap-2 pb-2 border-b">
          <Button variant="outline" size="sm" onClick={selectAllStale}>
            Select All Stale ({staleCount})
          </Button>
          <Button variant="outline" size="sm" onClick={selectAll}>
            Select All ({proposals.length})
          </Button>
          <Button variant="ghost" size="sm" onClick={clearSelection}>
            Clear
          </Button>
        </div>

        {/* Proposals grouped by DFY partner */}
        <div className="space-y-4">
          {bundles.map((bundle) => {
            const bundleIds = bundle.proposals.map((p) => p.id)
            const allSelected = bundleIds.every((id) => selectedIds.has(id))
            const someSelected = bundleIds.some((id) => selectedIds.has(id))

            return (
              <div key={bundle.dfyPartnerId} className="rounded-lg border p-3">
                {/* DFY Partner Header */}
                <div className="flex items-center gap-3 pb-2 border-b mb-2">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={() => toggleDfyPartner(bundle.dfyPartnerId)}
                    className={someSelected && !allSelected ? 'opacity-50' : ''}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {bundle.dfyPartnerName || 'Unknown Partner'}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {bundle.dfyPartnerEmail}
                    </p>
                  </div>
                  <Badge variant="outline">{bundle.proposals.length}</Badge>
                </div>

                {/* Proposals list */}
                <div className="space-y-2 pl-7">
                  {bundle.proposals.map((proposal) => (
                    <div
                      key={proposal.id}
                      className="flex items-center gap-3 py-1"
                    >
                      <Checkbox
                        checked={selectedIds.has(proposal.id)}
                        onCheckedChange={() => toggleProposal(proposal.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">
                          {proposal.prospect_company_name || 'Unnamed'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {proposal.days_since_sent >= 21 ? (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {proposal.days_since_sent}d
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {proposal.days_since_sent}d
                          </Badge>
                        )}
                        {proposal.admin_update_requested_at && (
                          <Badge variant="outline" className="text-xs">
                            Requested
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
