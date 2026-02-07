import { createClient } from '@/lib/supabase/server'

// Re-export types from client-safe module
export type { BriefSourceType, RedactedBrief, BriefExtraction } from './brief-extraction-types'
import type { BriefSourceType, RedactedBrief, BriefExtraction } from './brief-extraction-types'

// ============================================================================
// BRIEF EXTRACTION CACHING
// ============================================================================

/**
 * Get cached brief if exists and not expired
 */
export async function getCachedBrief(
  sourceType: BriefSourceType,
  sourceId: string
): Promise<BriefExtraction | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('brief_extractions')
    .select('*')
    .eq('source_type', sourceType)
    .eq('source_id', sourceId)
    .gt('expires_at', new Date().toISOString()) // Only valid (non-expired) briefs
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // PGRST116 = no rows found, which is fine for cache miss
  if (error && error.code !== 'PGRST116') throw error

  return data as BriefExtraction | null
}

/**
 * Save AI-generated brief to cache
 */
export async function saveBriefExtraction(params: {
  sourceType: BriefSourceType
  sourceId: string
  briefContent: RedactedBrief
  redactedBrief: string
  inputHash?: string
  tokensUsed?: number
  generationTimeMs?: number
  expiresInDays?: number
}): Promise<BriefExtraction> {
  const supabase = await createClient()

  // Calculate expiry (default 7 days)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + (params.expiresInDays || 7))

  const { data, error } = await supabase
    .from('brief_extractions')
    .insert({
      source_type: params.sourceType,
      source_id: params.sourceId,
      brief_content: params.briefContent,
      redacted_brief: params.redactedBrief,
      input_hash: params.inputHash || null,
      tokens_used: params.tokensUsed || null,
      generation_time_ms: params.generationTimeMs || null,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return data as BriefExtraction
}

/**
 * Invalidate (delete) cached briefs for a source
 * Call this when the source data changes to force regeneration
 */
export async function invalidateBriefCache(
  sourceType: BriefSourceType,
  sourceId: string
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('brief_extractions')
    .delete()
    .eq('source_type', sourceType)
    .eq('source_id', sourceId)

  if (error) throw error
}

/**
 * Generate SHA256 hash for cache key
 * Used to detect if source data changed (different hash = stale cache)
 */
export async function getInputHash(data: object): Promise<string> {
  const jsonString = JSON.stringify(data)
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(jsonString)

  // Use Web Crypto API (available in Node.js 15+ and all modern browsers)
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)

  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  return hashHex
}
