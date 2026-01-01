'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Package, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { ConvertToProjectWizard } from './ConvertToProjectWizard'
import type { ProposalDeliverable } from '@/lib/api/proposal-deliverables'
import type { ConvertToProjectInput } from '@/lib/api/inquiries'

interface ConvertToProjectButtonProps {
  inquiry: {
    id: string
    prospect_company_name: string | null
    prospect_website: string | null
    industry: string | null
    partner_name: string | null
    price_dfy: number | null
    blueprint?: { name: string } | null
  }
  deliverables: ProposalDeliverable[]
  proposalContent?: unknown
  parseDeliverables?: (content: unknown) => Promise<ProposalDeliverable[]>
  onConvert: (
    projectData: ConvertToProjectInput,
    deliverableIds: string[],
    requirements: Array<{ title: string; description?: string }>
  ) => Promise<{ projectId: string }>
  variant?: 'floating' | 'inline'
}

export function ConvertToProjectButton({
  inquiry,
  deliverables,
  proposalContent,
  parseDeliverables,
  onConvert,
  variant = 'floating',
}: ConvertToProjectButtonProps) {
  const [open, setOpen] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [wizardDeliverables, setWizardDeliverables] = useState<ProposalDeliverable[]>(deliverables)

  const handleClick = async () => {
    // If deliverables exist, open wizard directly
    if (deliverables.length > 0) {
      setWizardDeliverables(deliverables)
      setOpen(true)
      return
    }

    // No deliverables - check if we can parse
    if (!proposalContent) {
      toast.error('Cannot convert: No proposal written yet. Write a proposal first.')
      return
    }

    if (!parseDeliverables) {
      // Fallback: open wizard with empty deliverables
      setWizardDeliverables([])
      setOpen(true)
      return
    }

    // Parse deliverables first
    setIsParsing(true)
    try {
      const parsed = await parseDeliverables(proposalContent)
      if (parsed.length === 0) {
        toast.warning('No deliverables found in proposal. You can add them manually.')
      }
      setWizardDeliverables(parsed)
      setOpen(true)
    } catch (error) {
      console.error('Failed to parse deliverables:', error)
      toast.error('Failed to extract deliverables from proposal. Please try again.')
    } finally {
      setIsParsing(false)
    }
  }

  return (
    <>
      {variant === 'floating' ? (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            size="lg"
            className="bg-cyan-600 hover:bg-cyan-700 shadow-lg"
            onClick={handleClick}
            disabled={isParsing}
          >
            {isParsing ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <Package className="h-5 w-5 mr-2" />
            )}
            {isParsing ? 'Extracting Deliverables...' : 'Convert to Project'}
          </Button>
        </div>
      ) : (
        <Button
          className="w-full bg-cyan-600 hover:bg-cyan-700"
          onClick={handleClick}
          disabled={isParsing}
        >
          {isParsing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Package className="h-4 w-4 mr-2" />
          )}
          {isParsing ? 'Extracting Deliverables...' : 'Convert to Project'}
        </Button>
      )}
      <ConvertToProjectWizard
        open={open}
        onOpenChange={setOpen}
        inquiry={inquiry}
        deliverables={wizardDeliverables}
        onConvert={onConvert}
      />
    </>
  )
}
