'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Package } from 'lucide-react'
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
    estimated_value: number | null
    blueprint?: { name: string } | null
  }
  deliverables: ProposalDeliverable[]
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
  onConvert,
  variant = 'floating',
}: ConvertToProjectButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {variant === 'floating' ? (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            size="lg"
            className="bg-cyan-600 hover:bg-cyan-700 shadow-lg"
            onClick={() => setOpen(true)}
          >
            <Package className="h-5 w-5 mr-2" />
            Convert to Project
          </Button>
        </div>
      ) : (
        <Button
          className="w-full bg-cyan-600 hover:bg-cyan-700"
          onClick={() => setOpen(true)}
        >
          <Package className="h-4 w-4 mr-2" />
          Convert to Project
        </Button>
      )}
      <ConvertToProjectWizard
        open={open}
        onOpenChange={setOpen}
        inquiry={inquiry}
        deliverables={deliverables}
        onConvert={onConvert}
      />
    </>
  )
}
