'use client'

import dynamic from 'next/dynamic'

interface ExportPDFButtonProps {
  proposal: {
    id: string
    prospect_company_name: string | null
    partner_name: string
    created_at: string
    price_dfy: number | null
    pricing_notes: string | null
    blueprint: { name: string; description: string | null } | null
    partnerLogo?: string | null
  }
  documentContent: unknown
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

// Dynamic import to avoid SSR issues with @react-pdf/renderer
const ExportPDFButton = dynamic(
  () => import('./ExportPDFButton').then(mod => mod.ExportPDFButton),
  { ssr: false, loading: () => null }
)

export function ExportPDFButtonWrapper(props: ExportPDFButtonProps) {
  return <ExportPDFButton {...props} />
}
