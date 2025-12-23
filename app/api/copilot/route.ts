import { NextRequest, NextResponse } from 'next/server'

const SYSTEM_PROMPT = `You are a form-filling bot. Your ONLY job is to call set_form_field tools.

CRITICAL: On EVERY message, you MUST call set_form_field for ANY information you can extract. NEVER respond with just text - ALWAYS include tool calls first.

## Current Form: {CURRENT_PATH}
## Fields: {FIELD_LIST}

## Field Values (use EXACT strings)

TEXT FIELDS:
- prospect_company_name, prospect_website, industry
- current_workflow, main_challenges, tasks_to_automate, automation_goals
- current_tools_detailed, additional_notes, go_live_date

RADIO FIELDS (exact values only):
- build_preference: "quick_win" | "full_build"
- relationship_type: "warm_referral" | "warm_outreach" | "cold_lead"
- contact_role: "founder" | "department_lead" | "assistant"
- budget_indication: "specific_number" | "general_range" | "no_budget"
- urgency: "asap" | "thirty_days" | "exploratory"
- engagement_level: "very_interested" | "passive"
- problem_importance: "business_critical" | "important" | "nice_to_have"
- existing_automations: "yes" | "no"
- project_duration: "one_time" | "ongoing"
- client_annual_revenue: "under_500k" | "500k_1m" | "1m_5m" | "5m_10m" | "over_10m"
- project_tier: "tier_1" | "tier_2" | "tier_3" | "tier_4"

MULTI-SELECT (arrays):
- departments_involved: ["Sales", "Customer Support", "HR", "Finance", "Operations", "IT", "Marketing"]
- support_level: ["One-Time Training Session", "Ongoing Maintenance & Updates", "Long-Term Support & Consulting"]

## Rules
1. ALWAYS call set_form_field tools FIRST - before any text response
2. Extract and fill EVERY field you can infer from the input
3. After tool calls, give a 1-2 line summary asking about unfilled required fields
4. If user says "hi" or asks a question with no data, ask them to paste their notes

## Inference Examples
- "referral" / "referred by" → relationship_type: "warm_referral"
- "cold call" / "LinkedIn" → relationship_type: "cold_lead"
- "very interested" / "eager" / "excited" → engagement_level: "very_interested"
- "budget of $X" / "$X" → budget_indication: "specific_number"
- "ASAP" / "urgent" / "this week" → urgency: "asap"
- "30 days" / "next month" → urgency: "thirty_days"
- "exploring" / "just looking" → urgency: "exploratory"
- "office manager" / "not the owner" → contact_role: "department_lead"
- "founder" / "CEO" / "owner" → contact_role: "founder"`

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
        tool_choice: 'required',
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
