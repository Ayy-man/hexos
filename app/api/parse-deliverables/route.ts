import { NextRequest, NextResponse } from 'next/server'
import { extractDeliverablesSection } from '@/features/inquiries/utils/plateToText'

const SYSTEM_PROMPT = `You are an AI assistant that extracts deliverables from automation project proposals.

Your task is to analyze proposal text and extract each distinct deliverable, service, or feature being offered.

## What to Extract

For each deliverable found, provide:
1. **name**: A short, descriptive title (e.g., "CRM Integration", "Email Automation", "Instagram DM Bot")
2. **description**: A brief description of what's included (1-2 sentences)
3. **price**: The price if mentioned, as a number. If no price, use null.
4. **sourceText**: The exact text snippet from the proposal that describes this deliverable
5. **confidence**: Your confidence score (0.0-1.0) based on how clearly the deliverable is defined

## Rules

1. Extract ALL distinct deliverables, even if bundled together
2. If items are grouped under a tier (e.g., "Pro Package includes:"), extract each item separately
3. For pricing:
   - If a single price covers multiple items, put the price only on the first item
   - If items have individual prices, capture each price
   - Use setup price if both setup and monthly are mentioned
4. Do NOT fabricate information - only extract what's explicitly stated
5. Be comprehensive - capture everything that could be a deliverable
6. Confidence scoring:
   - 0.9-1.0: Clear deliverable with name and description
   - 0.7-0.8: Implied deliverable, some interpretation needed
   - 0.5-0.6: Vague or partial information

## Examples

Input: "Our Instagram DM Automation package ($2,500) includes: AI-powered response system, Lead qualification flows, CRM sync integration"

Output:
[
  { "name": "Instagram DM Automation", "description": "AI-powered Instagram DM automation package", "price": 2500, "sourceText": "Our Instagram DM Automation package ($2,500)", "confidence": 0.95 },
  { "name": "AI Response System", "description": "AI-powered automatic response system for DMs", "price": null, "sourceText": "AI-powered response system", "confidence": 0.85 },
  { "name": "Lead Qualification Flows", "description": "Automated flows to qualify leads through DM conversations", "price": null, "sourceText": "Lead qualification flows", "confidence": 0.85 },
  { "name": "CRM Sync Integration", "description": "Integration to sync lead data with CRM", "price": null, "sourceText": "CRM sync integration", "confidence": 0.85 }
]`

interface ParsedDeliverable {
  name: string
  description: string
  price: number | null
  sourceText: string
  confidence: number
}

export async function POST(req: NextRequest) {
  try {
    const { proposalContent } = await req.json()

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 }
      )
    }

    if (!proposalContent) {
      return NextResponse.json(
        { error: 'No proposal content provided' },
        { status: 400 }
      )
    }

    // Extract the deliverables section from the proposal
    const deliverablesText = extractDeliverablesSection(proposalContent)

    if (!deliverablesText || deliverablesText.length < 10) {
      return NextResponse.json(
        { error: 'Could not extract deliverables section from proposal' },
        { status: 400 }
      )
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://hexos.app',
        'X-Title': 'hexOS Deliverables Parser',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-haiku',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
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
              description:
                'Report the extracted deliverables from the proposal',
              parameters: {
                type: 'object',
                properties: {
                  deliverables: {
                    type: 'array',
                    description: 'Array of extracted deliverables',
                    items: {
                      type: 'object',
                      properties: {
                        name: {
                          type: 'string',
                          description: 'Short descriptive title',
                        },
                        description: {
                          type: 'string',
                          description: 'Brief description of what is included',
                        },
                        price: {
                          type: ['number', 'null'],
                          description: 'Price if mentioned, otherwise null',
                        },
                        sourceText: {
                          type: 'string',
                          description:
                            'Original text snippet from the proposal',
                        },
                        confidence: {
                          type: 'number',
                          description: 'Confidence score 0.0-1.0',
                        },
                      },
                      required: [
                        'name',
                        'description',
                        'sourceText',
                        'confidence',
                      ],
                    },
                  },
                },
                required: ['deliverables'],
              },
            },
          },
        ],
        tool_choice: {
          type: 'function',
          function: { name: 'extracted_deliverables' },
        },
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenRouter error:', response.status, error)

      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Invalid OpenRouter API key' },
          { status: 401 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to parse deliverables' },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0]
    if (!toolCall || toolCall.function.name !== 'extracted_deliverables') {
      // Fallback: try to parse from content if no tool call
      console.warn('No tool call in response, attempting content parse')
      return NextResponse.json(
        { error: 'AI did not return structured deliverables' },
        { status: 500 }
      )
    }

    let deliverables: ParsedDeliverable[]
    try {
      const parsed = JSON.parse(toolCall.function.arguments)
      deliverables = parsed.deliverables || []
    } catch (parseError) {
      console.error('Failed to parse tool call arguments:', parseError)
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      )
    }

    // Validate and clean the deliverables
    const cleanedDeliverables = deliverables
      .filter((d) => d.name && d.name.trim().length > 0)
      .map((d) => ({
        name: d.name.trim(),
        description: d.description?.trim() || '',
        price: typeof d.price === 'number' ? d.price : null,
        sourceText: d.sourceText?.trim() || '',
        confidence: typeof d.confidence === 'number' ? d.confidence : 0.5,
      }))

    return NextResponse.json({
      success: true,
      deliverables: cleanedDeliverables,
      sourceTextLength: deliverablesText.length,
    })
  } catch (error) {
    console.error('Parse deliverables API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
