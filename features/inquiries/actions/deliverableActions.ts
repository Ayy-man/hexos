'use server'

import { revalidatePath } from 'next/cache'
import {
  createProposalDeliverable,
  updateProposalDeliverable,
  deleteProposalDeliverable,
  markDeliverableRemoved,
  revertDeliverable,
  reviewDeliverable,
  bulkApproveDeliverables,
  bulkCreateDeliverablesFromAI,
  bulkCreateFromBlueprintTier,
  addDeliverableComment,
  deleteDeliverableComment,
  acceptCounter,
  rejectCounter,
  getDeliverableHistory,
  type CreateDeliverableInput,
  type UpdateDeliverableInput,
  type ProposalDeliverable,
  type DeliverableComment,
  type DeliverableHistoryEntry,
} from '@/lib/api/proposal-deliverables'
import { updateDeliverablesStatus, type DeliverablesNegotiationStatus } from '@/lib/api/inquiries'
import { extractDeliverablesSection } from '@/features/inquiries/utils/plateToText'

// ============================================
// AI Parsing - OpenRouter Integration
// ============================================

const DELIVERABLES_SYSTEM_PROMPT = `You are an AI assistant that extracts deliverables from automation project proposals.

Your task is to analyze proposal text and extract each distinct deliverable, service, or feature being offered.

## What to Extract

For each deliverable found, provide:
1. **name**: A short, descriptive title (e.g., "CRM Integration", "Email Automation", "Instagram DM Bot")
2. **description**: A brief description of what's included (1-2 sentences)
3. **price**: The price as a number. IMPORTANT: Look carefully for prices in both the deliverables AND pricing sections.
4. **sourceText**: The exact text snippet from the proposal that describes this deliverable
5. **confidence**: Your confidence score (0.0-1.0) based on how clearly the deliverable is defined

## CRITICAL: Price Extraction Rules

1. ALWAYS look for prices - they may be in a separate "Pricing" section below the deliverables
2. Common price formats to find: "$X,XXX", "$XXX/month", "$X,XXX setup", "X,XXX USD", etc.
3. If a package/tier has one total price (e.g., "Pro Package: $2,500"), DISTRIBUTE the price across items:
   - Put the FULL package price on the FIRST deliverable in that package
   - Put null on subsequent items in that package
4. If deliverables have individual line-item prices, capture each one
5. Prefer setup/one-time prices over monthly prices
6. If you see ANY dollar amounts in the text, try to match them to deliverables

## General Rules

1. Extract ALL distinct deliverables, even if bundled together
2. If items are grouped under a tier (e.g., "Pro Package includes:"), extract each item separately
3. Do NOT fabricate information - only extract what's explicitly stated
4. Be comprehensive - capture everything that could be a deliverable
5. Confidence scoring:
   - 0.9-1.0: Clear deliverable with name and description
   - 0.7-0.8: Implied deliverable, some interpretation needed
   - 0.5-0.6: Vague or partial information`

interface ParsedDeliverable {
  name: string
  description: string
  price?: number
  sourceText: string
  confidence: number
}

async function parseDeliverablesWithAI(proposalContent: unknown): Promise<ParsedDeliverable[]> {
  // Check API key
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('[parseDeliverables] OPENROUTER_API_KEY not configured')
    throw new Error('OpenRouter API key not configured')
  }

  // Check proposal content
  if (!proposalContent) {
    console.error('[parseDeliverables] proposalContent is null/undefined')
    throw new Error('No proposal content to parse - admin must write proposal first')
  }

  // Extract text from Plate.js content
  const deliverablesText = extractDeliverablesSection(proposalContent)
  console.log('[parseDeliverables] Extracted text length:', deliverablesText?.length || 0)

  if (!deliverablesText || deliverablesText.length < 10) {
    console.error('[parseDeliverables] Extracted text too short:', deliverablesText)
    throw new Error('Proposal is empty or too short to extract deliverables')
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://app.example.com',
      'X-Title': 'Deliverables Parser',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-3.5-haiku',
      messages: [
        { role: 'system', content: DELIVERABLES_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Please extract all deliverables from the following proposal text:\n\n${deliverablesText}`,
        },
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'extracted_deliverables',
            description: 'Report the extracted deliverables from the proposal',
            parameters: {
              type: 'object',
              properties: {
                deliverables: {
                  type: 'array',
                  description: 'Array of extracted deliverables',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', description: 'Short descriptive title' },
                      description: { type: 'string', description: 'Brief description of what is included' },
                      price: { type: ['number', 'null'], description: 'Price if mentioned, otherwise null' },
                      sourceText: { type: 'string', description: 'Original text snippet from the proposal' },
                      confidence: { type: 'number', description: 'Confidence score 0.0-1.0' },
                    },
                    required: ['name', 'description', 'sourceText', 'confidence'],
                  },
                },
              },
              required: ['deliverables'],
            },
          },
        },
      ],
      tool_choice: { type: 'function', function: { name: 'extracted_deliverables' } },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[parseDeliverables] OpenRouter error:', response.status, errorText)

    if (response.status === 401) {
      throw new Error('Invalid OpenRouter API key')
    }
    if (response.status === 402) {
      throw new Error('OpenRouter payment required - check account credits')
    }
    if (response.status === 429) {
      throw new Error('OpenRouter rate limit exceeded - try again later')
    }
    throw new Error(`AI service error (${response.status})`)
  }

  const data = await response.json()
  console.log('[parseDeliverables] OpenRouter response received')

  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0]
  if (!toolCall || toolCall.function.name !== 'extracted_deliverables') {
    console.error('[parseDeliverables] No tool call in response:', JSON.stringify(data, null, 2))
    throw new Error('AI did not return structured deliverables')
  }

  let parsed: { deliverables: ParsedDeliverable[] }
  try {
    parsed = JSON.parse(toolCall.function.arguments)
  } catch (parseErr) {
    console.error('[parseDeliverables] Failed to parse tool arguments:', toolCall.function.arguments)
    throw new Error('Failed to parse AI response')
  }

  const deliverables: ParsedDeliverable[] = parsed.deliverables || []
  console.log('[parseDeliverables] Extracted', deliverables.length, 'deliverables')

  // Clean and validate
  return deliverables
    .filter((d) => d.name && d.name.trim().length > 0)
    .map((d) => ({
      name: d.name.trim(),
      description: d.description?.trim() || '',
      price: typeof d.price === 'number' ? d.price : undefined,
      sourceText: d.sourceText?.trim() || '',
      confidence: typeof d.confidence === 'number' ? d.confidence : 0.5,
    }))
}

// ============================================
// AI Parsing Actions
// ============================================

export async function triggerParseDeliverablesAction(
  inquiryId: string,
  proposalContent: unknown
): Promise<{ deliverables?: ProposalDeliverable[]; error?: string }> {
  console.log('[triggerParse] Starting for inquiry:', inquiryId)

  // Update status to parsing
  await updateDeliverablesStatus(inquiryId, 'parsing')

  try {
    // Call OpenRouter directly (no internal API route needed)
    const parsedDeliverables = await parseDeliverablesWithAI(proposalContent)

    if (!parsedDeliverables.length) {
      // No deliverables found - return empty array, let user add manually
      console.log('[triggerParse] No deliverables found in proposal')
      await updateDeliverablesStatus(inquiryId, 'none')
      revalidatePath(`/inquiries/${inquiryId}`)
      return { deliverables: [] }
    }

    console.log('[triggerParse] Creating', parsedDeliverables.length, 'deliverables in DB')

    // Create the deliverables in the database
    const deliverables = await bulkCreateDeliverablesFromAI(
      inquiryId,
      parsedDeliverables
    )

    console.log('[triggerParse] Successfully created deliverables')

    // Update status to dfy_editing
    await updateDeliverablesStatus(inquiryId, 'dfy_editing')

    revalidatePath(`/inquiries/${inquiryId}`)

    return { deliverables }
  } catch (error) {
    // Log full error details server-side for debugging
    console.error('[triggerParse] Error:', {
      inquiryId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    // Reset status on error
    await updateDeliverablesStatus(inquiryId, 'none')
    // Return user-friendly message (preserves specific error messages from parseDeliverablesWithAI)
    return { error: error instanceof Error ? error.message : 'Failed to extract deliverables' }
  }
}

// ============================================
// CRUD Actions
// ============================================

export async function createDeliverableAction(
  input: CreateDeliverableInput
): Promise<ProposalDeliverable> {
  const deliverable = await createProposalDeliverable(input)
  revalidatePath(`/inquiries/${input.inquiry_id}`)
  return deliverable
}

export async function updateDeliverableAction(
  deliverableId: string,
  inquiryId: string,
  input: UpdateDeliverableInput
): Promise<ProposalDeliverable> {
  const deliverable = await updateProposalDeliverable(deliverableId, input)
  revalidatePath(`/inquiries/${inquiryId}`)
  return deliverable
}

export async function deleteDeliverableAction(
  deliverableId: string,
  inquiryId: string
): Promise<void> {
  await deleteProposalDeliverable(deliverableId)
  revalidatePath(`/inquiries/${inquiryId}`)
}

export async function markDeliverableRemovedAction(
  deliverableId: string,
  inquiryId: string
): Promise<ProposalDeliverable> {
  const deliverable = await markDeliverableRemoved(deliverableId)
  revalidatePath(`/inquiries/${inquiryId}`)
  return deliverable
}

export async function revertDeliverableAction(
  deliverableId: string,
  inquiryId: string
): Promise<ProposalDeliverable> {
  const deliverable = await revertDeliverable(deliverableId)
  revalidatePath(`/inquiries/${inquiryId}`)
  return deliverable
}

// ============================================
// Blueprint Tier Actions
// ============================================

export async function addFromBlueprintTierAction(
  inquiryId: string,
  blueprintId: string,
  tierName: string,
  tierPrice: number,
  features: string[]
): Promise<ProposalDeliverable[]> {
  const deliverables = await bulkCreateFromBlueprintTier(
    inquiryId,
    blueprintId,
    tierName,
    tierPrice,
    features
  )
  revalidatePath(`/inquiries/${inquiryId}`)
  return deliverables
}

// ============================================
// Workflow Actions (DFY)
// ============================================

export async function submitDeliverablesForReviewAction(
  inquiryId: string
): Promise<void> {
  await updateDeliverablesStatus(inquiryId, 'dfy_submitted')
  revalidatePath(`/inquiries/${inquiryId}`)
}

export async function withdrawDeliverablesSubmissionAction(
  inquiryId: string
): Promise<void> {
  await updateDeliverablesStatus(inquiryId, 'dfy_editing')
  revalidatePath(`/inquiries/${inquiryId}`)
}

// ============================================
// Review Actions (INT)
// ============================================

export async function startReviewAction(inquiryId: string): Promise<void> {
  await updateDeliverablesStatus(inquiryId, 'int_reviewing')
  revalidatePath(`/inquiries/${inquiryId}`)
}

export async function reviewDeliverableAction(
  deliverableId: string,
  inquiryId: string,
  decision: 'approved' | 'rejected' | 'countered',
  counterName?: string,
  counterDescription?: string,
  counterPrice?: number,
  counterNote?: string
): Promise<ProposalDeliverable> {
  const deliverable = await reviewDeliverable(
    deliverableId,
    decision,
    counterName,
    counterDescription,
    counterPrice,
    counterNote
  )
  revalidatePath(`/inquiries/${inquiryId}`)
  return deliverable
}

export async function bulkApproveDeliverablesAction(
  deliverableIds: string[],
  inquiryId: string
): Promise<void> {
  await bulkApproveDeliverables(deliverableIds)
  revalidatePath(`/inquiries/${inquiryId}`)
}

export async function finalApproveDeliverablesAction(
  inquiryId: string
): Promise<void> {
  await updateDeliverablesStatus(inquiryId, 'approved')
  revalidatePath(`/inquiries/${inquiryId}`)
}

export async function sendBackForRevisionAction(
  inquiryId: string
): Promise<void> {
  await updateDeliverablesStatus(inquiryId, 'needs_revision')
  revalidatePath(`/inquiries/${inquiryId}`)
}

// ============================================
// Comment Actions
// ============================================

export async function addDeliverableCommentAction(
  deliverableId: string,
  inquiryId: string,
  content: string
): Promise<DeliverableComment> {
  const comment = await addDeliverableComment(deliverableId, content)
  revalidatePath(`/inquiries/${inquiryId}`)
  return comment
}

export async function deleteDeliverableCommentAction(
  commentId: string,
  inquiryId: string
): Promise<void> {
  await deleteDeliverableComment(commentId)
  revalidatePath(`/inquiries/${inquiryId}`)
}

// ============================================
// Status Update Action
// ============================================

export async function updateDeliverablesStatusAction(
  inquiryId: string,
  status: DeliverablesNegotiationStatus
): Promise<void> {
  await updateDeliverablesStatus(inquiryId, status)
  revalidatePath(`/inquiries/${inquiryId}`)
}

// ============================================
// Counter Response Actions (DFY)
// ============================================

export async function acceptCounterAction(
  deliverableId: string,
  inquiryId: string
): Promise<ProposalDeliverable> {
  const deliverable = await acceptCounter(deliverableId)
  revalidatePath(`/inquiries/${inquiryId}`)
  return deliverable
}

export async function rejectCounterAction(
  deliverableId: string,
  inquiryId: string,
  reason?: string
): Promise<ProposalDeliverable> {
  const deliverable = await rejectCounter(deliverableId, reason)
  revalidatePath(`/inquiries/${inquiryId}`)
  return deliverable
}

// ============================================
// History Actions
// ============================================

export async function getDeliverableHistoryAction(
  deliverableId: string
): Promise<DeliverableHistoryEntry[]> {
  return getDeliverableHistory(deliverableId)
}
