export interface SelectionItem {
  type: 'blueprint' | 'case_study'
  id: string
  name: string
}

export interface TierSelection {
  blueprint_id: string
  blueprint_name: string
  tier_name: string
  setup_price: number
  monthly_price: number
  features: string[]
}

export interface CreateInquiryData {
  partner_name: string
  submission_type: 'closed' | 'proposal'
  deal_type: 'blueprint' | 'custom' | 'variation'
  form_path: 'A1' | 'A2' | 'A3' | 'B2' | 'B3'
  prospect_company_name?: string
  prospect_website?: string
  industry?: string
  blueprint_id?: string        // KEEP — set from first blueprint in selections for backwards compat
  selections?: SelectionItem[] // NEW — the full multi-select array
  form_data: Record<string, unknown>
  forward_emails?: string[]
}
