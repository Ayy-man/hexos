'use client'

import { useState } from 'react'
import { AlertTriangle, ChevronRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProposalStatusDialog } from './ProposalStatusDialog'
import type { StaleProposal } from '@/lib/api/proposal-reminders'

interface StaleProposalsBannerProps {
  proposals: StaleProposal[]
  onUpdate?: () => void
}

export function StaleProposalsBanner({
  proposals,
  onUpdate,
}: StaleProposalsBannerProps) {
  const [dismissed, setDismissed] = useState(false)
  const [selectedProposal, setSelectedProposal] = useState<StaleProposal | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)

  if (dismissed || proposals.length === 0) {
    return null
  }

  const handleReviewClick = () => {
    setSelectedProposal(proposals[currentIndex])
  }

  const handleDialogComplete = () => {
    // Move to next proposal or dismiss if done
    if (currentIndex < proposals.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setSelectedProposal(proposals[currentIndex + 1])
    } else {
      setSelectedProposal(null)
      onUpdate?.()
    }
  }

  const count = proposals.length

  return (
    <>
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/50 dark:bg-amber-950/30">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-amber-800 dark:text-amber-200">
              {count} proposal{count !== 1 ? 's' : ''} need{count === 1 ? 's' : ''} your attention
            </h3>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-300/80">
              You have proposals waiting for status updates. Please let us know if they closed, were lost, or are still in progress.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={handleReviewClick}
                className="bg-amber-600 text-white hover:bg-amber-700"
              >
                Review Proposals
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
              {count > 1 && (
                <span className="self-center text-xs text-amber-600 dark:text-amber-400">
                  {currentIndex + 1} of {count}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="flex-shrink-0 text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200"
            aria-label="Dismiss"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Proposal list preview */}
        {count > 0 && count <= 5 && (
          <div className="mt-3 space-y-1 border-t border-amber-200 pt-3 dark:border-amber-800/50">
            {proposals.map((proposal, index) => (
              <button
                key={proposal.id}
                onClick={() => {
                  setCurrentIndex(index)
                  setSelectedProposal(proposal)
                }}
                className="w-full text-left text-sm px-2 py-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 flex items-center justify-between group"
              >
                <span className="text-amber-800 dark:text-amber-200 truncate">
                  {proposal.prospect_company_name || 'Unnamed proposal'}
                </span>
                <span className="text-xs text-amber-600 dark:text-amber-400 ml-2 flex-shrink-0">
                  {proposal.days_since_sent}d ago
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedProposal && (
        <ProposalStatusDialog
          proposal={selectedProposal}
          open={!!selectedProposal}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedProposal(null)
              onUpdate?.()
            }
          }}
          onComplete={handleDialogComplete}
        />
      )}
    </>
  )
}
