import { NextRequest, NextResponse } from 'next/server'

const SYSTEM_PROMPT = `You are an AI assistant that creates redacted project briefs for developer opportunities.

Your task is to analyze project/inquiry information and create a brief that:
1. Describes the project scope and requirements
2. REDACTS all sensitive information

## What to REDACT (replace with placeholders):
- Client names, company names -> "[CLIENT]"
- Personal names -> "[PERSON]"
- Email addresses -> "[EMAIL]"
- Phone numbers -> "[PHONE]"
- Specific URLs/domains -> "[URL]"
- Exact prices, budgets, costs -> "[PRICE]"
- Street addresses -> "[ADDRESS]"
- Internal notes or comments

## What to KEEP:
- Industry/business type (e.g., "e-commerce", "SaaS", "real estate")
- Problem description and goals
- Tech stack and integrations needed
- Complexity level
- Estimated duration
- Deliverables/features (names only, not prices)
- Special requirements or constraints

## Output Format:
Return structured data using the extract_brief function.`

interface GenerateBriefRequest {
  sourceType: 'project' | 'inquiry' | 'blueprint' | 'case_study' | 'opportunity'
  sourceData: {
    title?: string
    description?: string
    requirements?: string
    deliverables?: Array<{ name: string; description?: string }>
    techStack?: string[]
    industry?: string
    clientBusiness?: string
    challenge?: string
    solution?: string
    results?: string
    estimatedHours?: number
    estimatedWeeks?: number
    complexity?: string
    // Any other relevant fields
    [key: string]: unknown
  }
}

interface RedactedBrief {
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

interface GenerateBriefResponse {
  success: boolean
  brief?: RedactedBrief
  redactedText?: string
  tokensUsed?: number
  generationTimeMs?: number
  error?: string
}

/**
 * Generate markdown text from structured brief
 */
function formatBriefAsMarkdown(brief: RedactedBrief): string {
  const lines: string[] = []

  lines.push('## Project Brief')
  lines.push('')
  lines.push(`**Industry:** ${brief.industry}`)
  lines.push(`**Problem:** ${brief.problem_type}`)
  lines.push('')
  lines.push('### Scope')
  lines.push(brief.scope_summary)
  lines.push('')

  if (brief.tech_stack.length > 0) {
    lines.push('### Tech Stack')
    brief.tech_stack.forEach((tech) => {
      lines.push(`- ${tech}`)
    })
    lines.push('')
  }

  if (brief.deliverables_overview.length > 0) {
    lines.push('### Deliverables')
    brief.deliverables_overview.forEach((deliverable) => {
      lines.push(`- ${deliverable}`)
    })
    lines.push('')
  }

  lines.push(`**Complexity:** ${brief.complexity}`)
  lines.push(`**Duration:** ${brief.estimated_duration}`)

  if (brief.special_requirements) {
    lines.push('')
    lines.push('### Special Requirements')
    lines.push(brief.special_requirements)
  }

  return lines.join('\n')
}

export async function POST(req: NextRequest): Promise<NextResponse<GenerateBriefResponse>> {
  const startTime = Date.now()

  try {
    const body = (await req.json()) as GenerateBriefRequest

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'OpenRouter API key not configured' },
        { status: 500 }
      )
    }

    if (!body.sourceType || !body.sourceData) {
      return NextResponse.json(
        { success: false, error: 'sourceType and sourceData are required' },
        { status: 400 }
      )
    }

    // Build the input text for the AI
    const inputParts: string[] = []

    if (body.sourceData.title) {
      inputParts.push(`Title: ${body.sourceData.title}`)
    }
    if (body.sourceData.description) {
      inputParts.push(`Description: ${body.sourceData.description}`)
    }
    if (body.sourceData.industry) {
      inputParts.push(`Industry: ${body.sourceData.industry}`)
    }
    if (body.sourceData.clientBusiness) {
      inputParts.push(`Client Business: ${body.sourceData.clientBusiness}`)
    }
    if (body.sourceData.challenge) {
      inputParts.push(`Challenge: ${body.sourceData.challenge}`)
    }
    if (body.sourceData.solution) {
      inputParts.push(`Solution: ${body.sourceData.solution}`)
    }
    if (body.sourceData.results) {
      inputParts.push(`Results: ${body.sourceData.results}`)
    }
    if (body.sourceData.requirements) {
      inputParts.push(`Requirements: ${body.sourceData.requirements}`)
    }
    if (body.sourceData.techStack && body.sourceData.techStack.length > 0) {
      inputParts.push(`Tech Stack: ${body.sourceData.techStack.join(', ')}`)
    }
    if (body.sourceData.deliverables && body.sourceData.deliverables.length > 0) {
      const deliverablesList = body.sourceData.deliverables
        .map((d) => `- ${d.name}${d.description ? `: ${d.description}` : ''}`)
        .join('\n')
      inputParts.push(`Deliverables:\n${deliverablesList}`)
    }
    if (body.sourceData.complexity) {
      inputParts.push(`Complexity: ${body.sourceData.complexity}`)
    }
    if (body.sourceData.estimatedHours) {
      inputParts.push(`Estimated Hours: ${body.sourceData.estimatedHours}`)
    }
    if (body.sourceData.estimatedWeeks) {
      inputParts.push(`Estimated Weeks: ${body.sourceData.estimatedWeeks}`)
    }

    const inputText = inputParts.join('\n\n')

    if (inputText.length < 20) {
      return NextResponse.json(
        { success: false, error: 'Insufficient source data to generate a brief' },
        { status: 400 }
      )
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://hexos.app',
        'X-Title': 'hexOS Brief Generator',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-haiku',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Please create a redacted project brief from the following ${body.sourceType} information:\n\n${inputText}`,
          },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_brief',
              description: 'Extract a redacted project brief',
              parameters: {
                type: 'object',
                properties: {
                  industry: {
                    type: 'string',
                    description: 'Business industry/type',
                  },
                  problem_type: {
                    type: 'string',
                    description: 'Type of problem being solved',
                  },
                  scope_summary: {
                    type: 'string',
                    description: '2-3 sentence scope summary',
                  },
                  tech_stack: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Technologies involved',
                  },
                  complexity: {
                    type: 'string',
                    enum: ['low', 'medium', 'high'],
                    description: 'Project complexity level',
                  },
                  estimated_duration: {
                    type: 'string',
                    description: 'Time estimate (e.g., "2-3 weeks")',
                  },
                  deliverables_overview: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'List of deliverables',
                  },
                  special_requirements: {
                    type: 'string',
                    description: 'Any special requirements',
                  },
                  redacted_fields: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'List of field types that were redacted',
                  },
                },
                required: [
                  'industry',
                  'problem_type',
                  'scope_summary',
                  'tech_stack',
                  'complexity',
                  'estimated_duration',
                  'deliverables_overview',
                  'redacted_fields',
                ],
              },
            },
          },
        ],
        tool_choice: {
          type: 'function',
          function: { name: 'extract_brief' },
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[generate-brief] OpenRouter error:', response.status, errorText)

      if (response.status === 401) {
        return NextResponse.json(
          { success: false, error: 'Invalid OpenRouter API key' },
          { status: 401 }
        )
      }
      if (response.status === 402) {
        return NextResponse.json(
          { success: false, error: 'OpenRouter payment required - check account credits' },
          { status: 402 }
        )
      }
      if (response.status === 429) {
        return NextResponse.json(
          { success: false, error: 'OpenRouter rate limit exceeded - try again later' },
          { status: 429 }
        )
      }
      return NextResponse.json(
        { success: false, error: `AI service error (${response.status})` },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Extract usage stats if available
    const tokensUsed = data.usage?.total_tokens || null

    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0]
    if (!toolCall || toolCall.function.name !== 'extract_brief') {
      console.warn('[generate-brief] No tool call in response')
      return NextResponse.json(
        { success: false, error: 'AI did not return structured brief' },
        { status: 500 }
      )
    }

    let brief: RedactedBrief
    try {
      brief = JSON.parse(toolCall.function.arguments)
    } catch (parseError) {
      console.error('[generate-brief] Failed to parse tool arguments:', parseError)
      return NextResponse.json(
        { success: false, error: 'Failed to parse AI response' },
        { status: 500 }
      )
    }

    // Validate and clean the brief
    const cleanedBrief: RedactedBrief = {
      industry: brief.industry?.trim() || 'General',
      problem_type: brief.problem_type?.trim() || 'Software Development',
      scope_summary: brief.scope_summary?.trim() || '',
      tech_stack: Array.isArray(brief.tech_stack) ? brief.tech_stack.filter(Boolean) : [],
      complexity: ['low', 'medium', 'high'].includes(brief.complexity)
        ? brief.complexity
        : 'medium',
      estimated_duration: brief.estimated_duration?.trim() || 'TBD',
      deliverables_overview: Array.isArray(brief.deliverables_overview)
        ? brief.deliverables_overview.filter(Boolean)
        : [],
      special_requirements: brief.special_requirements?.trim() || undefined,
      redacted_fields: Array.isArray(brief.redacted_fields)
        ? brief.redacted_fields.filter(Boolean)
        : [],
    }

    const generationTimeMs = Date.now() - startTime

    // Generate markdown text
    const redactedText = formatBriefAsMarkdown(cleanedBrief)

    return NextResponse.json({
      success: true,
      brief: cleanedBrief,
      redactedText,
      tokensUsed,
      generationTimeMs,
    })
  } catch (error) {
    console.error('[generate-brief] API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
