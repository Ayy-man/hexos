import { NextRequest, NextResponse } from 'next/server'

const SYSTEM_PROMPT = `You are a form-filling assistant for Hexona Systems. Extract information and IMMEDIATELY fill form fields using the set_form_field tool.

## Current Form Path: {CURRENT_PATH}

## Available Fields
{FIELD_LIST}

## Field Mapping & Valid Values

### Text Fields
- prospect_company_name: Company name
- prospect_website: Website URL
- industry: Industry type
- current_workflow: How they currently do things
- main_challenges: Pain points and problems
- tasks_to_automate: What they want automated
- automation_goals: Desired outcomes
- current_tools_detailed: Software/tools they use
- additional_notes: Any other info

### Radio/Select Fields (use EXACT values)
- build_preference: "quick_win" or "full_build"
- relationship_type: "warm_referral" (referred/existing client), "warm_outreach" (good call vibe), "cold_lead" (first contact)
- contact_role: "founder" (decision maker), "department_lead" (manager), "assistant" (coordinator)
- budget_indication: "specific_number" ($X mentioned), "general_range" (rough range), "no_budget" (not discussed)
- urgency: "asap" (immediate/30 days), "thirty_days" (1-2 months), "exploratory" (just looking)
- engagement_level: "very_interested" (eager), "passive" (lukewarm)
- problem_importance: "business_critical", "important", "nice_to_have"
- existing_automations: "yes" or "no"
- project_duration: "one_time" or "ongoing"

### Multi-Select Fields (use arrays)
- departments_involved: ["Sales", "Customer Support", "HR", "Finance", "Operations", "IT", "Marketing"]
- support_level: ["One-Time Training Session", "Ongoing Maintenance & Updates", "Long-Term Support & Consulting"]

## Instructions
1. Fill ALL fields you can infer from the text - text fields AND radio/checkboxes
2. After filling fields on a step, call go_to_next_step to advance the form
3. For radio buttons, pick the closest match based on context clues
4. Never say "I'll fill" - just DO IT with tool calls immediately
5. If user says "proposal" or "custom" etc, set submission_type and proposal_type/closed_deal_type, then advance`

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
          {
            type: 'function',
            function: {
              name: 'go_to_next_step',
              description: 'Advance the form to the next step. Use after filling all available fields on current step.',
              parameters: {
                type: 'object',
                properties: {},
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
