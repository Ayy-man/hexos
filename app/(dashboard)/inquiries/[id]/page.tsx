import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAuth, getProfile } from '@/lib/auth/guards'
import { getInquiry } from '@/lib/api/inquiries'
import { getInquiryComments, type InquiryComment, type CommentType } from '@/lib/api/inquiry-comments'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Building2, Calendar, User, Mail, Globe, FileText, MessageSquare, Archive, Send, Lock } from 'lucide-react'
import { PATH_LABELS } from '@/features/inquiries/constants/fieldMappings'
import { InquiryDocumentTab } from '@/features/inquiries/components/InquiryDocumentTab'
import { InquiryActions } from '@/features/inquiries/components/InquiryActions'
import { StageHistoryTimeline } from '@/features/inquiries/components/StageHistoryTimeline'
import { StageBadge } from '@/features/inquiries/components/StageBadge'
import { QuickPricingEditor } from '@/features/inquiries/components/QuickPricingEditor'
import { ExportPDFButton } from '@/features/inquiries/components/ExportPDFButton'
import { ShareLinkButton } from '@/features/inquiries/components/ShareLinkButton'
import { ProposalTab } from '@/features/inquiries/components/ProposalTab'
import { MyVersionTab } from '@/features/inquiries/components/MyVersionTab'
import type { ProposalStage } from '@/lib/api/inquiries'
import { generateDocumentFromInquiry } from '@/features/inquiries/utils/generateDocumentFromInquiry'
import {
  saveInquiryDocumentWithDiscussions,
  addInquiryComment,
  resolveInquiryCommentAction,
  deleteInquiryCommentAction,
} from '@/features/inquiries/actions/documentActions'
import {
  saveProposalContentAction,
  submitProposalAction,
  saveDfyVersionAction,
  copyProposalToDfyVersionAction,
  addProposalComment,
  resolveProposalCommentAction,
  deleteProposalCommentAction,
} from '@/features/inquiries/actions/proposalActions'
import type { TDiscussion } from '@/features/inquiries/components/editor/plugins'

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  processing: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  converted: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// Field display names for form_data
const FIELD_LABELS: Record<string, string> = {
  prospect_company_name: 'Company Name',
  prospect_website: 'Website',
  industry: 'Industry',
  monthly_volume: 'Monthly Volume',
  current_tools: 'Current Tools',
  existing_crm: 'Existing CRM',
  primary_goal: 'Primary Goal',
  additional_notes: 'Additional Notes',
  variation_description: 'Variation Description',
  special_notes: 'Special Notes',
  build_preference: 'Build Preference',
  relationship_type: 'Relationship Type',
  contact_role: 'Contact Role',
  budget_indication: 'Budget Indication',
  urgency: 'Urgency',
  engagement_level: 'Engagement Level',
  problem_importance: 'Problem Importance',
  departments_involved: 'Departments Involved',
  current_workflow: 'Current Workflow',
  main_challenges: 'Main Challenges',
  tasks_to_automate: 'Tasks to Automate',
  automation_goals: 'Automation Goals',
  current_tools_detailed: 'Current Tools (Detailed)',
  existing_automations: 'Existing Automations',
  client_annual_revenue: 'Annual Revenue',
  project_tier: 'Project Tier',
  project_duration: 'Project Duration',
  go_live_date: 'Go-Live Date',
  support_level: 'Support Level',
  forward_email_1: 'Forward Email 1',
  forward_email_2: 'Forward Email 2',
}

export default async function InquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAuth()
  const profile = await getProfile()
  const { id } = await params

  if (!profile || !['admin', 'internal', 'dfy'].includes(profile.role)) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">You don&apos;t have access to this page.</p>
      </div>
    )
  }

  let inquiry
  let internalComments: InquiryComment[] = []
  let dfyComments: InquiryComment[] = []
  try {
    inquiry = await getInquiry(id)
  } catch {
    notFound()
  }

  if (!inquiry) {
    notFound()
  }

  // DFY can only see their own
  if (profile.role === 'dfy' && inquiry.submitted_by !== profile.id) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">You don&apos;t have access to this inquiry.</p>
      </div>
    )
  }

  // Auto-advance from "unopened" to "admin_reviewed" when admin views inquiry
  const isAdminRole = ['admin', 'internal'].includes(profile.role)
  if (isAdminRole && inquiry.proposal_stage === 'unopened') {
    try {
      const { updateInquiryStage } = await import('@/lib/api/inquiries')
      await updateInquiryStage(id, 'admin_reviewed', 'Auto-advanced on first admin view')
      // Update local state so UI reflects the change
      inquiry.proposal_stage = 'admin_reviewed'
    } catch (error) {
      console.warn('Failed to auto-advance stage:', error)
    }
  }

  // Permission variables
  const isAdmin = ['admin', 'internal'].includes(profile.role)
  const isDfyOwner = profile.role === 'dfy' && inquiry.submitted_by === profile.id
  const proposalSubmitted = !!inquiry.proposal_submitted_at

  // Tab visibility
  const showProposalTab = isAdmin || isDfyOwner
  const showMyVersionTab = isDfyOwner

  // Fetch comments by type - admin/internal see both, DFY only sees DFY
  const isInternal = isAdmin
  let proposalComments: InquiryComment[] = []
  try {
    if (isInternal) {
      // Fetch all comment types for internal users
      const [internal, dfy, proposal] = await Promise.all([
        getInquiryComments(id, 'internal'),
        getInquiryComments(id, 'dfy'),
        getInquiryComments(id, 'proposal'),
      ])
      internalComments = internal
      dfyComments = dfy
      proposalComments = proposal
    } else if (isDfyOwner && proposalSubmitted) {
      // DFY sees DFY comments and proposal comments (after submission)
      const [dfy, proposal] = await Promise.all([
        getInquiryComments(id, 'dfy'),
        getInquiryComments(id, 'proposal'),
      ])
      dfyComments = dfy
      proposalComments = proposal
    } else {
      // DFY only sees DFY comments
      dfyComments = await getInquiryComments(id, 'dfy')
    }
  } catch (error) {
    // inquiry_comments table may not exist yet - silently fail
    console.warn('Failed to fetch comments:', error)
  }

  const formData = (inquiry.form_data || {}) as Record<string, unknown>
  const canEdit = isAdmin
  const canEditAsOwner = isDfyOwner
  const canEditDocument = canEdit || canEditAsOwner
  const canComment = ['admin', 'internal', 'dfy'].includes(profile.role)

  // Generate document content from inquiry form_data
  const generatedDocumentContent = generateDocumentFromInquiry({
    id: inquiry.id,
    partner_name: inquiry.partner_name,
    prospect_company_name: inquiry.prospect_company_name,
    form_path: inquiry.form_path,
    submission_type: inquiry.submission_type,
    created_at: inquiry.created_at,
    form_data: formData,
    blueprint: inquiry.blueprint,
  })

  // Create bound server actions
  const boundSaveDocument = async (content: unknown, discussions: TDiscussion[]) => {
    'use server'
    await saveInquiryDocumentWithDiscussions(id, content, discussions)
  }

  const boundAddComment = async (content: string, commentType: CommentType, parentId?: string) => {
    'use server'
    return addInquiryComment(id, content, commentType, parentId)
  }

  const boundResolveComment = async (commentId: string, resolved: boolean) => {
    'use server'
    await resolveInquiryCommentAction(id, commentId, resolved)
  }

  const boundDeleteComment = async (commentId: string) => {
    'use server'
    await deleteInquiryCommentAction(id, commentId)
  }

  // Bound server actions for Proposal tab
  const boundSaveProposal = async (content: unknown, discussions: TDiscussion[]) => {
    'use server'
    await saveProposalContentAction(id, content, discussions)
  }

  const boundSubmitProposal = async () => {
    'use server'
    await submitProposalAction(id)
  }

  const boundAddProposalComment = async (content: string, parentId?: string) => {
    'use server'
    return addProposalComment(id, content, parentId)
  }

  const boundResolveProposalComment = async (commentId: string, resolved: boolean) => {
    'use server'
    await resolveProposalCommentAction(id, commentId, resolved)
  }

  const boundDeleteProposalComment = async (commentId: string) => {
    'use server'
    await deleteProposalCommentAction(id, commentId)
  }

  // Bound server actions for My Version tab
  const boundSaveDfyVersion = async (content: unknown) => {
    'use server'
    await saveDfyVersionAction(id, content)
  }

  const boundCopyProposalToDfyVersion = async () => {
    'use server'
    await copyProposalToDfyVersionAction(id)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/inquiries">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {inquiry.prospect_company_name || 'Unnamed Prospect'}
            </h1>
            <StageBadge stage={inquiry.proposal_stage as ProposalStage} />
            {inquiry.archived_at && (
              <Badge variant="outline" className="gap-1">
                <Archive className="h-3 w-3" />
                Archived
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {PATH_LABELS[inquiry.form_path] || inquiry.form_path} &bull;{' '}
            {inquiry.submission_type === 'closed' ? 'Closed Deal' : 'Proposal Request'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ShareLinkButton publicToken={inquiry.public_token} />
          <ExportPDFButton
            proposal={{
              id: inquiry.id,
              prospect_company_name: inquiry.prospect_company_name,
              partner_name: inquiry.partner_name,
              created_at: inquiry.created_at,
              estimated_value: inquiry.estimated_value as number | null,
              pricing_notes: inquiry.pricing_notes as string | null,
              blueprint: inquiry.blueprint,
            }}
            documentContent={inquiry.document_content || generatedDocumentContent}
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="document" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Document
            {(() => {
              const unresolvedCount = [...internalComments, ...dfyComments].filter(c => !c.resolved && !c.parent_id).length
              return unresolvedCount > 0 ? (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {unresolvedCount}
                </Badge>
              ) : null
            })()}
          </TabsTrigger>
          {showProposalTab && (
            <TabsTrigger value="proposal" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Proposal
              {proposalSubmitted && (
                <Badge variant="outline" className="ml-1 text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-green-200 dark:border-green-800">
                  Sent
                </Badge>
              )}
              {(() => {
                const unresolvedCount = proposalComments.filter(c => !c.resolved && !c.parent_id).length
                return unresolvedCount > 0 ? (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {unresolvedCount}
                  </Badge>
                ) : null
              })()}
            </TabsTrigger>
          )}
          {showMyVersionTab && (
            <TabsTrigger value="my-version" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              My Version
            </TabsTrigger>
          )}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Main Content */}
            <div className="md:col-span-2 space-y-6">
              {/* Prospect Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Prospect Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {inquiry.prospect_company_name && (
                      <div>
                        <p className="text-sm text-muted-foreground">Company Name</p>
                        <p className="font-medium">{inquiry.prospect_company_name}</p>
                      </div>
                    )}
                    {inquiry.prospect_website && (
                      <div>
                        <p className="text-sm text-muted-foreground">Website</p>
                        <a
                          href={inquiry.prospect_website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-cyan-600 hover:underline flex items-center gap-1"
                        >
                          <Globe className="h-3 w-3" />
                          {inquiry.prospect_website}
                        </a>
                      </div>
                    )}
                    {inquiry.industry && (
                      <div>
                        <p className="text-sm text-muted-foreground">Industry</p>
                        <p className="font-medium">{inquiry.industry}</p>
                      </div>
                    )}
                    {inquiry.blueprint && (
                      <div>
                        <p className="text-sm text-muted-foreground">Blueprint</p>
                        <p className="font-medium">{inquiry.blueprint.name}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Form Data */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Submission Details
                  </CardTitle>
                  <CardDescription>All fields from the intake form</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(formData)
                      .filter(([key]) => !['submission_type', 'partner_name', 'closed_deal_type', 'proposal_type'].includes(key))
                      .map(([key, value]) => {
                        if (!value || (Array.isArray(value) && value.length === 0)) return null

                        const displayValue = Array.isArray(value)
                          ? value.join(', ')
                          : String(value)

                        if (!displayValue.trim()) return null

                        return (
                          <div key={key} className="border-b pb-3 last:border-0">
                            <p className="text-sm text-muted-foreground">
                              {FIELD_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </p>
                            <p className="font-medium whitespace-pre-wrap">{displayValue}</p>
                          </div>
                        )
                      })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Submission Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Submission Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Submitted by</p>
                      <p className="font-medium">{inquiry.partner_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Submitted on</p>
                      <p className="font-medium">{formatDate(inquiry.created_at)}</p>
                    </div>
                  </div>
                  {inquiry.forward_emails && inquiry.forward_emails.length > 0 && (
                    <div className="flex items-start gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Forward to</p>
                        {inquiry.forward_emails.map((email: string) => (
                          <p key={email} className="font-medium">{email}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Proposal Progress Timeline */}
              <StageHistoryTimeline
                currentStage={inquiry.proposal_stage as ProposalStage}
                stageHistory={(inquiry.stage_history as Array<{
                  from: ProposalStage | null
                  to: ProposalStage
                  changed_by: string
                  changed_at: string
                  notes?: string
                }>) || []}
                stageEnteredAt={inquiry.stage_entered_at as string | null}
                createdAt={inquiry.created_at}
              />

              {/* Quick Pricing Editor */}
              {canEditDocument && (
                <QuickPricingEditor
                  inquiryId={id}
                  initialValue={inquiry.estimated_value as number | null}
                  initialNotes={inquiry.pricing_notes as string | null}
                />
              )}
              {!canEditDocument && (inquiry.estimated_value || inquiry.pricing_notes) && (
                <QuickPricingEditor
                  inquiryId={id}
                  initialValue={inquiry.estimated_value as number | null}
                  initialNotes={inquiry.pricing_notes as string | null}
                  readOnly
                />
              )}

              {/* Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {inquiry.project ? (
                    <Button className="w-full" asChild>
                      <Link href={`/projects/${inquiry.project.id}`}>
                        View Project
                      </Link>
                    </Button>
                  ) : (
                    <Button className="w-full" disabled>
                      Convert to Project (Coming Soon)
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Admin Actions - Archive/Delete */}
              {canEdit && (
                <InquiryActions
                  inquiryId={id}
                  isArchived={!!inquiry.archived_at}
                  hasProject={!!inquiry.project}
                />
              )}
            </div>
          </div>
        </TabsContent>

        {/* Document Tab */}
        <TabsContent value="document">
          <InquiryDocumentTab
            inquiryId={id}
            initialDocumentContent={inquiry.document_content}
            generatedDocumentContent={generatedDocumentContent}
            initialInlineDiscussions={(inquiry.inline_discussions as TDiscussion[]) || []}
            internalComments={internalComments}
            dfyComments={dfyComments}
            canEdit={canEditDocument}
            canComment={canComment}
            showInternalTab={isInternal}
            showDfyTab={true}
            currentUser={{
              id: profile.id,
              name: profile.name || profile.email || 'User',
            }}
            saveDocument={boundSaveDocument}
            addComment={boundAddComment}
            resolveComment={boundResolveComment}
            deleteComment={boundDeleteComment}
          />
        </TabsContent>

        {/* Proposal Tab */}
        {showProposalTab && (
          <TabsContent value="proposal">
            <ProposalTab
              inquiryId={id}
              initialContent={inquiry.proposal_content}
              initialDiscussions={(inquiry.proposal_discussions as TDiscussion[]) || []}
              proposalSubmittedAt={inquiry.proposal_submitted_at as string | null}
              isAdmin={isAdmin}
              isDfyOwner={isDfyOwner}
              proposalComments={proposalComments}
              currentUser={{
                id: profile.id,
                name: profile.name || profile.email || 'User',
              }}
              saveProposal={boundSaveProposal}
              submitProposal={boundSubmitProposal}
              addComment={boundAddProposalComment}
              resolveComment={boundResolveProposalComment}
              deleteComment={boundDeleteProposalComment}
            />
          </TabsContent>
        )}

        {/* My Version Tab (DFY only) */}
        {showMyVersionTab && (
          <TabsContent value="my-version">
            <MyVersionTab
              inquiryId={id}
              initialContent={inquiry.dfy_version_content}
              proposalContent={inquiry.proposal_content}
              proposalSubmittedAt={inquiry.proposal_submitted_at as string | null}
              saveContent={boundSaveDfyVersion}
              copyFromProposal={boundCopyProposalToDfyVersion}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
