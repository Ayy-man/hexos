export interface CreateInquiryData {
  partner_name: string
  submission_type: 'closed' | 'proposal'
  deal_type: 'blueprint' | 'custom' | 'variation'
  form_path: 'A1' | 'A2' | 'A3' | 'B2' | 'B3'
  prospect_company_name?: string
  prospect_website?: string
  industry?: string
  blueprint_id?: string
  form_data: Record<string, unknown>
  forward_emails?: string[]
}
