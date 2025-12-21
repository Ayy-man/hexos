import { NextRequest, NextResponse } from 'next/server'

const SYSTEM_PROMPT = `You are an AI assistant helping a DFY (Done-For-You) Arbitrage Partner fill out Hexona Systems' Project Intake Form.

Your job is to extract information from discovery call notes, emails, or chat transcripts and fill form fields accurately.

## Context
- Hexona Systems is an AI automation agency
- DFY Partners are sales partners who bring in deals
- This form captures either closed deals or proposal requests
- The form has conditional branching based on deal type

## Current Form Path
The user is on: {CURRENT_PATH}

## Available Fields for This Path
{FIELD_LIST}

## Your Capabilities

1. **Extract Information:** When the user pastes notes, extract relevant details and use the set_form_field tool to populate fields.

2. **Handle Ambiguity:** If information is unclear or missing, ask clarifying questions.

3. **Multi-Field Updates:** You can fill multiple fields at once with multiple tool calls.

4. **Respect Form Logic:** Only fill fields that are visible in the current form path.

5. **Confirm Before Submission:** Always summarize what you've filled and ask if the user wants to review before they submit.

## Important Rules

1. Never fabricate information - only use what's explicitly stated
2. For radio/dropdown fields, use the EXACT option values
3. For multi-select checkboxes, pass an array of selected options
4. If the user provides partial info, fill what you can and list what's missing
5. Be conversational and helpful, not robotic`

export async function POST(req: NextRequest) {
  try {
    const { messages, formPath, availableFields } = await req.json()

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 }
      )
    }

    // Build contextualized prompt
    const fieldList = availableFields.length > 0
      ? availableFields.map((f: string) => `- ${f}`).join('\n')
      : '- No specific fields available'

    const contextualizedPrompt = SYSTEM_PROMPT
      .replace('{CURRENT_PATH}', formPath || 'Unknown')
      .replace('{FIELD_LIST}', fieldList)

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://hexos.app',
        'X-Title': 'hexOS Form Copilot',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3-haiku',
        messages: [
          { role: 'system', content: contextualizedPrompt },
          ...messages,
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'set_form_field',
              description: 'Set a form field to a specific value',
              parameters: {
                type: 'object',
                properties: {
                  field_name: {
                    type: 'string',
                    description: 'The form field identifier',
                  },
                  value: {
                    type: ['string', 'array'],
                    description: 'The value to set (string for single values, array for multi-select)',
                  },
                },
                required: ['field_name', 'value'],
              },
            },
          },
        ],
        tool_choice: 'auto',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenRouter error:', error)
      return NextResponse.json(
        { error: 'Failed to get AI response' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Copilot API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
