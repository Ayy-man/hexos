# Inquiry Form 3.0 Specification

## Overview

Multi-step intake form with AI Copilot for DFY Arbitrage Partners. Replaces external Fillout form.

## Technology Stack

```bash
pnpm add @assistant-ui/react @assistant-ui/react-hook-form react-hook-form @hookform/resolvers zod
```

**API Key:**
```env
OPENROUTER_API_KEY=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
```

## Form Structure & Branching

```
Entry Point
    │
    ▼
Step 1: Initial Questions
    ├── submission_type: "closed" ──► Branch A (Closed Deal)
    │                                    ├── A1: Standard Blueprint
    │                                    ├── A2: Custom Deal
    │                                    └── A3: Blueprint + Variation
    │
    └── submission_type: "proposal" ──► Branch B (Request Proposal)
                                         ├── B1: Standard Blueprint (info only, no submit)
                                         ├── B2: Blueprint + Variation
                                         └── B3: Custom Deal
```

---

## Step 1: Initial Questions

**Landing Note:** "This is intended for use by Arbitrage Partners of Hexona Systems only."

| Field | Type | Required | Options/Helper |
|-------|------|----------|----------------|
| submission_type | Radio | Yes | "I have closed a deal (contract signed / cash collected)" / "I'm requesting a proposal to be made" |
| partner_name | Text | Yes | "What's your name (Arbitrage Partner)?" |

---

## BRANCH A: CLOSED DEAL

### Step 2A: Deal Type

**Header:** "Congratulations on the close!"

| Field | Type | Required | Options |
|-------|------|----------|---------|
| closed_deal_type | Radio | Yes | "Standard Hexona Blueprint" / "Custom Deal (Using a Proposal We Created for You)" / "Blueprint + Variation (Using a Proposal We Created for You)" |

---

### Path A1: Closed Standard Blueprint

**Header:** "You Closed a Blueprint!"
**Subtext:** "This form will help us understand exactly what you closed so we can start the onboarding and project."

#### Section 1: Basic Info

| Field | Type | Required | Helper Text |
|-------|------|----------|-------------|
| prospect_company_name | Text | Yes | — |
| prospect_website | Text | Yes | — |
| industry | Text | Yes | — |
| blueprint_id | Dropdown | Yes | "Which Blueprint(s) is this regarding?" — Populate from blueprints table |

#### Section 2: Client Context

| Field | Type | Required | Helper Text |
|-------|------|----------|-------------|
| monthly_volume | Text | Yes | "How many customers, leads, or interactions does the client typically handle monthly?" |
| current_tools | Text | Yes | "What tools or platforms is the client currently using?" |
| existing_crm | Text | Yes | "Does the client already have a CRM or database to plug into?" |
| primary_goal | Dropdown | Yes | "What's the #1 result the client wants from this product?" |
| additional_notes | Textarea | Yes | "Tell us more about the deal - anything we should know?" |

**→ Forward Form Screen → Closed END**

---

### Path A2: Closed Custom Deal

**Header:** "You Closed a Custom Deal!"
**Subtext:** "This form will help us understand exactly what you closed so we can start the onboarding and project. We will find the deal using the prospect's name below."

| Field | Type | Required | Helper Text |
|-------|------|----------|-------------|
| prospect_company_name | Text | Yes | — |
| additional_notes | Textarea | Yes | "Tell us more about the deal - anything we should know outside of the proposal we gave you?" |

**→ Forward Form Screen → Closed END**

---

### Path A3: Closed Blueprint + Variation

**Header:** "You Closed a Blueprint + Variation!"
**Subtext:** "This form will help us understand exactly what you closed so we can start the onboarding and project. We will find the deal using the prospect's name below."

| Field | Type | Required | Helper Text |
|-------|------|----------|-------------|
| prospect_company_name | Text | Yes | — |
| additional_notes | Textarea | Yes | "Tell us more about the deal - anything we should know outside of the proposal we gave you?" |

**→ Forward Form Screen → Closed END**

---

## BRANCH B: REQUEST PROPOSAL

### Step 2B: Proposal Type

| Field | Type | Required | Options |
|-------|------|----------|---------|
| proposal_type | Radio | Yes | "Standard Hexona Blueprint" / "Standard Hexona Blueprint + Some Variation / Add-ons" / "Custom Build Out" |

---

### Path B1: Standard Blueprint Proposal (Info Only)

**Header:** "You have everything you need in the Blueprint Library!"

**Content (display only):**
> If you're selling a Standard Automation Blueprint as-is then you can use the information inside of our Blueprint Library Documents to create a proposal and sell it to your prospect. If anything is unclear feel free to message us in your Whatsapp Groupchat specifically.
>
> If you're looking to customize a blueprint / build on top of it then you can go back and choose that option.

**Actions:** [Go Back] button — no submission needed

---

### Path B2: Blueprint + Variation Proposal

**Header:** "You're requested a proposal for a Blueprint with some variation / changes to our standard build."
**Subtext:** "This form will help us understand what those changes are so we can tell you how it'll affect the final price, timeline and overall feasibility of the project!"

#### Section 1: Basic Info

| Field | Type | Required | Helper Text |
|-------|------|----------|-------------|
| prospect_company_name | Text | Yes | — |
| prospect_website | Text | Yes | — |
| industry | Text | Yes | — |
| blueprint_id | Dropdown | Yes | "Which Blueprint(s) is this regarding?" |
| variation_description | Textarea | Yes | "What is the variation upon the blueprint?" |

#### Section 2: Client Context

| Field | Type | Required | Helper Text |
|-------|------|----------|-------------|
| monthly_volume | Text | Yes | "How many customers, leads, or interactions does the client typically handle monthly?" |
| current_tools | Text | Yes | "What tools or platforms is the client currently using?" |
| existing_crm | Text | Yes | "Does the client already have a CRM or database to plug into?" |
| primary_goal | Dropdown | Yes | "What's the #1 result the client wants from this product?" |
| special_notes | Textarea | Yes | "Any special notes, restrictions, or expectations we should know?" |

**→ Forward Form Screen → Thank You END**

---

### Path B3: Custom Deal Proposal

**Header:** "You're requesting a Proposal for a Custom Deal."
**Subtext:** "This means that you have conducted a discovery call and determined that the prospect needs something outside of our Blueprint Library."

#### Section 1: Prospect & Relationship Info

| Field | Type | Required | Options/Helper |
|-------|------|----------|----------------|
| prospect_company_name | Text | Yes | — |
| prospect_website | Text | Yes | — |
| industry | Text | Yes | — |
| build_preference | Radio | Yes | "Quick Win (Get something live fast ~24-48 hour proposal)" / "Full Build Straight Away (~48-72 hour proposal)" |
| relationship_type | Radio | Yes | "Existing client, close friend, or warm referral" / "Warm outreach or good vibe from the discovery call" / "Cold lead or first conversation" |
| contact_role | Radio | Yes | "Founder or primary decision-maker" / "Department lead or internal influencer" / "Assistant, coordinator, or not sure" |
| budget_indication | Radio | Yes | "Yes, they gave a specific number" / "Yes, but only a general range or vague answer" / "No budget mentioned at all" |
| urgency | Radio | Yes | "ASAP or within the next 7 days" / "Within the next 30 days" / "No clear urgency — more of an exploratory chat" |
| engagement_level | Radio | Yes | "Very interested — asked about pricing or next steps" / "Seemed passive or uncertain" |
| problem_importance | Radio | Yes | "Business-critical — it's blocking revenue, time, or operations" / "Important but a minor inefficiency" / "Just a nice-to-have or experimental idea" |

#### Section 2: Process Overview & Challenges

| Field | Type | Required | Options/Helper |
|-------|------|----------|----------------|
| departments_involved | Checkbox (multi) | Yes | Sales, Customer Support, HR, Finance, Operations, IT, Other |
| current_workflow | Textarea | Yes | "Walk us through the workflow they're currently using for this process." |
| main_challenges | Textarea | Yes | "What Are the Main Challenges or Inefficiencies in Their Current Processes?" |
| tasks_to_automate | Textarea | Yes | "What Specific Tasks or Processes Do You Want to Automate?" |
| automation_goals | Textarea | Yes | "What Are Their Primary Goals with Automation?" |

#### Section 3: Client Context

| Field | Type | Required | Options/Helper |
|-------|------|----------|----------------|
| current_tools_detailed | Text | Yes | "What Tools, Software, or Platforms Are You Currently Using?" |
| existing_automations | Radio | Yes | "Yes" / "No" — "Do You Currently Have Any Existing Automations in Place?" |

#### Section 4: Budget & Timeline

| Field | Type | Required | Options/Helper |
|-------|------|----------|----------------|
| client_annual_revenue | Radio | Yes | "N/A" / "$0 - $50,000" / "$50,000 - $250,000" / "$250,000 - $750,000" / "$750,000 - $1,500,000" / "$1,500,000 - $5,000,000" / "$5,000,000+" |
| project_tier | Radio | Yes | "Standard Project: <$3,000" / "Business-Class Project: $3,000 - $5,000" / "First-Class Project: $5,000 - $15,000" / "Enterprise-Level Project: $15,000+" / "We Aren't Sure Yet" |
| project_duration | Radio | Yes | "One-Time Project" / "Ongoing Maintenance / Support Needed" |
| go_live_date | Text | Yes | "Preferred Go-Live Date or Project Deadline" |

#### Section 5: Additional Support & Next Steps

| Field | Type | Required | Options/Helper |
|-------|------|----------|----------------|
| support_level | Checkbox (multi) | Yes | "One-Time Training Session" / "Ongoing Maintenance & Updates" / "Long-Term Support & Consulting" / "No Support Needed" |
| additional_notes | Textarea | No | "Any Additional Notes or Special Requests?" |

**→ Forward Form Screen → Thank You END**

---

## Shared Ending Screens

### Forward Form Screen

| Field | Type | Required | Helper |
|-------|------|----------|--------|
| forward_email_1 | Email | No | "Enter the email address(es) you'd like this form to be forwarded to." |
| forward_email_2 | Email | No | — |

### Thank You - Proposal Request

**Header:** "Thank you for submitting your Proposal Request"
**Subtext:** "The team has received it and will start working on putting it together for you or we may reach out via Whatsapp for more information."

### Closed - END Confirmation

**Header:** "Deal Submitted Successfully"
**Subtext:** "The team has been notified and will begin the onboarding process."

---

## AI Copilot Implementation

### Toggle UI

```
[Form Title]                              [AI Copilot: OFF/ON]
```

- **OFF:** Full-width form, no sidebar
- **ON:** Form on left (60%), AI sidebar on right (40%)
- **Mobile:** Use drawer/modal instead of sidebar

### AI Sidebar Layout

```
┌────────────────────────────────────┐
│  AI Assistant                      │
│  ────────────────                  │
│                                    │
│  Paste your discovery call notes,  │
│  emails, or chat transcripts and   │
│  I'll help fill the form.          │
│                                    │
│  ┌──────────────────────────────┐  │
│  │  Chat messages appear here   │  │
│  └──────────────────────────────┘  │
│                                    │
│  ┌──────────────────────────────┐  │
│  │ Type a message...        [↑] │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```

### OpenRouter Configuration

**Model:** `anthropic/claude-3.5-sonnet` (or latest available)

**Tool Definition:**
```typescript
{
  name: "set_form_field",
  description: "Set a form field to a specific value",
  parameters: {
    field_name: string,  // The form field identifier
    value: string | string[]  // Value (array for multi-select)
  }
}
```

### Field Lists by Path

```typescript
const FIELD_LISTS = {
  'A1': ['prospect_company_name', 'prospect_website', 'industry', 'blueprint_id', 'monthly_volume', 'current_tools', 'existing_crm', 'primary_goal', 'additional_notes'],
  'A2': ['prospect_company_name', 'additional_notes'],
  'A3': ['prospect_company_name', 'additional_notes'],
  'B2': ['prospect_company_name', 'prospect_website', 'industry', 'blueprint_id', 'variation_description', 'monthly_volume', 'current_tools', 'existing_crm', 'primary_goal', 'special_notes'],
  'B3': [/* all custom deal fields */],
}
```

---

## Database Schema

### Inquiries Table

```sql
CREATE TABLE public.inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Submitter
  submitted_by UUID REFERENCES profiles(id),
  partner_name TEXT NOT NULL,

  -- Type & Status
  submission_type TEXT NOT NULL, -- 'closed', 'proposal'
  deal_type TEXT NOT NULL, -- 'blueprint', 'custom', 'variation'
  form_path TEXT NOT NULL, -- 'A1', 'A2', 'A3', 'B2', 'B3'
  status TEXT DEFAULT 'new', -- 'new', 'processing', 'converted', 'rejected'

  -- Common fields
  prospect_company_name TEXT,
  prospect_website TEXT,
  industry TEXT,
  blueprint_id UUID REFERENCES blueprints(id),

  -- All other fields as JSONB for flexibility
  form_data JSONB NOT NULL,

  -- Forwarding
  forward_emails TEXT[],

  -- Conversion
  converted_to_project_id UUID REFERENCES projects(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

-- DFY partners can see their own submissions
CREATE POLICY "inquiries_dfy_own" ON inquiries
  FOR SELECT USING (auth.uid() IS NOT NULL AND submitted_by = auth.uid());

-- Admin/Internal can see all
CREATE POLICY "inquiries_admin_all" ON inquiries
  FOR ALL USING (auth.uid() IS NOT NULL AND get_user_role() IN ('admin', 'internal'));

-- DFY can insert
CREATE POLICY "inquiries_dfy_insert" ON inquiries
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND get_user_role() = 'dfy');
```

---

## File Structure

```
app/
├── (dashboard)/
│   └── inquiries/
│       ├── page.tsx                    # List view (admin/internal + dfy own)
│       └── new/
│           └── page.tsx                # Multi-step form entry
├── api/
│   └── copilot/
│       └── route.ts                    # OpenRouter proxy

features/
└── inquiries/
    ├── components/
    │   ├── IntakeForm.tsx              # Main multi-step form
    │   ├── FormStepIndicator.tsx       # Progress indicator
    │   ├── AICopilotSidebar.tsx        # AI chat sidebar
    │   ├── CopilotToggle.tsx           # Toggle switch
    │   └── steps/
    │       ├── InitialStep.tsx         # Step 1
    │       ├── ClosedDealType.tsx      # Branch A selector
    │       ├── ProposalType.tsx        # Branch B selector
    │       ├── ClosedBlueprint.tsx     # Path A1
    │       ├── ClosedCustom.tsx        # Path A2
    │       ├── ClosedVariation.tsx     # Path A3
    │       ├── BlueprintInfo.tsx       # Path B1 (info only)
    │       ├── VariationProposal.tsx   # Path B2
    │       ├── CustomProposal.tsx      # Path B3
    │       └── ForwardForm.tsx         # Email forward step
    ├── hooks/
    │   ├── useFormCopilot.ts           # AI integration hook
    │   └── useFormNavigation.ts        # Multi-step navigation
    ├── schemas/
    │   └── intakeFormSchema.ts         # Zod validation schemas
    └── constants/
        └── fieldMappings.ts            # Field lists per path
```

---

## Submission Flow

1. Validate all required fields for current path
2. Create inquiry record in database
3. **If closed deal (A1, A2, A3):**
   - Create project with status `in_progress`
   - Link inquiry to project via `converted_to_project_id`
4. **If proposal request (B2, B3):**
   - Create inquiry with status `new`
   - INT team reviews in list view
5. If forward emails provided, store for manual forwarding (no auto-send for MVP)
6. Redirect to confirmation page

---

## Access Control

| Role | List View | Submit Form | Convert to Project |
|------|-----------|-------------|-------------------|
| admin | All inquiries | Yes | Yes |
| internal | All inquiries | Yes | Yes |
| dfy | Own submissions only | Yes | No |
| dev | No access | No | No |
| client | No access | No | No |

---

## Open Questions (Need User Input)

1. **Blueprints**: Need seed data or management page first?
2. **Primary Goal dropdown**: Static list or per-blueprint?
3. **Email forwarding**: Store only (MVP) or integrate email service?
4. **Notifications**: Supabase Realtime or polling for MVP?

---

## Testing Checklist

- [ ] Form renders Step 1 correctly
- [ ] Branch A paths work (all 3 sub-paths)
- [ ] Branch B paths work (all 3 sub-paths)
- [ ] AI toggle shows/hides sidebar
- [ ] AI can extract info from pasted notes
- [ ] AI fills form fields correctly
- [ ] Form validation works per step
- [ ] Submission creates correct records
- [ ] DFY partners see their submissions
- [ ] Admin/Internal see all inquiries
- [ ] Closed deals create projects
