import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAuth, getProfile } from '@/lib/auth/guards'
import { getInquiry } from '@/lib/api/inquiries'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Building2, Calendar, User, Mail, Globe, FileText } from 'lucide-react'
import { PATH_LABELS } from '@/features/inquiries/constants/fieldMappings'

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

  const formData = (inquiry.form_data || {}) as Record<string, unknown>

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
            <Badge className={STATUS_COLORS[inquiry.status] || STATUS_COLORS.new}>
              {inquiry.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {PATH_LABELS[inquiry.form_path] || inquiry.form_path} &bull;{' '}
            {inquiry.submission_type === 'closed' ? 'Closed Deal' : 'Proposal Request'}
          </p>
        </div>
      </div>

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
        </div>
      </div>
    </div>
  )
}
