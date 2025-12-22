import { NextRequest, NextResponse } from 'next/server'

const SYSTEM_PROMPT = `You are a form-filling assistant for Hexona Systems. Your ONLY job is to extract information and IMMEDIATELY fill form fields using the set_form_field tool.

CRITICAL: When the user pastes notes or text, you MUST:
1. Extract ALL relevant information
2. Call set_form_field for EACH piece of data you find
3. Do NOT ask for permission - just fill the fields immediately
4. After filling, briefly confirm what you set

## Current Form Path: {CURRENT_PATH}

## Available Fields
{FIELD_LIST}

## Field Mapping Examples
- Company name → prospect_company_name
- Website/URL → prospect_website
- Industry → industry
- What they want to automate → tasks_to_automate
- Current tools/software → current_tools or current_tools_detailed
- Goals/objectives → automation_goals or primary_goal
- Challenges/problems → main_challenges
- Notes/additional info → additional_notes

## Rules
- ALWAYS use the tool immediately when you have data
- Extract names, companies, websites, industries from context
- Never say "I'll fill" - just DO IT with tool calls
- If no fields match, say what info you found and ask which field to use`

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
        model: 'anthropic/claude-3.5-haiku',
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
      console.error('OpenRouter error:', response.status, error)

      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Invalid OpenRouter API key. Please check your OPENROUTER_API_KEY in Vercel.' },
          { status: 401 }
        )
      }

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
