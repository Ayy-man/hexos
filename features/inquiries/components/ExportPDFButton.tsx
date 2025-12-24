'use client'

import { useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { ProposalPDF } from './ProposalPDF'

interface ExportPDFButtonProps {
  proposal: {
    id: string
    prospect_company_name: string | null
    partner_name: string
    created_at: string
    estimated_value: number | null
    pricing_notes: string | null
    blueprint: { name: string; description: string | null } | null
    partnerLogo?: string | null
  }
  documentContent: unknown
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function ExportPDFButton({
  proposal,
  documentContent,
  variant = 'outline',
  size = 'default',
}: ExportPDFButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleExport = async () => {
    setIsGenerating(true)

    try {
      const blob = await pdf(
        <ProposalPDF proposal={proposal} documentContent={documentContent} />
      ).toBlob()

      // Create download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url

      // Generate filename
      const companyName = proposal.prospect_company_name
        ?.replace(/[^a-zA-Z0-9]/g, '-')
        .toLowerCase() || 'proposal'
      const date = new Date().toISOString().split('T')[0]
      link.download = `${companyName}-proposal-${date}.pdf`

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to generate PDF:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={isGenerating}
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </>
      )}
    </Button>
  )
}
