'use server'

import { revalidatePath } from 'next/cache'
import {
  getCachedBrief,
  saveBriefExtraction,
  invalidateBriefCache,
  getInputHash,
  type BriefSourceType,
  type BriefExtraction,
  type RedactedBrief,
} from '@/lib/api/brief-extractions'
import { getOpportunity } from '@/lib/api/project-invitations'

// ============================================================================
// BRIEF GENERATION ACTIONS
// ============================================================================

interface GenerateBriefParams {
  sourceType: BriefSourceType
  sourceId: string
  sourceData: Record<string, unknown>
}

interface GenerateBriefApiResponse {
  success: boolean
  brief?: RedactedBrief
  redactedText?: string
  tokensUsed?: number
  generationTimeMs?: number
  error?: string
}

/**
 * Generate a brief for a source, using cache if available.
 *
 * 1. Generate input hash from sourceData
 * 2. Check cache for existing brief
 * 3. If cached and hash matches, return cached
 * 4. Otherwise, call AI endpoint and save to cache
 */
export async function generateBriefAction(
  params: GenerateBriefParams
): Promise<BriefExtraction> {
  const { sourceType, sourceId, sourceData } = params

  // 1. Generate input hash
  const inputHash = await getInputHash(sourceData)

  // 2. Check cache
  const cached = await getCachedBrief(sourceType, sourceId)

  // 3. If cached and hash matches, return cached
  if (cached && cached.input_hash === inputHash) {
    return cached
  }

  // 4. Call AI endpoint to generate new brief
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const response = await fetch(`${baseUrl}/api/generate-brief`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sourceType,
      sourceData,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `Failed to generate brief (${response.status})`)
  }

  const data = (await response.json()) as GenerateBriefApiResponse

  if (!data.success || !data.brief || !data.redactedText) {
    throw new Error(data.error || 'Failed to generate brief')
  }

  // 5. Save to cache
  const extraction = await saveBriefExtraction({
    sourceType,
    sourceId,
    briefContent: data.brief,
    redactedBrief: data.redactedText,
    inputHash,
    tokensUsed: data.tokensUsed,
    generationTimeMs: data.generationTimeMs,
  })

  return extraction
}

/**
 * Force regeneration of a brief (invalidates cache first).
 * Used by admins to refresh stale briefs.
 */
export async function regenerateBriefAction(
  params: GenerateBriefParams
): Promise<BriefExtraction> {
  const { sourceType, sourceId, sourceData } = params

  // 1. Invalidate existing cache
  await invalidateBriefCache(sourceType, sourceId)

  // 2. Generate fresh brief
  const extraction = await generateBriefAction(params)

  // 3. Revalidate relevant paths
  if (sourceType === 'opportunity') {
    revalidatePath('/opportunities')
    revalidatePath(`/opportunities/${sourceId}`)
  } else if (sourceType === 'project') {
    revalidatePath('/projects')
    revalidatePath(`/projects/${sourceId}`)
  } else if (sourceType === 'inquiry') {
    revalidatePath('/inquiries')
    revalidatePath(`/inquiries/${sourceId}`)
  }

  return extraction
}

/**
 * Get brief for an opportunity, generating if necessary.
 *
 * This action:
 * 1. Fetches opportunity data
 * 2. Fetches linked project/inquiry data if available
 * 3. Compiles source data
 * 4. Calls generateBriefAction
 */
export async function getBriefForOpportunityAction(
  opportunityId: string
): Promise<BriefExtraction | null> {
  // 1. Get opportunity data
  const opportunity = await getOpportunity(opportunityId)

  if (!opportunity) {
    return null
  }

  // 2. Compile source data from opportunity
  const sourceData: Record<string, unknown> = {
    title: opportunity.title,
    description: opportunity.description,
    requirements: opportunity.requirements,
    techStack: opportunity.tech_stack,
    complexity: opportunity.complexity,
    estimatedHours: opportunity.estimated_hours,
    // Note: project link provides additional context but may have sensitive data
    // The AI will handle redaction
  }

  // Add project info if linked (for context, AI will redact sensitive parts)
  if (opportunity.project) {
    sourceData.projectName = opportunity.project.project_name
    sourceData.clientBusiness = opportunity.project.client_name // AI will redact this
  }

  // Filter out null/undefined values
  const cleanedSourceData = Object.fromEntries(
    Object.entries(sourceData).filter(([, v]) => v != null && v !== '')
  )

  // 3. Generate brief (uses cache if available)
  try {
    const extraction = await generateBriefAction({
      sourceType: 'opportunity',
      sourceId: opportunityId,
      sourceData: cleanedSourceData,
    })
    return extraction
  } catch (error) {
    console.error('[getBriefForOpportunityAction] Failed to generate brief:', error)
    // Return null instead of throwing to allow graceful degradation
    return null
  }
}
