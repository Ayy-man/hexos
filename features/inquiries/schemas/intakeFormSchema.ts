import { z } from 'zod'

// Shared selection item schema
const selectionItemSchema = z.object({
  type: z.enum(['blueprint', 'case_study']),
  id: z.string().uuid(),
  name: z.string(),
})

// Step 1: Initial Questions
export const initialStepSchema = z.object({
  submission_type: z.enum(['closed', 'proposal']),
  partner_name: z.string().min(1, 'Partner name is required'),
})

// Branch A: Closed Deal Type Selection
export const closedDealTypeSchema = z.object({
  closed_deal_type: z.enum(['blueprint', 'custom', 'variation']),
})

// Branch B: Proposal Type Selection
export const proposalTypeSchema = z.object({
  proposal_type: z.enum(['blueprint', 'variation', 'custom']),
})

// Path A1: Closed Standard Blueprint
export const closedBlueprintSchema = z.object({
  prospect_company_name: z.string().min(1, 'Company name is required'),
  prospect_website: z.string().min(1, 'Website is required'),
  industry: z.string().min(1, 'Industry is required'),
  selections: z.array(selectionItemSchema).min(1, 'Select at least one blueprint or case study'),
  selected_tier_blueprint_id: z.string().nullable().optional(),
  selected_tier_name: z.string().optional(),
  selected_tier_price: z.number().optional(),
  selected_tier_monthly: z.number().optional(),
  selected_tier_features: z.array(z.string()).optional(),
  monthly_volume: z.string().min(1, 'Monthly volume is required'),
  current_tools: z.string().min(1, 'Current tools is required'),
  existing_crm: z.string().min(1, 'CRM information is required'),
  primary_goal: z.string().min(1, 'Primary goal is required'),
  additional_notes: z.string().min(1, 'Additional notes are required'),
})

// Path A2 & A3: Closed Custom/Variation (minimal fields)
export const closedCustomSchema = z.object({
  prospect_company_name: z.string().min(1, 'Company name is required'),
  selections: z.array(selectionItemSchema).optional(),
  additional_notes: z.string().min(1, 'Additional notes are required'),
})

// Path B2: Blueprint + Variation Proposal
export const variationProposalSchema = z.object({
  prospect_company_name: z.string().min(1, 'Company name is required'),
  prospect_website: z.string().min(1, 'Website is required'),
  industry: z.string().min(1, 'Industry is required'),
  selections: z.array(selectionItemSchema).min(1, 'Select at least one blueprint or case study'),
  selected_tier_blueprint_id: z.string().nullable().optional(),
  selected_tier_name: z.string().optional(),
  selected_tier_price: z.number().optional(),
  selected_tier_monthly: z.number().optional(),
  selected_tier_features: z.array(z.string()).optional(),
  variation_description: z.string().min(1, 'Variation description is required'),
  monthly_volume: z.string().min(1, 'Monthly volume is required'),
  current_tools: z.string().min(1, 'Current tools is required'),
  existing_crm: z.string().min(1, 'CRM information is required'),
  primary_goal: z.string().min(1, 'Primary goal is required'),
  special_notes: z.string().min(1, 'Special notes are required'),
})

// Path B3: Custom Proposal (full form)
export const customProposalSchema = z.object({
  // Section 1: Prospect & Relationship
  prospect_company_name: z.string().min(1, 'Company name is required'),
  prospect_website: z.string().min(1, 'Website is required'),
  industry: z.string().min(1, 'Industry is required'),
  build_preference: z.enum(['quick_win', 'full_build']),
  relationship_type: z.enum(['warm_referral', 'warm_outreach', 'cold_lead']),
  contact_role: z.enum(['founder', 'department_lead', 'assistant']),
  budget_indication: z.enum(['specific_number', 'general_range', 'no_budget']),
  urgency: z.enum(['asap', 'thirty_days', 'exploratory']),
  engagement_level: z.enum(['very_interested', 'passive']),
  problem_importance: z.enum(['business_critical', 'important', 'nice_to_have']),

  // Section 2: Process Overview
  departments_involved: z.array(z.string()).min(1, 'Select at least one department'),
  current_workflow: z.string().min(1, 'Current workflow is required'),
  main_challenges: z.string().min(1, 'Main challenges are required'),
  tasks_to_automate: z.string().min(1, 'Tasks to automate is required'),
  automation_goals: z.string().min(1, 'Automation goals are required'),

  // Section 3: Client Context
  current_tools_detailed: z.string().min(1, 'Current tools is required'),
  existing_automations: z.enum(['yes', 'no']),

  // Section 4: Budget & Timeline
  client_annual_revenue: z.string().min(1, 'Annual revenue is required'),
  project_tier: z.string().min(1, 'Project tier is required'),
  project_duration: z.enum(['one_time', 'ongoing']),
  go_live_date: z.string().min(1, 'Go-live date is required'),

  // Section 5: Support
  support_level: z.array(z.string()).min(1, 'Select at least one support option'),
  additional_notes: z.string().optional(),
})

// Forward Form (optional emails)
export const forwardFormSchema = z.object({
  forward_email_1: z.string().email().optional().or(z.literal('')),
  forward_email_2: z.string().email().optional().or(z.literal('')),
})

// Combined form data type
export type InitialStepData = z.infer<typeof initialStepSchema>
export type ClosedDealTypeData = z.infer<typeof closedDealTypeSchema>
export type ProposalTypeData = z.infer<typeof proposalTypeSchema>
export type ClosedBlueprintData = z.infer<typeof closedBlueprintSchema>
export type ClosedCustomData = z.infer<typeof closedCustomSchema>
export type VariationProposalData = z.infer<typeof variationProposalSchema>
export type CustomProposalData = z.infer<typeof customProposalSchema>
export type ForwardFormData = z.infer<typeof forwardFormSchema>

// Full form state
export interface IntakeFormState {
  // Step 1
  submission_type?: 'closed' | 'proposal'
  partner_name?: string

  // Branch selectors
  closed_deal_type?: 'blueprint' | 'custom' | 'variation'
  proposal_type?: 'blueprint' | 'variation' | 'custom'

  // Common fields
  prospect_company_name?: string
  prospect_website?: string
  industry?: string
  selections?: Array<{ type: 'blueprint' | 'case_study'; id: string; name: string }>
  selected_tier_blueprint_id?: string | null
  selected_tier_name?: string
  selected_tier_price?: number
  selected_tier_monthly?: number
  selected_tier_features?: string[]
  additional_notes?: string

  // Path-specific fields stored in form_data
  [key: string]: unknown
}

// Form path type
export type FormPath = 'A1' | 'A2' | 'A3' | 'B1' | 'B2' | 'B3'

// Helper to determine form path
export function getFormPath(
  submissionType?: string,
  dealType?: string,
  proposalType?: string
): FormPath | null {
  if (submissionType === 'closed') {
    if (dealType === 'blueprint') return 'A1'
    if (dealType === 'custom') return 'A2'
    if (dealType === 'variation') return 'A3'
  }
  if (submissionType === 'proposal') {
    if (proposalType === 'blueprint') return 'B1'
    if (proposalType === 'variation') return 'B2'
    if (proposalType === 'custom') return 'B3'
  }
  return null
}
