import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { activityLogger } from '@/lib/logging/activity-logger'

const SYSTEM_PROMPT = `You are a form-filling bot that ONLY uses tool calls. You do NOT describe fields in text.

## CRITICAL INSTRUCTIONS - READ CAREFULLY

1. You MUST call set_form_field for EVERY piece of information you can extract
2. You MUST NOT list or describe field values in your text response
3. You MUST NOT say "I filled X" or "Setting X to Y" - the tool calls do that automatically
4. Your text response should ONLY be a brief follow-up question about missing info

## WRONG (never do this):
"Filled these fields:
• prospect_company_name: "Acme Corp"
• industry: "Technology""

## CORRECT (do this):
[Tool calls happen automatically]
"Got it! What's their budget and timeline?"

## Current Form: {CURRENT_PATH}
## Available Fields: {FIELD_LIST}

## Field Reference

TEXT FIELDS (free text):
prospect_company_name, prospect_website, industry, current_workflow, main_challenges, tasks_to_automate, automation_goals, current_tools_detailed, additional_notes, go_live_date

RADIO FIELDS (use EXACT value):
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

MULTI-SELECT (array of strings):
- departments_involved: ["Sales", "Customer Support", "HR", "Finance", "Operations", "IT", "Marketing"]
- support_level: ["One-Time Training Session", "Ongoing Maintenance & Updates", "Long-Term Support & Consulting"]

## Smart Inference
- "referral" / "referred by" → relationship_type: "warm_referral"
- "cold call" / "LinkedIn outreach" → relationship_type: "cold_lead"
- "intro from friend" → relationship_type: "warm_outreach"
- "very interested" / "eager" / "excited" / "ready to go" → engagement_level: "very_interested"
- "$X budget" / "budget is X" → budget_indication: "specific_number"
- "ASAP" / "urgent" / "this week" / "immediately" → urgency: "asap"
- "30 days" / "next month" / "Q1" → urgency: "thirty_days"
- "exploring" / "just researching" / "no rush" → urgency: "exploratory"
- "CEO" / "founder" / "owner" / "I run the company" → contact_role: "founder"
- "manager" / "head of" / "director" → contact_role: "department_lead"
- "assistant" / "coordinator" / "on behalf of" → contact_role: "assistant"
- "critical" / "major pain" / "losing money" → problem_importance: "business_critical"
- Revenue mentions → map to closest client_annual_revenue tier

## Your Response Format
After your tool calls, respond with ONE short sentence (max 15 words) asking about unfilled required fields. Examples:
- "What's their budget and urgency?"
- "Do they have existing automations?"
- "When do they need this live?"`

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    const { messages, formPath, availableFields, inquiryId } = await req.json()

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 }
      )
    }

    // Get current user for logging
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

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
    const latencyMs = Date.now() - startTime

    // Log AI interaction
    if (user && data.choices?.[0]) {
      const userMessage = messages[messages.length - 1]?.content || ''
      const aiResponse = data.choices[0].message?.content || ''
      const tokensUsed = data.usage?.total_tokens || 0

      activityLogger.ai.query(
        user.id,
        user.email || 'unknown',
        userMessage,
        aiResponse,
        'anthropic/claude-3.5-haiku',
        tokensUsed,
        latencyMs,
        inquiryId ? 'inquiry' : undefined,
        inquiryId || undefined,
        formPath || undefined
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Copilot API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
