'use client'

import { format } from 'date-fns'
import { Plate, usePlateEditor } from 'platejs/react'
import { Editor, EditorContainer } from '@/components/ui/editor'
import { BlueprintEditorPlugins } from '@/components/editor/plugins/blueprint-editor-kit'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { FileText, Calendar, Building2 } from 'lucide-react'
import { ExportPDFButton } from './ExportPDFButton'

type BlueprintData = { name: string; description: string | null; pricing_tiers: unknown }

interface PublicProposal {
  id: string
  prospect_company_name: string | null
  partner_name: string
  submission_type: string
  form_path: string
  document_content: unknown
  proposal_content: unknown
  proposal_submitted_at: string | null
  price_dfy: number | null
  pricing_notes: string | null
  blueprint: BlueprintData | BlueprintData[] | null
  partner: { logo_url: string | null } | { logo_url: string | null }[] | null
  created_at: string
}

interface PublicProposalViewProps {
  proposal: PublicProposal
}

export function PublicProposalView({ proposal }: PublicProposalViewProps) {
  // Normalize blueprint - Supabase may return array for joins
  const blueprint: BlueprintData | null = Array.isArray(proposal.blueprint)
    ? proposal.blueprint[0] || null
    : proposal.blueprint

  // Normalize partner - Supabase may return array for joins
  const partner = Array.isArray(proposal.partner)
    ? proposal.partner[0] || null
    : proposal.partner
  const partnerLogo = partner?.logo_url || null

  // Use proposal_content if proposal is submitted, otherwise fall back to document_content
  const isProposalSubmitted = !!proposal.proposal_submitted_at
  const proposalContent = proposal.proposal_content
  const documentContent = proposal.document_content

  // Prefer proposal_content when proposal is submitted
  const contentToDisplay = isProposalSubmitted && proposalContent && Array.isArray(proposalContent) && proposalContent.length > 0
    ? proposalContent
    : documentContent

  const hasContent = contentToDisplay &&
    Array.isArray(contentToDisplay) &&
    contentToDisplay.length > 0

  const editor = usePlateEditor({
    plugins: BlueprintEditorPlugins,
    value: hasContent ? (contentToDisplay as any) : [
      { type: 'p', children: [{ text: 'No proposal content available yet.' }] }
    ],
  })

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              <span className="font-semibold text-lg">Proposal</span>
            </div>
            <ExportPDFButton
              proposal={{
                id: proposal.id,
                prospect_company_name: proposal.prospect_company_name,
                partner_name: proposal.partner_name,
                created_at: proposal.created_at,
                price_dfy: proposal.price_dfy,
                pricing_notes: proposal.pricing_notes,
                blueprint: blueprint,
                partnerLogo: partnerLogo,
              }}
              documentContent={contentToDisplay}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-4xl mx-auto px-4 py-8">
        {/* Title Section */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
            <Building2 className="h-4 w-4" />
            <span className="text-sm uppercase tracking-wider">Proposal For</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {proposal.prospect_company_name || 'Your Project'}
          </h1>
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className="text-sm">
              Prepared {format(new Date(proposal.created_at), 'MMMM d, yyyy')}
            </span>
          </div>
        </div>

        {/* Blueprint Info */}
        {blueprint && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                Solution Type
              </div>
              <p className="font-semibold">{blueprint.name}</p>
              {blueprint.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {blueprint.description}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Document Content */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <Plate editor={editor} readOnly>
              <EditorContainer className="min-h-[400px] bg-transparent">
                <Editor
                  variant="fullWidth"
                  className="px-0 py-4 prose prose-stone dark:prose-invert max-w-none"
                  placeholder="No content available..."
                />
              </EditorContainer>
            </Plate>
          </CardContent>
        </Card>

        {/* Pricing Section */}
        {(proposal.price_dfy || proposal.pricing_notes) && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-4">Investment</h2>
              {proposal.price_dfy && (
                <div className="text-3xl font-bold text-primary mb-2">
                  {formatCurrency(proposal.price_dfy)}
                </div>
              )}
              {proposal.pricing_notes && (
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {proposal.pricing_notes}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <Separator className="my-8" />

        {/* Footer */}
        <footer className="text-center text-sm text-muted-foreground">
          {!partnerLogo && (
            <p>
              Powered by{' '}
              <span className="font-semibold text-foreground">hexOS</span>
            </p>
          )}
          <p className={partnerLogo ? '' : 'mt-1'}>
            Questions? Contact your representative: {proposal.partner_name}
          </p>
        </footer>
      </main>
    </div>
  )
}
