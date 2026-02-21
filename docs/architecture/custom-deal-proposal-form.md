# hexOS Custom Deal Proposal Form — Architecture Deep-Dive

## Part 1: Existing Architecture

### 1. Framework & Form Schema

**Stack:**
- **Framework:** Next.js 16.1 (App Router) with React 19
- **Form library:** React Hook Form 7.69 + Zod 4.2 validation
- **UI:** shadcn/ui components (Card, Button, Switch, Textarea, etc.)
- **Database:** Supabase (PostgreSQL) — data stored in the `inquiries` table
- **AI:** Claude 3.5 Haiku via OpenRouter (`anthropic/claude-3.5-haiku`)

**Schema location:** `features/inquiries/schemas/intakeFormSchema.ts`

The form schema is **code-defined via Zod**, not driven by external config/JSON. There are separate schemas per form path:

| Schema | Path | Purpose |
|--------|------|---------|
| `initialStepSchema` | — | `submission_type` + `partner_name` |
| `closedDealTypeSchema` | — | `closed_deal_type` enum |
| `proposalTypeSchema` | — | `proposal_type` enum |
| `closedBlueprintSchema` | A1 | 9 fields (company, website, industry, blueprint, volume, tools, CRM, goal, notes) |
| `closedCustomSchema` | A2/A3 | 2 fields (company, notes) |
| `variationProposalSchema` | B2 | 10 fields |
| `customProposalSchema` | B3 | 23 fields across 5 sections |
| `forwardFormSchema` | — | 2 optional email fields |

The main `IntakeForm.tsx` uses a **permissive base schema** with `.passthrough()` so dynamic AI-filled fields don't get stripped:

```typescript
const baseSchema = z.object({
  submission_type: z.enum(['closed', 'proposal']).optional(),
  partner_name: z.string().optional(),
  closed_deal_type: z.enum(['blueprint', 'custom', 'variation']).optional(),
  proposal_type: z.enum(['blueprint', 'variation', 'custom']).optional(),
}).passthrough()
```

Field option values (departments, revenue tiers, project tiers, etc.) live in `features/inquiries/constants/fieldMappings.ts`.

---

### 2. Multi-Step Flow

**Pattern: State-driven stepper (not route-based, not a formal state machine library)**

The flow is managed by a single `useState<Step>` in `IntakeForm.tsx`:

```
type Step = 'initial' | 'closed_type' | 'proposal_type' | 'path_form' | 'forward' | 'confirmation'
```

There are 6 possible form paths determined by `getFormPath()`:

```
                    ┌─ blueprint ──► A1 (Closed Blueprint)
        ┌─ closed ──┼─ custom ─────► A2 (Closed Custom)
        │           └─ variation ──► A3 (Closed Blueprint+Variation)
Start ──┤
        │           ┌─ blueprint ──► B1 (Info only, no form)
        └─ proposal ┼─ variation ──► B2 (Variation Proposal)
                    └─ custom ─────► B3 (Custom Deal Proposal — 23 fields)
```

**Navigation mechanics:**
- `handleNext()` reads fresh values via `methods.getValues()` (avoids stale closure state), computes the path, and sets the next step.
- `handleBack()` clears branching selections (deal_type/proposal_type) when returning to initial, preventing stale path state.
- `canProceed()` gates the Next button — requires `submission_type` on initial, `closed_deal_type`/`proposal_type` on type steps, and `prospect_company_name` on the detail form.
- `FormStepIndicator` renders numbered circles with connecting lines, dynamically adjusting which steps appear based on `submissionType` and `currentPath`.

Each step renders a dedicated component from `features/inquiries/components/steps/`:
- `InitialStep`, `ClosedDealType`, `ProposalType` — selection steps
- `ClosedBlueprint`, `ClosedCustom`, `VariationProposal`, `CustomProposal` — detail forms
- `BlueprintInfo` — info-only view for B1 path
- `ForwardForm` — optional email forwarding
- `ConfirmationScreen` — post-submission

---

### 3. AI Copilot Sidebar

**Location:** `features/inquiries/components/AICopilotSidebar.tsx`

**Activation:**
- Only available on the `path_form` step (not on initial/type selection)
- Toggled via a Switch in the form header: `copilotEnabled` state
- When enabled, the layout shifts: form takes 60% width, sidebar takes 40%

**API call flow:**

```
User types/pastes text
  └─► AICopilotSidebar sends POST to /api/copilot
        Body: { messages, formPath, availableFields }
          └─► route.ts builds system prompt with:
                - Field list for current path (from FIELD_LISTS constant)
                - Smart inference rules for mapping natural language → enum values
                - Instructions to use function calling exclusively
              Calls OpenRouter API:
                model: anthropic/claude-3.5-haiku
                tools: [set_form_field, go_to_next_step]
                tool_choice: "required"
          └─► Returns OpenAI-compatible response with tool_calls
  └─► Sidebar parses response:
        For each tool_call with name="set_form_field":
          - Extracts { field_name, value } from arguments
          - Calls onSetField(field_name, value) → parent's handleSetField
        For tool_call with name="go_to_next_step":
          - Calls onNext() to advance the form
  └─► Parent's handleSetField:
        - Calls React Hook Form's setValue(fieldName, value, { shouldValidate: true })
        - Triggers CSS animation: adds 'ai-filled-flash' class to the DOM element
```

**How the sidebar knows which fields to update:**

The `FIELD_LISTS` constant in `fieldMappings.ts` maps each form path to its available fields:
- A1: 9 fields
- B3: 23 fields (the most comprehensive)
- etc.

These field names are sent to the API as `availableFields`, injected into the system prompt, and the LLM is constrained to only call `set_form_field` with those field names.

---

### 4. "Updated 3 fields" — Field Mapping from Unstructured Text

**Mechanism: LLM function calling with structured system prompt — no separate parsing layer.**

The entire intelligence lives in the system prompt at `app/api/copilot/route.ts`. Key elements:

1. **Field reference table** — explicitly lists every field with its type:
   - Text fields (free text): `prospect_company_name`, `current_workflow`, etc.
   - Radio fields (exact enum values): `build_preference: "quick_win" | "full_build"`, etc.
   - Multi-select fields (array of strings): `departments_involved`, `support_level`

2. **Smart inference rules** — 15+ mapping rules that translate natural language to enum values:
   ```
   "referral" / "referred by" → relationship_type: "warm_referral"
   "ASAP" / "urgent"          → urgency: "asap"
   "CEO" / "founder"          → contact_role: "founder"
   "critical" / "losing money" → problem_importance: "business_critical"
   ```

3. **Forced tool use** — `tool_choice: "required"` ensures the LLM always emits tool calls, never just text.

4. **Display logic** in AICopilotSidebar.tsx:
   ```typescript
   const filledFields: { field: string; value: string }[] = []
   // ... collect from tool_calls ...
   const confirmation = `✓ Updated ${filledFields.length} field${filledFields.length > 1 ? 's' : ''}`
   ```

There is no separate function-calling layer, no structured output parsing library (like instructor/zod-to-json-schema), and no post-processing. The LLM's native tool-calling capability is the entire extraction pipeline.

---

### 5. Submission — Where Does the Data Go?

**Submission flow:**

```
Form Submit (client)
  └─► submitInquiry() server action (features/inquiries/actions/submitInquiry.ts)
        └─► createInquiry() (lib/api/inquiries.ts)
              └─► Supabase INSERT into `inquiries` table
                    Stores: partner_name, submission_type, deal_type, form_path,
                            prospect_company_name, prospect_website, industry,
                            blueprint_id, form_data (JSONB — entire form state),
                            forward_emails (text[])
        └─► revalidatePath('/inquiries') — refreshes the inquiries list
```

**Database schema** (`supabase/migrations/20241221000005_inquiries_table.sql`):
- Primary structured columns: `submission_type`, `deal_type`, `form_path`, `prospect_company_name`, etc.
- **`form_data JSONB`** — stores the entire form state as a JSON blob (all 23 fields for B3)
- Status/lifecycle fields: `status`, `proposal_stage`, `stage_history`, `archived_at`, `deleted_at`
- Pricing: `price_dfy`, `price_hexona`, `price_dev`, `pricing_notes`
- Document content: `document_content`, `proposal_content` (Plate.js rich text)
- Public sharing: `public_token`, `client_view_count`, `client_viewed_at`

**Post-submission lifecycle (admin-driven, not automatic):**
- Stage pipeline: `unopened → admin_reviewed → in_queue → working → on_hold → final_review → ready → sent → closed/lost`
- In-app notifications on stage changes and assignments
- Proposal document editing (Plate.js rich text editor)
- Deliverables negotiation workflow
- Project conversion (`convertInquiryToProjectFull`) — creates a project with deliverables, requirements, and payment milestones

**What does NOT exist today:**
- No GHL (GoHighLevel) integration
- No webhook on submission
- No automatic email sending on submission (forward_emails are stored but not sent)
- No PDF generation on submission
- No document upload/OCR in the intake form

---

### 6. Modularity Assessment

**What's modular (reusable with config changes):**

| Component | Reusability | What to change |
|-----------|------------|----------------|
| Field option constants | High | Edit `fieldMappings.ts` — add/change options |
| Zod schemas | High | Create new schemas in `intakeFormSchema.ts` |
| AI Copilot sidebar | Medium | Change `FIELD_LISTS`, update system prompt |
| FormStepIndicator | Medium | Works off step IDs, adapt step definitions |
| shadcn/ui form elements | High | Already generic components |

**What's hardcoded (requires code changes):**

| Component | Constraint |
|-----------|-----------|
| Step sequence | Hardcoded `if/else` in `handleNext()` and conditional renders in JSX |
| Form path routing | `getFormPath()` function with hardcoded A1-B3 mapping |
| Step components | Each path has a dedicated component (`CustomProposal.tsx`, etc.) |
| AI system prompt | Hardcoded in `route.ts` with hexOS-specific field references |
| Submission target | Always Supabase `inquiries` table, no pluggable backends |

**Verdict:** The system is **variation-friendly but not config-driven**. You can create new form paths by following the existing pattern (new schema + new step component + add to `getFormPath` + add to `FIELD_LISTS`), but you cannot define an entirely different form from a JSON config without writing code.

---

## Part 2: Feasibility Assessment — Tenancy Deposit Claims System

### What You Want

A consumer-facing system where:
1. Lead lands on a standalone branded domain
2. Full-screen conversational AI qualifies them (4-5 questions)
3. If qualified, form panel slides open beside chat with pre-populated fields
4. AI continues filling fields from conversation in real-time
5. Document upload → GPT-4 Vision extracts data → more fields auto-fill
6. Submit → generates claim PDF, pushes to GHL, emails solicitor

### What Can Be Reused vs Built From Scratch

#### Can reuse (with modification):

| hexOS Component | Adaptation Needed |
|----------------|-------------------|
| **AI Copilot sidebar** (`AICopilotSidebar.tsx`) | Invert the layout — make chat primary (full-screen), form secondary (slide-in panel). Core message/tool-call loop is identical. |
| **`set_form_field` function-calling pattern** | Same architecture. New system prompt with deposit claim fields + new smart inference rules. |
| **React Hook Form + Zod validation** | New schema for deposit claim fields. Same `setValue` mechanism for AI-driven field population. |
| **`handleSetField` with flash animation** | Copy directly — works with any form field names. |
| **FormStepIndicator** | Adapt step labels, but the numbered-circle pattern works. |
| **shadcn/ui components** | All generic, fully reusable. |

#### Must build from scratch:

| Feature | Complexity | Notes |
|---------|-----------|-------|
| **Standalone Next.js app** | Low | Scaffold with `create-next-app`, copy shadcn/ui config. No auth needed for consumer form. |
| **Chat-first layout** | Medium | Invert the current layout: chat is 100% width initially, form slides in from the right after qualification. CSS transitions + state toggle. |
| **Qualification logic** | Medium | New system prompt with 4-5 qualifying questions + a `qualify_lead` tool call that returns qualified/disqualified. This triggers the form panel slide-in. |
| **New Zod schema** | Low | ~10 fields: tenant_name, landlord_name, property_address, deposit_amount, tenancy_start, tenancy_end, deposit_scheme, claim_type, etc. |
| **Document upload + GPT-4 Vision** | High | File upload component, send image to GPT-4 Vision API, parse structured data from response, map to form fields via `set_form_field`. This is new infrastructure. |
| **PDF generation** | Medium | Use `@react-pdf/renderer` or Puppeteer to generate claim summary. Template-based — straightforward once fields are defined. |
| **GHL integration** | Medium | REST API call to create/update GHL contact with custom fields. Need GHL API key + field mapping. Well-documented API. |
| **Email to solicitor** | Low | Resend/SendGrid API call with PDF attachment. Simple transactional email. |
| **Supabase backend** | Low | New table (`deposit_claims`) with the claim fields. Same pattern as `inquiries`. |

### The Hard Parts

1. **Document upload + Vision extraction** — This is the biggest unknown. GPT-4 Vision can read tenancy agreements, but extraction quality varies with document quality, format, and complexity. You'll need:
   - File upload to Supabase Storage or S3
   - Async processing (tenancy agreements can be multi-page PDFs)
   - Structured extraction prompt that reliably pulls: names, addresses, dates, deposit amounts, scheme details
   - Fallback UX for when extraction fails or is partial
   - This alone is 1-2 days of work including testing.

2. **Chat-first to form-reveal transition** — The hexOS layout has the form as primary and chat as secondary. Inverting this requires rethinking the component hierarchy. The chat needs to be the root view, and the form needs to animate in. Not technically hard, but it's a UX design task as much as an engineering task.

3. **Qualification flow** — The current copilot doesn't do qualification; it just fills fields. You need a new conversational mode where the AI asks questions sequentially, evaluates answers, and makes a qualify/disqualify decision. This means a different system prompt and a new tool (`qualify_lead`).

4. **GHL field mapping** — GHL custom fields need to be pre-configured in your GHL account, and the API integration needs to map your form fields to GHL field IDs. This is configuration-heavy but not technically complex.

### Realistic Effort Breakdown (3-4 day target)

| Day | Tasks |
|-----|-------|
| **Day 1** | Scaffold standalone Next.js app. Set up Supabase table. Build chat-first layout with form slide-in panel. Create Zod schema for deposit claim fields. Port the `set_form_field` copilot pattern with new system prompt. |
| **Day 2** | Build qualification flow (new system prompt + `qualify_lead` tool). Wire up form fields with AI auto-population. Implement the form panel with all deposit claim fields. Test end-to-end chat → qualify → fill flow. |
| **Day 3** | Document upload component. GPT-4 Vision integration for tenancy agreement parsing. PDF generation for claim summary. GHL API integration (create contact + custom fields). Email sending. |
| **Day 4** | Polish, edge cases, mobile responsiveness. Deploy to Vercel on custom domain. Test full flow end-to-end. Handle error states (failed extraction, API failures, incomplete forms). |

### Verdict

**~60% reuse, ~40% new build.** The core AI-fills-form pattern ports cleanly. The hard parts are all in the new features: document vision extraction, chat-first UX, qualification logic, and the submission integrations (PDF + GHL + email). The 3-4 day timeline is tight but achievable if:

- You skip document upload for v1 (add it in week 2) — this alone saves a full day
- You use a simple GHL webhook instead of full API integration for v1
- You accept a basic PDF template (no custom branding) initially
- You have your GHL custom fields pre-configured before you start

Without document upload, this is a comfortable 3-day build. With it, expect 4-5 days.
