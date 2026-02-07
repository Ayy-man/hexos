// Types for brief extractions that can be imported by client components
// This file intentionally does NOT import from lib/supabase/server to avoid server-only dependencies

export type BriefSourceType = 'project' | 'inquiry' | 'blueprint' | 'case_study' | 'opportunity'

export interface RedactedBrief {
  industry: string
  problem_type: string
  scope_summary: string
  tech_stack: string[]
  complexity: 'low' | 'medium' | 'high'
  estimated_duration: string
  deliverables_overview: string[]
  special_requirements?: string
  redacted_fields: string[]
}

export interface BriefExtraction {
  id: string
  source_type: BriefSourceType
  source_id: string
  brief_content: RedactedBrief
  redacted_brief: string
  model_used: string
  input_hash: string | null
  tokens_used: number | null
  generation_time_ms: number | null
  created_at: string
  expires_at: string | null
}
