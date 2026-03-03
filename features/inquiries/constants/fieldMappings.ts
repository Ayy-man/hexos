// Field lists for AI Copilot context
export const FIELD_LISTS: Record<string, string[]> = {
  A1: [
    'prospect_company_name',
    'prospect_website',
    'industry',
    'selections',
    'monthly_volume',
    'current_tools',
    'existing_crm',
    'primary_goal',
    'additional_notes',
  ],
  A2: ['prospect_company_name', 'additional_notes'],
  A3: ['prospect_company_name', 'selections', 'additional_notes'],
  B2: [
    'prospect_company_name',
    'prospect_website',
    'industry',
    'selections',
    'variation_description',
    'monthly_volume',
    'current_tools',
    'existing_crm',
    'primary_goal',
    'special_notes',
  ],
  B3: [
    'prospect_company_name',
    'prospect_website',
    'industry',
    'build_preference',
    'relationship_type',
    'contact_role',
    'budget_indication',
    'urgency',
    'engagement_level',
    'problem_importance',
    'departments_involved',
    'current_workflow',
    'main_challenges',
    'tasks_to_automate',
    'automation_goals',
    'current_tools_detailed',
    'existing_automations',
    'client_annual_revenue',
    'project_tier',
    'project_duration',
    'go_live_date',
    'support_level',
    'additional_notes',
  ],
}

// Primary goal options (generic for now)
export const PRIMARY_GOAL_OPTIONS = [
  'Increase lead conversion rate',
  'Reduce response time',
  'Automate repetitive tasks',
  'Improve customer engagement',
  'Scale operations without hiring',
  'Reduce no-shows / cancellations',
  'Reactivate dormant customers',
  'Build online reputation',
  'Other',
]

// Department options
export const DEPARTMENT_OPTIONS = [
  'Sales',
  'Customer Support',
  'HR',
  'Finance',
  'Operations',
  'IT',
  'Marketing',
  'Other',
]

// Support level options
export const SUPPORT_LEVEL_OPTIONS = [
  'One-Time Training Session',
  'Ongoing Maintenance & Updates',
  'Long-Term Support & Consulting',
  'No Support Needed',
]

// Revenue options
export const REVENUE_OPTIONS = [
  { value: 'na', label: 'N/A' },
  { value: '0-50k', label: '$0 - $50,000' },
  { value: '50k-250k', label: '$50,000 - $250,000' },
  { value: '250k-750k', label: '$250,000 - $750,000' },
  { value: '750k-1.5m', label: '$750,000 - $1,500,000' },
  { value: '1.5m-5m', label: '$1,500,000 - $5,000,000' },
  { value: '5m+', label: '$5,000,000+' },
]

// Project tier options
export const PROJECT_TIER_OPTIONS = [
  { value: 'standard', label: 'Standard Project: <$3,000' },
  { value: 'business', label: 'Business-Class Project: $3,000 - $5,000' },
  { value: 'first_class', label: 'First-Class Project: $5,000 - $15,000' },
  { value: 'enterprise', label: 'Enterprise-Level Project: $15,000+' },
  { value: 'unsure', label: "We Aren't Sure Yet" },
]

// Path labels for display
export const PATH_LABELS: Record<string, string> = {
  A1: 'Closed Standard Blueprint',
  A2: 'Closed Custom Deal',
  A3: 'Closed Blueprint + Variation',
  B1: 'Standard Blueprint Proposal',
  B2: 'Blueprint + Variation Proposal',
  B3: 'Custom Deal Proposal',
}
