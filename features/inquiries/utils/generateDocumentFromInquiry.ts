import { PATH_LABELS } from '../constants/fieldMappings'

// Field display names
const FIELD_LABELS: Record<string, string> = {
  partner_name: "Arbitrage Partner's Name",
  prospect_company_name: "Prospect's Company Name",
  prospect_website: "Prospect's Website",
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
  current_workflow: 'Current Workflow / Paste your workflow, upload a diagram, or share a Google Doc link',
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
  blueprint_name: 'Selected Blueprint',
}

// Group fields into sections
const FIELD_SECTIONS: Record<string, string[]> = {
  'Contact Information': ['partner_name'],
  'Prospect Details': ['prospect_company_name', 'prospect_website', 'industry'],
  'Blueprint Selection': ['blueprint_name'],
  'Project Scope': [
    'current_workflow',
    'main_challenges',
    'tasks_to_automate',
    'automation_goals',
    'current_tools',
    'current_tools_detailed',
    'existing_automations',
    'existing_crm',
  ],
  'Business Context': [
    'monthly_volume',
    'departments_involved',
    'client_annual_revenue',
  ],
  'Engagement Details': [
    'relationship_type',
    'contact_role',
    'engagement_level',
    'problem_importance',
  ],
  'Project Parameters': [
    'budget_indication',
    'urgency',
    'project_tier',
    'project_duration',
    'go_live_date',
    'support_level',
    'build_preference',
  ],
  'Variations & Customizations': [
    'variation_description',
    'special_notes',
    'primary_goal',
  ],
  'Additional Notes': ['additional_notes'],
  'Forwarding': ['forward_email_1', 'forward_email_2'],
}

interface InquiryData {
  id: string
  partner_name: string
  prospect_company_name: string | null
  form_path: string
  submission_type: string
  created_at: string
  form_data: Record<string, unknown>
  blueprint?: { name: string } | null
}

export function generateDocumentFromInquiry(inquiry: InquiryData): unknown[] {
  const formData = inquiry.form_data || {}
  const nodes: unknown[] = []

  // Title
  const title = inquiry.prospect_company_name || 'Unnamed Prospect'
  const formType = PATH_LABELS[inquiry.form_path] || inquiry.form_path
  const submissionType = inquiry.submission_type === 'closed' ? 'Closed Deal' : 'Proposal Request'

  nodes.push({
    type: 'h1',
    children: [{ text: `📋 ${title} - ${formType}` }],
  })

  // Submission metadata
  const submittedDate = new Date(inquiry.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  nodes.push({
    type: 'p',
    children: [
      { text: 'Submission ID: ', bold: true },
      { text: inquiry.id.slice(0, 8), code: true },
    ],
  })

  nodes.push({
    type: 'p',
    children: [
      { text: 'Submitted: ', bold: true },
      { text: submittedDate },
      { text: ' • ' },
      { text: submissionType, bold: true },
    ],
  })

  nodes.push({
    type: 'p',
    children: [{ text: '' }],
  })

  // Add blueprint name to formData if present
  const extendedFormData = { ...formData }
  if (inquiry.blueprint?.name) {
    extendedFormData.blueprint_name = inquiry.blueprint.name
  }

  // Render each section
  for (const [sectionName, fields] of Object.entries(FIELD_SECTIONS)) {
    const sectionFields = fields.filter((field) => {
      const value = extendedFormData[field]
      if (!value) return false
      if (Array.isArray(value) && value.length === 0) return false
      if (typeof value === 'string' && !value.trim()) return false
      return true
    })

    if (sectionFields.length === 0) continue

    // Section heading
    nodes.push({
      type: 'h2',
      children: [{ text: `👤 ${sectionName}` }],
    })

    // Fields in section
    for (const field of sectionFields) {
      const value = extendedFormData[field]
      const label = FIELD_LABELS[field] || field.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())

      const displayValue = Array.isArray(value) ? value.join(', ') : String(value)

      // Field label
      nodes.push({
        type: 'h3',
        children: [{ text: `📝 ${label}` }],
      })

      // Field value - check if it's a URL
      if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
        nodes.push({
          type: 'p',
          children: [
            {
              type: 'a',
              url: value,
              children: [{ text: value }],
            },
          ],
        })
      } else {
        nodes.push({
          type: 'p',
          children: [{ text: displayValue }],
        })
      }

      // Spacing
      nodes.push({
        type: 'p',
        children: [{ text: '' }],
      })
    }
  }

  // Handle any fields not in sections
  const allSectionFields = Object.values(FIELD_SECTIONS).flat()
  const excludedFields = ['submission_type', 'closed_deal_type', 'proposal_type', 'partner_name']
  const remainingFields = Object.keys(extendedFormData).filter(
    (key) => !allSectionFields.includes(key) && !excludedFields.includes(key) && extendedFormData[key]
  )

  if (remainingFields.length > 0) {
    nodes.push({
      type: 'h2',
      children: [{ text: '📋 Other Information' }],
    })

    for (const field of remainingFields) {
      const value = extendedFormData[field]
      if (!value || (Array.isArray(value) && value.length === 0)) continue

      const label = FIELD_LABELS[field] || field.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
      const displayValue = Array.isArray(value) ? value.join(', ') : String(value)

      nodes.push({
        type: 'h3',
        children: [{ text: `📝 ${label}` }],
      })

      nodes.push({
        type: 'p',
        children: [{ text: displayValue }],
      })

      nodes.push({
        type: 'p',
        children: [{ text: '' }],
      })
    }
  }

  return nodes
}
