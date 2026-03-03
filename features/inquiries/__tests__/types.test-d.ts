// Type-level test for SelectionItem and CreateInquiryData
// This file verifies the type contracts that Plan 02 and Plan 03 depend on.
// Run: npx tsc --noEmit

import type { SelectionItem, CreateInquiryData } from '../types'

// SelectionItem must have type, id, name fields
const blueprint: SelectionItem = {
  type: 'blueprint',
  id: 'abc-123',
  name: 'My Blueprint',
}

const caseStudy: SelectionItem = {
  type: 'case_study',
  id: 'xyz-456',
  name: 'My Case Study',
}

// CreateInquiryData must accept selections?: SelectionItem[]
const data: CreateInquiryData = {
  partner_name: 'Acme',
  submission_type: 'proposal',
  deal_type: 'blueprint',
  form_path: 'A1',
  form_data: {},
  selections: [blueprint, caseStudy],
}

// Backwards compat: blueprint_id must still be optional field
const dataWithBlueprintId: CreateInquiryData = {
  partner_name: 'Acme',
  submission_type: 'closed',
  deal_type: 'blueprint',
  form_path: 'B2',
  form_data: {},
  blueprint_id: 'bp-123',
}

// Both exports must be present (used as type assertions)
export type { SelectionItem, CreateInquiryData }
