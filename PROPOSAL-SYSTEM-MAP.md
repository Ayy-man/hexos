# hexOS Proposal System — Replication Reference Map

A complete, faithful engineering reference for the **proposal** subsystem, written so a separate team can rebuild and polish it in a clean repo **without access to this codebase**. Every claim cites `path:line`; SQL and key logic are quoted inline. Where something is absent from the repo, it says so plainly. No secrets/keys/env values are reproduced (any secret literal is shown as `«redacted»`).

> **Method note.** This was assembled from a full read of the migrations, server actions, data-access lib, route handlers, and React components, cross-checked across five independent sweeps. Two load-bearing "broken" findings (missing reminder columns; missing public RLS policy) were verified directly with repo-wide `grep`. Because the live production database is not in the repo, findings of the form "column/policy does not exist" are stated as **"not in repo"** — it is possible (but unverifiable here) that they were added out-of-band to the live DB.

---

## 0. Orientation — how a "proposal" is structured

There is **no `proposals` table.** A proposal is a set of columns + child tables hanging off **`public.inquiries`**:

- **Proposal body & metadata** live as columns on `inquiries` (three parallel rich-text bodies, a stage enum, a legacy status, three flat price fields, a public share token, submission timestamps).
- **Priced line items** live in a child table **`proposal_deliverables`** (keyed by `inquiry_id`), with append-only history (`proposal_deliverable_history`) and per-line comments (`proposal_deliverable_comments`).
- **Selected blueprints/case studies** live in a junction **`inquiry_selections`**.

Two Supabase clients are used, and the distinction is critical to authorization:
- **RLS-enforced (user-scoped)** — `lib/supabase/server.ts:4` `createClient()` using the anon key + the caller's auth cookies. **Almost everything proposal-related uses this.**
- **Service-role (RLS-bypassing)** — `lib/supabase/admin.ts:4`, comment `admin.ts:3`: *"Admin client that bypasses RLS - use only for system operations."* **Only one proposal path uses it: the expiry cron** (`app/api/cron/proposal-expiry/route.ts:2,17`).

**Authorization is RLS-only.** Application code contains essentially no role checks — `'use server'` actions rely on Postgres RLS for who-can-do-what. The handful of in-code guards are `if (!user) throw` (e.g. `features/project-initiation/actions/initiationActions.ts:66`) and a DFY-ownership check on the detail page (`app/(dashboard)/inquiries/[id]/page.tsx:212-218`). "Admin only" code comments are **not** enforced in code.

---

## 1. Data Model

### 1.1 `public.inquiries` — base table
`supabase/migrations/20241221000005_inquiries_table.sql:2-33`:
```sql
CREATE TABLE public.inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by UUID REFERENCES profiles(id),
  partner_name TEXT NOT NULL,
  submission_type TEXT NOT NULL CHECK (submission_type IN ('closed', 'proposal')),
  deal_type TEXT NOT NULL CHECK (deal_type IN ('blueprint', 'custom', 'variation')),
  form_path TEXT NOT NULL CHECK (form_path IN ('A1', 'A2', 'A3', 'B2', 'B3')),
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'processing', 'converted', 'rejected')),
  prospect_company_name TEXT, prospect_website TEXT, industry TEXT,
  blueprint_id UUID REFERENCES blueprints(id),
  form_data JSONB NOT NULL DEFAULT '{}',
  forward_emails TEXT[],
  converted_to_project_id UUID REFERENCES projects(id),
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
`status` here is the **legacy** status (the first of two status systems).

### 1.2 Proposal-related columns added later (with the migration that added each)
- **Document brief body**: `document_content JSONB` — `20241221000007_inquiry_documents.sql:9-10`.
- **Inline discussion anchors**: `inline_discussions JSONB DEFAULT '[]'` — `20241221000011_inline_discussions.sql:6-7`.
- **Archive/soft-delete**: `archived_at/by`, `deleted_at/by` — `20241221000008_inquiry_archive_delete.sql:2-6`.
- **Stage + management + public token** — `20241222000001_proposal_stages.sql:14-40`:
```sql
ALTER TABLE inquiries
ADD COLUMN proposal_stage proposal_stage DEFAULT 'pending',
ADD COLUMN stage_entered_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN stage_history JSONB DEFAULT '[]'::jsonb,
ADD COLUMN priority TEXT DEFAULT 'normal',
ADD COLUMN due_date DATE,
ADD COLUMN assigned_to UUID REFERENCES profiles(id),
ADD COLUMN estimated_value DECIMAL(10,2);
...
ADD COLUMN public_token UUID DEFAULT gen_random_uuid(),
ADD COLUMN client_viewed_at TIMESTAMPTZ,
ADD COLUMN client_view_count INT DEFAULT 0;
CREATE UNIQUE INDEX idx_inquiries_public_token ON inquiries(public_token);
```
  `stage_history` element shape (comment at `:43`): `{from,to,changed_by,changed_at,notes}`. Default later changed to `'unopened'` (`20241223000002_migrate_proposal_stages.sql:15`).
- **`pricing_notes TEXT`** — `20241223000003_pricing_notes.sql:4` ("notes from DFY partner explaining pricing breakdown").
- **Proposal bodies/tabs** — `20241223000004_proposal_tabs.sql:5-15`:
```sql
ADD COLUMN proposal_content JSONB;
ADD COLUMN proposal_submitted_at TIMESTAMPTZ;
ADD COLUMN proposal_submitted_by UUID REFERENCES profiles(id);
ADD COLUMN dfy_version_content JSONB;
ADD COLUMN proposal_discussions JSONB DEFAULT '[]';
```
- **Negotiation status + closed-deal fields** — `20241224000004_inquiry_negotiation_columns.sql:16-23`: `deliverables_status deliverables_negotiation_status DEFAULT 'none'`, `closed_at`, `closed_by`, `closed_notes`, `client_email`.
- **Price rename + new prices + dates** — `20251231000001_project_financial_fields.sql:59-69`: **renames `estimated_value` → `price_dfy`**, adds `price_hexona DECIMAL(10,2)`, `price_dev DECIMAL(10,2)`, `date_inquiry`, `date_proposal_sent`. (Comments `:72-74`: price_dfy = client pays; price_hexona = what Hexona charges the DFY; price_dev = est. dev cost.)
- **`proposal_whiteboard JSONB`** — `20260103000005_project_files_folders.sql:9`.
- **`dfy_organization_id UUID REFERENCES organizations(id)`** — `20260109000010_organizations_invitations.sql:155-156`.
- **`admin_viewed_at TIMESTAMPTZ`** — `20260110000012_admin_viewed_at.sql:4-5` ("first admin view").

**Columns the code uses but that are NOT in any migration (verified by repo-wide `grep` of `supabase/`):** `reminder_snoozed_until`, `reminder_snooze_count`, `reminder_escalated_at`, `dfy_first_viewed_at`, `lost_reason`, `admin_update_requested_at`. The migration that should add them — `20260106000001_proposal_reminders.sql` — is a **1-byte no-op stub** (its entire content is the character `2`; `wc -c` = 1). Also **not in repo**: `inquiries.assigned_dev_id` (referenced by RLS helper functions at `20260103000002_conversations_dm_inquiry.sql:105` but never added as a column), `share_token` (the share mechanism is `public_token`), and any `inquiry_documents` table (the file of that name only adds `document_content` + creates `inquiry_comments`). See §5 for the runtime impact.

### 1.3 `public.proposal_deliverables` (+ enums, history, hierarchy)
Enums — `20241224000001_proposal_deliverables.sql:5-19`:
```sql
CREATE TYPE deliverable_change_status AS ENUM (
  'original','edited','added','removed','approved','rejected','countered');
CREATE TYPE deliverable_source AS ENUM ('ai_parsed','blueprint_tier','custom');
```
Table — `:23-60` (key columns): `id`, `inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE`, `name TEXT NOT NULL`, `description TEXT`, `price DECIMAL(10,2)`, `source deliverable_source DEFAULT 'custom'`, `source_blueprint_id UUID REFERENCES blueprints(id)`, `source_tier_name TEXT`, `ai_confidence DECIMAL(3,2)`, `ai_source_text TEXT`, `change_status deliverable_change_status DEFAULT 'original'`, `original_name/original_description/original_price` (diff snapshots), `counter_price DECIMAL(10,2)`, `counter_note TEXT`, audit (`created_by/at`, `updated_by/at`), `sort_order INT DEFAULT 0`. Indexes `:63-65` on `inquiry_id`, `change_status`, `source`.

Added later (no v1 column is ever dropped):
- **v2 counter fields + 2 enum values** — `20251224000001_deliverable_negotiation_v2.sql:7-19`: `ADD COLUMN counter_name TEXT, counter_description TEXT;` and `ALTER TYPE deliverable_change_status ADD VALUE 'counter_accepted'; ... 'counter_rejected';` → final `change_status` enum = **9 values**.
- **Hierarchy** — `20260110000020_deliverable_hierarchy.sql:7-8`: `ADD COLUMN parent_id UUID REFERENCES proposal_deliverables(id) ON DELETE CASCADE;` (self-ref; tree built at read time).

### 1.4 Other proposal child tables
- **`proposal_deliverable_comments`** — `20241224000002_deliverable_comments.sql:4-12`: `deliverable_id → proposal_deliverables ON DELETE CASCADE`, `content TEXT NOT NULL`, `author_id → profiles`, `created_at`. *(Built but unwired — see §5.)*
- **`proposal_deliverable_history`** (append-only) — `20251224000001_deliverable_negotiation_v2.sql:24-52`: snapshot per `version` with `CONSTRAINT unique_deliverable_version UNIQUE(deliverable_id, version)`. `change_status` here is **free-text TEXT** (snapshot); `action` is **free-text TEXT** (vocabulary is a comment only); only `actor_role TEXT CHECK (actor_role IN ('dfy','admin','system'))` is constrained. Comment `:80-81`: *"No updates or deletes - history is append-only."*
- **`inquiry_selections`** — `20260303000003_inquiry_selections.sql:2-16`: `inquiry_id → inquiries ON DELETE CASCADE`, `item_type CHECK (item_type IN ('blueprint','case_study'))`, `blueprint_id`/`case_study_id` (each `ON DELETE CASCADE`), `sort_order`, plus a CHECK enforcing exactly one FK matches `item_type`.
- **`conversations.inquiry_id`** — `20260103000002_conversations_dm_inquiry.sql:22` (one auto-created conversation per inquiry; partial-unique index).
- **DROPPED**: `inquiry_comments` table + `comment_type` enum were created (`20241221000007`, `...0009`) and then fully removed — `20260304000004_drop_inquiry_comments.sql:13-16`: `DROP TABLE IF EXISTS inquiry_comments CASCADE; DROP TYPE IF EXISTS comment_type;`. **Do not rebuild these.**

### 1.5 Status / lifecycle fields (every value)

**(a) `proposal_stage` — a Postgres ENUM.** Built across migrations: initial 5 (`20241222000001:5-11`: `pending, proposal_sent, proposal_verify, on_hold, agreed`), +6 (`20241223000001:8-13`: `unopened, admin_reviewed, in_queue, working, final_review, ready`), +`sent` (`20241225000002:4`), +`closed`,`lost` (`20241226000001:5-6`). Postgres can't remove enum values, so the type permanently contains **13 values**, but the data was migrated off the 4 originals (`20241223000002:8-11`: `pending→unopened`, `agreed→ready`, `proposal_sent→in_queue`, `proposal_verify→working`). **The 10 the app actually uses** (`lib/api/inquiries.ts:89`): `unopened, admin_reviewed, in_queue, working, on_hold, final_review, ready, sent, closed, lost`. `pending/proposal_sent/proposal_verify/agreed` are dead-but-valid enum members.

**(b) Legacy `status` — CHECK-constrained TEXT** (`20241221000005:13`): `new, processing, converted, rejected`. Never dropped; coexists with `proposal_stage`. In practice only written as a side-effect of conversion (`'converted'`) — see §5.3.

**(c) `deliverables_status` — ENUM** (`20241224000004:5-13`), 7 values: `none, parsing, dfy_editing, dfy_submitted, int_reviewing, approved, needs_revision`.

**(d) per-line `change_status` — ENUM**, 9 values (above). **This is the one machine with enforced transitions** (in app code — §4.2).

**(e) `deliverable_source` — ENUM**: `ai_parsed, blueprint_tier, custom`.

**DB-level transition enforcement: NONE.** No triggers/CHECKs/functions constrain how `proposal_stage`, `status`, `deliverables_status`, or `change_status` move from value to value — the enums only restrict the *set* of legal values. `stage_entered_at`/`stage_history` are maintained in app code, not by triggers.

### 1.6 RLS policies (verbatim)

**`inquiries`** — RLS enabled `20241221000005:41`. Policies `:44-63`:
```sql
CREATE POLICY "inquiries_dfy_select_own" ON inquiries FOR SELECT
  USING (auth.uid() IS NOT NULL AND get_user_role() = 'dfy' AND submitted_by = auth.uid());
CREATE POLICY "inquiries_dfy_insert" ON inquiries FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND get_user_role() = 'dfy');
CREATE POLICY "inquiries_admin_all" ON inquiries FOR ALL
  USING (auth.uid() IS NOT NULL AND get_user_role() IN ('admin', 'internal'));
```
DFY UPDATE (final version, `20260120000010_fix_dfy_deliverables_status.sql:6-21`): drops+recreates `inquiries_dfy_update_own` with `TO authenticated`, `USING/WITH CHECK (get_user_role()='dfy' AND submitted_by=auth.uid())`, plus `GRANT UPDATE ON inquiries TO authenticated;`. A `dfy` org-scoped SELECT also exists (`20260109000010:406` `inquiries_dfy_org_select`).
**Net:** admin/internal = ALL; dfy = SELECT/INSERT/UPDATE on own rows; **no dfy DELETE** (deletion is soft via `deleted_at`); **no anon/public policy** (see §2.4 for why this breaks the public view).

**`proposal_deliverables`** — **effectively open to any authenticated user.** A first, permissive set (`20241224000004_deliverables_rls.sql:9-19`) is never dropped:
```sql
CREATE POLICY "proposal_deliverables_select_policy" ON proposal_deliverables FOR SELECT USING (true);
CREATE POLICY "proposal_deliverables_insert_policy" ON proposal_deliverables FOR INSERT WITH CHECK (true);
CREATE POLICY "proposal_deliverables_update_policy" ON proposal_deliverables FOR UPDATE USING (true);
CREATE POLICY "proposal_deliverables_delete_policy" ON proposal_deliverables FOR DELETE USING (true);
```
A second, stricter set (`20241224000006_negotiation_rls.sql:37-78`, gated on `can_access_inquiry_deliverables(inquiry_id)` and `deliverables_status IN ('dfy_editing','needs_revision')`) is **OR-combined** with the `true` policies, so it adds no restriction. **As-committed, row isolation on this table is absent.**

**`proposal_deliverable_comments`** — same pattern (`...deliverables_rls.sql:22-29` `true` SELECT/INSERT + author-only DELETE; `negotiation_rls.sql:85-105` stricter set OR-combined). Effective: SELECT/INSERT open; DELETE = author or admin/internal.

**`proposal_deliverable_history`** — `20251224000001:70-78`: `history_select_all USING (true)`; `history_insert_authenticated WITH CHECK (auth.uid() IS NOT NULL)`; no UPDATE/DELETE → append-only.

**`inquiry_selections`** — `20260303000003:22-53`: admin/internal ALL; dfy SELECT/INSERT on own inquiry's rows; no public.

### 1.7 DB functions / triggers
- `handle_updated_at()` (`20241221000001_initial_schema.sql:225-231`) → trigger `update_inquiries_updated_at BEFORE UPDATE` (`20241221000005:66-69`).
- `get_user_role()` (`initial_schema.sql:189-192`, `SECURITY DEFINER STABLE`) — used by all proposal RLS.
- `can_access_inquiry_deliverables(p_inquiry_id)` (`20241224000006:12-30`) — admin/internal TRUE; dfy iff `submitted_by = auth.uid()`.
- `create_inquiry_conversation()` + trigger `inquiries_create_conversation AFTER INSERT` (`20260103000002:159-172`) — auto-creates the inquiry conversation.
- **No stage-transition or stage-history trigger exists.**

### 1.8 Relationships (FKs + ON DELETE)
- From `inquiries`: `submitted_by`, `assigned_to`, `archived_by/deleted_by`, `proposal_submitted_by`, `closed_by`, `dfy_organization_id` → various (all RESTRICT default); `blueprint_id → blueprints`; `converted_to_project_id → projects`.
- From `proposal_deliverables`: `inquiry_id → inquiries ON DELETE CASCADE`; `source_blueprint_id → blueprints`; `parent_id → proposal_deliverables ON DELETE CASCADE`.
- From `proposal_deliverable_comments`/`_history`: `deliverable_id → proposal_deliverables ON DELETE CASCADE`.
- From `inquiry_selections`: `inquiry_id → inquiries ON DELETE CASCADE`; `blueprint_id`/`case_study_id ON DELETE CASCADE`.
- **Project ↔ inquiry**: `projects.source_inquiry_id → inquiries` (`20241224000005`), made **UNIQUE** (`20260102000002:18-19` — at most one project per inquiry) **after** a cleanup `DELETE` of duplicates; plus the reverse `inquiries.converted_to_project_id → projects`.

### 1.9 Migration churn (the FINAL state, not the intermediates)
1. `inquiry_comments` + `comment_type` — **created then fully dropped**; comment plumbing (incl. a one-time message backfill, `20260111000002`) is gone. Proposal discussion now lives in `conversations`/`messages` + the `proposal_discussions`/`inline_discussions` JSONB columns.
2. `estimated_value` → **renamed** `price_dfy`. No `estimated_value` in end state.
3. `proposal_stage` — 4 dead enum values permanently retained; **use the 10 listed in §1.5(a)**.
4. `deliverable_negotiation_v2` **adds to** v1 (no drops): v1 `counter_price/counter_note` + v2 `counter_name/counter_description` coexist; history table is new.
5. `proposal_deliverables` RLS **effectively open** (the `true` policies were never dropped).
6. `proposal_reminders` migration is a **1-byte stub** → the entire reminder/snooze/escalation column set is **not in repo**.
7. `seed.sql` contains **no** inquiry/proposal/deliverable rows (only blueprints, one project, project-phase deliverables, milestones, a scope_change). No proposal seed to copy.

---

## 2. Backend / API Surface

### 2.1 Server actions (`features/inquiries/actions/*`, `'use server'`)
Unless noted, each uses the RLS client (via `lib/api`), has **no in-code role check**, and `revalidatePath`s the relevant inquiry/list.

**`proposalActions.ts`** — `saveProposalContentAction` (`:14`, writes `proposal_content`+`proposal_discussions`, **no revalidate** = autosave), `submitProposalAction`→`submitProposalToDfy` (`:29`, stage→`sent`), `unsubmitProposalAction` (`:35`, `sent`→`ready`), `submitForReviewAction` (`:41`, →`final_review`), `approveProposalAction` (`:48`, `final_review`→`ready`), `saveDfyVersionAction` (`:55`), `copyProposalToDfyVersionAction` (`:69`).

**`deliverableActions.ts`** — contains the AI extractor inline (`parseDeliverablesWithAI`, `:75-194`) and the persisting trigger `triggerParseDeliverablesAction` (`:200-252`, sets `deliverables_status` `parsing`→`dfy_editing`/`none`). CRUD + negotiation: `createDeliverableAction` (`:258`), `updateDeliverableAction` (`:266`), `deleteDeliverableAction` (`:276`), `markDeliverableRemovedAction` (`:284`), `revertDeliverableAction` (`:293`), `addFromBlueprintTierAction` (`:306`), `submitDeliverablesForReviewAction` (`:328`), `withdrawDeliverablesSubmissionAction` (`:335`), `startReviewAction` (`:346`), `reviewDeliverableAction` (`:351`, decision `approved|rejected|countered`), `bulkApproveDeliverablesAction` (`:372`), `finalApproveDeliverablesAction` (`:380`), `sendBackForRevisionAction` (`:387`), `acceptCounterAction` (`:432`), `rejectCounterAction` (`:441`), `getDeliverableHistoryAction` (`:455`), and (dead) comment actions (`:398,408`).

**`conversionActions.ts`** — `markAsClosedAction` (`:17`), `unmarkAsClosedAction` (`:27`), `convertToProjectAction` (`:37`)/`convertAndRedirectAction` (`:58`, → `redirect('/projects/${id}')`), `reopenInquiryAction` (`:83`). *(The convert actions are dead — §5.2.)*

**`reminderActions.ts`** — `snoozeReminderAction` (`:18`), `markLostAction` (`:32`), `markWonAction` (`:47`, reuses `markInquiryAsClosed`, captures optional client email), `requestAdminHelpAction` (`:62`), `clearEscalationAction` (`:73`), `trackDfyViewAction` (`:83`), `requestUpdatesAction` (`:93`). *(All touch the missing reminder columns — §5.1.)*

**`documentActions.ts`** — `saveInquiryDocument` (`:5`, writes `document_content`, **silently swallows errors**), `saveInquiryDocumentWithDiscussions` (`:18`).

**`inquiryActions.ts`** — archive/unarchive/delete(soft→redirect)/restore, plus `updateStageAction` (`:56`, free-form stage set), `updatePriorityAction`, `updateDueDateAction`, `assignInquiryAction`, `updatePriceDfyAction`, `bulkUpdateStageAction` (`:102`), `updatePricingAction` (`:110`). `updateInquiryStatusAction` (`:46`, legacy `status` writer) is **dead** (no caller).

**`submitInquiry.ts`** — `submitInquiry(data)` (`:7`) → `createInquiry`.

**`features/project-initiation/actions/initiationActions.ts`** — `completeInitiationAction` (`:49-320`): **the only proposal action that uses the Supabase client directly and guards `if (!user) throw` (`:66`).** The live convert-to-project path (§4.4).

### 2.2 Data-access lib (`lib/api/*`, RLS client)
- **`inquiries.ts`** — `createInquiry` (`:21`, writes `inquiry_selections`, notifies admins), `getInquiries`/`getInquiry`, `updateInquiryStage` (`:275-353`, the central stage mutator: appends `stage_history`, **no transition validation**, notifies assignee + DFY on sent/closed/lost), `getInquiryByPublicToken` (`:433-475`, the public read — §2.4), `getInquiryPublicToken` (`:501`), `updateInquiryProposal` (`:519`), `submitProposalToDfy` (`:538`), `unsubmitProposalFromDfy` (`:602`), `updateDfyVersion`/`copyProposalToDfyVersion` (`:639/653`), `updateDeliverablesStatus` (`:681`, no validation), `markInquiryAsClosed` (`:699`), `unmarkInquiryAsClosed` (`:755`), `reopenInquiry` (`:796`, **guarded**: only `closed`/`lost`), `convertInquiryToProjectFull` (`:861`, the other convert path w/ rollback), plus stage/count read helpers. Exposes types `ProposalStage` (`:89`) and `DeliverablesNegotiationStatus` (`:12-19`).
- **`proposal-deliverables.ts`** — `VALID_TRANSITIONS` (`:20-30`) + `assertValidTransition` (`:32-36`); create/bulk-create-from-AI/bulk-from-blueprint; `updateProposalDeliverable` (`:333`), `reviewDeliverable` (`:486`), `revertDeliverable`, `markDeliverableRemoved`, `acceptCounter`/`rejectCounter`; `insertHistory` (`:721-778`, append-only, retries on unique-violation `23505`); `getDeliverablesSummary` (`:681`). `proposal-deliverables.utils.ts` — pure `buildDeliverableTree`/`flattenDeliverableTree`.
- **`deliverables.ts`** — the **project** deliverables (post-conversion target), not the negotiation table.
- **`deliverable-notes.ts`** — notes on **project** deliverables (post-conversion).
- **`proposal-reminders.ts`** — constants `REMINDER_DAYS=21`, `SECONDARY_REMINDER_DAYS=35`, `ESCALATION_DAYS=49`, `SNOOZE_DAYS=14`, `MAX_SNOOZES=3` (`:5-9`); `getStaleProposalsForDfy` (`:44`, the one live query), plus several unused admin queries (§5.2); `snoozeReminder` (auto-escalates at cap), `markProposalLost`, `escalateToAdmin`, `requestProposalUpdates`. **All read/write the missing reminder columns (§5.1).**

### 2.3 Route handlers (`app/api/*`)
- **`generate-brief/route.ts`** `POST` (`:117-381`) — RLS client; 401 if no user (`:122-128`); calls OpenRouter model `anthropic/claude-haiku-4.5` (`:210`, key «redacted»); returns a **redacted** markdown brief; **no DB writes**. (Used by the opportunities feature, not the proposal flow.)
- **`parse-deliverables/route.ts`** `POST` (`:53-231`) — same shape; returns parsed deliverables only, **no DB writes**. **DEAD — no caller** (the action `triggerParseDeliverablesAction` calls OpenRouter itself; comment `deliverableActions.ts:209`: *"no internal API route needed"*).
- **`cron/proposal-expiry/route.ts`** `GET` (`:10-123`) — **service-role client** (`:2,17`, RLS bypass). Auth gate `:12-14`: `if (authHeader !== \`Bearer ${process.env.CRON_SECRET || ''}\`) return 401`. Finds `proposal_stage='sent'` older than `STALE_DAYS=14` (`:5`), dedups against `proposal_ready` notifications via a `message LIKE %companyName%` (`:64-71`, comment admits it's a proxy "since notifications has no inquiry_id FK"), inserts notifications for the DFY + all admins. **Not scheduled anywhere in repo** (no `vercel.json`/crons config) and has a weak empty-secret fallback (§5.1).

### 2.4 Public / no-login token access
- **Minting:** the token is `public_token UUID DEFAULT gen_random_uuid()` (`20241222000001:36`) — **every inquiry has one from creation.** There is no on-demand mint/share action; no `randomUUID`/`nanoid`/`crypto` generation code (`grep` of `lib/api/inquiries.ts` = none). `ShareLinkButton.tsx:29` just builds `${origin}/p/${publicToken}` client-side from a prop.
- **Validation:** `app/p/[token]/page.tsx` (`dynamic = 'force-dynamic'`, **no auth guard**) → `getInquiryByPublicToken(token)` → `notFound()` on null/throw. The query (`lib/api/inquiries.ts:458-459`) matches `WHERE public_token = token AND deleted_at IS NULL` and increments `client_view_count`/`client_viewed_at`.
- **Expiry / revoke: NONE.** No expiry column, no `revoked`/`is_public` flag, no TTL anywhere. A link is valid forever; the only way to kill it is soft-deleting the inquiry. **State this explicitly to the rebuild team.**
- **⚠ The public read has no enabling RLS policy (BROKEN as-committed).** `getInquiryByPublicToken` uses the **RLS anon client**, but `inquiries` RLS has **no `TO anon`/`TO public`/`USING(true)` SELECT policy** — every policy requires `auth.uid()`/`get_user_role()` (verified by `grep`; by contrast `invoices` explicitly adds `CREATE POLICY "Public view invoice via token" ... TO public` in `20260109000002_invoice_public_access.sql:8-11`, and inquiries never got the equivalent). With RLS enabled and no permissive anon policy, an anonymous visitor's query returns no row → `notFound()`. **As-committed the public proposal view does not work for logged-out users** unless a public policy exists in the live DB not present in repo. (`middleware.ts` does not block `/p/`; `lib/supabase/middleware.ts` only refreshes the session — the gate is purely the RLS read.)

### 2.5 PDF / export / email
- **Library `@react-pdf/renderer`, generated CLIENT-SIDE only.** `ProposalPDF.tsx` (`'use client'`) renders header (partner logo, prospect, date), optional blueprint, body via `plateNodesToPdfElements(documentContent)`, and an **"Investment"** block from `price_dfy`+`pricing_notes` (`:197-209`); footer = `Contact: {partner_name}` (`:212-215`). **No Hexona branding in the PDF.** `ExportPDFButton.tsx:37-56` runs `pdf(<ProposalPDF/>).toBlob()` in the browser and triggers a download — **no server round-trip, no storage, no email.** The public view embeds the same button, so prospects can download it.
- **Email: NONE for proposals.** Resend exists (`lib/email/`) but only for invitations + dev-application templates; `grep` for `resend|sendEmail` in any proposal action/lib = none. Proposals are shared by link + client-downloaded PDF only.

### 2.6 Notifications / webhooks / cron
In-app notifications only (no webhooks for proposals; only outbound HTTP is to OpenRouter):

| Trigger (file:line) | Recipient | type |
|---|---|---|
| `createInquiry` (`inquiries.ts:74`) | admins | `inquiry_created` |
| `submitProposalToDfy` (`:576`) | DFY (`submitted_by`) | `proposal_ready` |
| `submitProposalToDfy` (`:590`) | admins | `proposal_sent` |
| `updateInquiryStage` (`:327`) | assignee | `stage_changed` |
| `updateInquiryStage` sent/closed/lost (`:342`) | DFY | `stage_changed` |
| `assignInquiry` (`:398`) | assignee | `assigned` |
| `markInquiryAsClosed` (`:743`) | admins | `inquiry_won` |
| `markProposalLost` (`proposal-reminders.ts:316`) | admins | `inquiry_lost` |
| `escalateToAdmin` (`:353`) | admins | `escalation_admin` |
| `completeInitiationAction` (`initiationActions.ts:129`) | project stakeholders | `project_created` |

### 2.7 Stage-transition enforcement
**Two independent machines.** The **inquiry `proposal_stage` is unguarded** — `updateInquiryStage` (`inquiries.ts:275`) writes any stage with no source-state validation; UI gates buttons by stage but a direct action call can do `unopened→closed`. The **only** guard is `reopenInquiry` (`:810-812`, throws unless current is `closed`/`lost`). By contrast the **deliverable `change_status` machine IS enforced** via `assertValidTransition` (§4.2). `bulkUpdateInquiryStage` and `bulkApproveDeliverables` both bypass validation.

---

## 3. Frontend

### 3.1 Route pages
- **`app/(dashboard)/inquiries/page.tsx`** — list. Role-gated to `admin/internal/dfy` (`:28`); header "All Inquiries" vs "My Submissions" (`:58-65`); 5 stat cards; renders `<InquiryListView>` (which holds the table/board toggle). Data via `getInquiries(filter)` (`:43`).
- **`app/(dashboard)/inquiries/new/page.tsx`** — `requireRole(['admin','internal','dfy'])` (`:8`); fetches blueprints + case studies; renders `<IntakeForm>`.
- **`app/(dashboard)/inquiries/[id]/page.tsx`** — **the detail spine (971 lines).** Role gate + DFY-ownership check (`:212-218`). **Auto-advance** (`:220-236`): admin viewing an `unopened` inquiry stamps `admin_viewed_at` and bumps stage to `admin_reviewed`. Permission vars (`:238-250`): `isAdmin`, `isDfyOwner`, `proposalSubmitted`, `canEdit=isAdmin`. Tab gating: `showProposalTab = isAdmin || isDfyOwner` (`:244`), `showMyVersionTab = isDfyOwner` (`:245`), `showDeliverablesTab = proposalSubmitted` (`:258`). Loads `getInquiry`, `getProposalDeliverables`, blueprints, `inquiry_selections`, and `generateDocumentFromInquiry(...)`. Defines ~25 bound server-action closures (`:315-477`). Tabs: **Overview / Document / Proposal / My Version / Deliverables** (all `forceMount`). The Overview "Convert to Project" is a plain `<Link href={/inquiries/${id}/initiate}>` (`:842-846`) — **not** the imported `ConvertToProjectButton` (which is never rendered — §5.2).
- **`app/(dashboard)/inquiries/[id]/initiate/page.tsx`** — **admin-only** (`:16-18`, `notFound()` for non-admin, incl. internal); guards against already-converted/lost (`:35`); renders `<InitiateWizard>` from `features/project-initiation` (the live convert UI).
- **`app/p/[token]/page.tsx`** — public, no auth; renders `<PublicProposalView>` (§3.3).
- `loading.tsx`/`error.tsx` present for both list and detail.

### 3.2 Operator detail tabs & builder
- **`ProposalTab.tsx`** — the proposal body is a **rich-text Plate editor, not structured sections + line items.** `readOnly = !isAdmin` (`:149`); admins edit with full comment/suggestion/discussion plugins, DFY sees read-only (content first run through `sanitizeContentForReadOnly`, `:218-247`). **Autosave: 1500 ms debounce** (`:288-332`) with a tri-state SaveStatus indicator. Workflow buttons (all `ButtonHoldAndRelease holdDuration={2000}`):

  | Label (color) | Visible when | Fires |
  |---|---|---|
  | **Submit for Review** (yellow) | admin & stage ∉ {final_review,ready,sent,closed,lost} | `submitForReviewAction` → `final_review` |
  | **Approve** (green) | admin & stage = `final_review` | `approveProposalAction` → `ready` |
  | **Submit to Partner** (cyan) | admin & stage = `ready` & !submitted | `submitProposalAction` → `sent` |
  | **Undo Send** | admin & submitted | `unsubmitProposalAction` → `ready` |

  Sidebar "Suggest Changes" card appears only for `isDfyOwner && isSubmitted && deliverablesStatus==='none'` (`:71,160-172`).
- **`MyVersionTab.tsx`** — DFY-owner private copy ("Only you can see this tab", `:80-87`); gated until `proposal_submitted_at`; autosave 1500 ms; **"Import from Proposal"** copies `proposal_content`→`dfy_version_content` and `editor.tf.setValue(...)` in place (`:182-198,241-270`).
- **`InquiryDocument.tsx` / `InquiryDocumentTab.tsx` / `FullscreenDocument.tsx`** — the auto-brief body; autosave 1500 ms **plus a 500 ms poll** diffing discussions (comments don't fire onChange) (`InquiryDocument.tsx:144-166`); fullscreen via `createPortal`, Esc-to-close, body-scroll lock.
- **`QuickPricingEditor.tsx`** — Overview sidebar pricing. Role gates (`:33-40`): client price editable by admin/dfy; internal prices by admin only; internal visible to admin/internal. Input sanitize `replace(/[^0-9.]/g,'')` (`:51`); **explicit Save** (not autosave) → `updatePricingAction`.
- **`editor/plugins.ts`** — editor is **Plate / platejs**; `createInquiryDocumentPlugins(user, discussions)` = basic blocks + marks + Comment + Suggestion + Discussion kits; read-only paths use the simpler `BlueprintEditorPlugins`.

### 3.3 Client-facing public view (`PublicProposalView.tsx`)
Read-only. **Visible:** "Proposal for {company}", prepared date, optional blueprint "Solution Type", the body (`proposal_content` if `proposal_submitted_at` set & non-empty, else falls back to `document_content`, `:52-58`), an **"Investment"** card = `price_dfy` (USD, no cents) + `pricing_notes` (only if either is set, `:155-171`), footer "Contact your representative: {partner_name}", and an Export-PDF button. **Hidden:** `price_hexona`/`price_dev` (fetched but never rendered), no deliverables/line-item table, no stage info. **Branding:** partner logo appears in the PDF only; no Hexona branding on-screen or in PDF.
**Accept / reject / sign / comment: NONE.** The view is strictly read-only — no button, form, or server action for client response exists anywhere in `/p/[token]` or `PublicProposalView`. Client engagement is captured passively via `client_view_count`/`client_viewed_at` only. **State this plainly: the prospect cannot accept, sign, reject, or comment in this system.**

### 3.4 Deliverable negotiation UI (`features/inquiries/components/deliverables/*`)
- **`DeliverablesTab.tsx`** orchestrates by `deliverables_status`: `none` → Extract/Add card; `parsing` → spinner; else table + `StatusBanner` (`:413-487`) + role-appropriate actions. UI gates (`:94-118`): `isEditable` (dfy & dfy_editing/needs_revision), `isReviewer` (admin & int_reviewing), `canFinalApprove` (admin & int_reviewing & **every line resolved**, `:101-110`). Admin is hidden while DFY edits (`:249`).
- **`DeliverableStatusBadge.tsx`** — label map: `original`→"Original", `edited`→"Edited", `added`→"Added", `removed`→"Removed", `approved`→"Approved", `rejected`→"Rejected", `countered`→"Countered", `counter_accepted`→"Accepted", `counter_rejected`→"Counter Rejected" (`:7-56`). Helpers `needsReview`/`isFinalStatus`/`needsDfyResponse`.
- **`DeliverablesTable.tsx`** (columns + totals), **`DeliverableRow.tsx`** (inline edit; admin Approve/Reject/Counter; DFY Edit/Remove/Revert), **`DeliverableDiff.tsx`** (strikethrough-original → highlighted-new; price/counter/totals), **`CounterOfferDialog.tsx`** (admin proposes counter name/desc/price/note; sends only changed fields), **`CounterResponseCard.tsx`** (DFY Accept/Reject-with-reason/Edit-Again), **`DeliverableHistory.tsx`** (lazy-loaded version timeline), **`AddDeliverableModal.tsx`** (From-Blueprint / Custom; "price set to 'Pending Review'"), **`BlueprintTierSelector.tsx`** (tier radio; last tier "Recommended").

### 3.5 Intake / builder wizard
`IntakeForm.tsx` — **react-hook-form + zod** (`:62-67`), local-state steps `initial → closed_type|proposal_type → path_form → forward → confirmation`. Six derived paths `A1/A2/A3/B2/B3` (+ **B1 = info-only dead-end**). `steps/*`: `InitialStep`, `ClosedDealType`, `ProposalType`, `BlueprintInfo` (B1; "View Blueprint Library" is `href="#"` placeholder, `:57-58`), `ClosedBlueprint` (A1), `ClosedCustom` (A2/A3), `VariationProposal` (B2), `CustomProposal` (B3, 7-section form), `ForwardForm`, `ConfirmationScreen`. **AI Copilot** sidebar (`AICopilotSidebar.tsx`) POSTs to `/api/copilot`, sets fields via a tool call + an "ai-filled-flash" animation. Intake sidebars `BlueprintDetailsSidebar`/`CaseStudyPreviewSidebar`.

### 3.6 Workflow / action components & list views
- **`StageBadge.tsx`** — 10-stage config with **DFY relabeling** via `viewAs='dfy'` (`sent`→"READY", `closed`→"WON"; `:38-50`). Exports `STAGE_ORDER`.
- `StageHistoryTimeline`, `InquiryActions` (admin Archive/Delete, hold-to-confirm), `ShareLinkButton`, `ExportPDFButton(+Wrapper)`, `MarkAsClosedButton`, `ReopenInquiryButton`, `SuggestChangesButton`, `ProposalStatusDialog` (Won/Lost/Snooze/Help), `StaleProposalsBanner` (**mounted** at `app/(dashboard)/dashboard/dfy/page.tsx:123`), `CreateOpportunityButton`.
- **List views**: `InquiryListView` (table/board toggle, realtime, optimistic drag), `InquiryBoardView` (10-column kanban), `InquiryTableView` (collapsible stage groups, drag-between).

### 3.7 Design details worth preserving
Hold-to-confirm (`ButtonHoldAndRelease`, 2000 ms / 1500 ms for archive) on every consequential action; color-coded workflow buttons (yellow/green/cyan); uniform 1500 ms autosave + tri-state SaveStatus (+500 ms discussion poll on the brief); fullscreen editor via portal w/ Esc + scroll-lock; AI-fill flash; diff rendering with "(counter)" treatment and totals delta pill; **DFY stage relabeling**; polished radio "cards" with celebratory copy; dual kanban/table views with realtime + optimistic revert + overdue highlighting + "viewed by admin" green-eye; A4 PDF (Helvetica, cyan accents, partner logo, page numbers); empty states throughout.

### 3.8 Orphaned UI
- **`features/inquiries/components/conversion/*`** (`ConvertToProjectButton`, `ConvertToProjectWizard`, `RequirementsBuilder`, `index.ts`) — `ConvertToProjectButton` is **imported** at `inquiries/[id]/page.tsx:25` but **never rendered** (`grep` for `<ConvertToProjectButton` = none); the live convert is the `/initiate` link → `InitiateWizard`. The bound `convertToProjectAction` closure is unreferenced. **Entire directory is dead.**
- **`AdminProposalUpdatePanel.tsx`** — imported nowhere; unreachable.

---

## 4. Business Logic

### 4.1 Pricing math
**Two independent pricing systems, not linked by any formula:**
- **(A) Inquiry-level "headline" prices** — flat scalars `price_dfy` / `price_hexona` / `price_dev` + `pricing_notes` on the inquiry. The client-facing **"Investment" is `price_dfy` alone** (`PublicProposalView.tsx:161`; `ProposalPDF.tsx:197-209`) — never a sum of line items. No code writes the deliverable sum back into `price_dfy`. No margin is ever computed from hexona/dev.
- **(B) Line-item prices** — each `proposal_deliverables.price` (+ `original_price`, `counter_price`).

**Currency:** USD-only, hardcoded (`Intl.NumberFormat('en-US',{currency:'USD'})` in each component); **whole dollars** (no cents conversion). **No discounts, no taxes, no subtotals** anywhere (`grep` for discount/tax/vat/subtotal in proposal code = none).

**⚠ Two line-sum formulas that disagree on `counter_price`:**
- Server `getDeliverablesSummary` (`lib/api/proposal-deliverables.ts:681-714`): `total = activeDeliverables.reduce((s,d)=> s + (d.price || 0), 0)` — **ignores counter_price**; excludes `removed`/`rejected`.
- Client `DeliverablesTable.tsx:63-85` (and `ConvertToProjectWizard.tsx:178-180`): `const effectivePrice = d.counter_price ?? d.price ?? 0` — **prefers counter_price**; excludes `removed`/`rejected`.

**"Pending Review"** is UI text for a `null` price (`AddDeliverableModal.tsx:146`; stored `price: input.price ?? null`, `proposal-deliverables.ts:206`); `PriceDiff` renders `null` as `"TBD"`.

### 4.2 Negotiation state machine
**Inquiry-level `deliverables_status`** (7 values) — set by `updateDeliverablesStatus` with **no validation**; the workflow is driven by actions/UI guards:
`none →(extract)→ parsing →(AI ok)→ dfy_editing →(submit)→ dfy_submitted →(start review)→ int_reviewing →(final approve)→ approved`, with `int_reviewing →(send back)→ needs_revision → dfy_editing`, and `dfy_submitted →(withdraw)→ dfy_editing`. The **final-approve guard is client-side only** (`DeliverablesTab.tsx:101-110`): every line must be `original|approved|rejected|counter_accepted`; the server action does **not** re-check it.

**Per-line `change_status`** (9 values) — **server-validated** via `VALID_TRANSITIONS` (`proposal-deliverables.ts:20-30`) + `assertValidTransition` (`:32-36`):
```
original:          ['edited','approved','rejected','countered','removed'],
added:             ['edited','approved','rejected','countered','removed'],
edited:            ['approved','rejected','countered','removed','original','added'],
removed:           ['original','added'],
approved:          ['edited'],
rejected:          ['edited'],
countered:         ['counter_accepted','counter_rejected'],
counter_accepted:  [],            // terminal
counter_rejected:  ['countered','approved','rejected'],
```
Initial status = `ai_parsed ? 'original' : 'added'` (`:213`). DFY edits snapshot `original_*` once and move to `edited`; admin `reviewDeliverable` sets approved/rejected/countered (writes `counter_*`); DFY `acceptCounter` applies counter values onto live fields and clears them (terminal), `rejectCounter` keeps them for re-review. **`bulkApproveDeliverables` bypasses `assertValidTransition`** (`:544-568`).

### 4.3 Versioning / revisions
- **Three parallel Plate-JSON bodies on the same inquiry row**, not versions: `document_content` (brief), `proposal_content` (official), `dfy_version_content` (DFY "My Version"). Saving overwrites; **no true document versioning.** "Import from Proposal" copies `proposal_content → dfy_version_content`. Public view prefers `proposal_content` when submitted, else `document_content`.
- **Deliverable history** (`proposal_deliverable_history`) IS real append-only versioning: `insertHistory` (`:721-778`) computes `version = last+1`, retries on unique-violation `23505`, records a full snapshot + `action`/`actor_role`/`note`. Actions: `created, dfy_edited, dfy_removed, dfy_added, int_approved, int_rejected, int_countered, dfy_accepted_counter, dfy_rejected_counter, reverted`.
- **Stage history** (`stage_history` JSONB) is persisted (appended on every change) and rendered by `StageHistoryTimeline`.

### 4.4 Acceptance / close / conversion cascade
- **No "accepted" boolean.** Acceptance = **Won/Closed** via `markInquiryAsClosed` (`inquiries.ts:699-752`): sets `closed_at/by`, `closed_notes`, `client_email`, `proposal_stage='closed'`, appends history, notifies admins `inquiry_won`. Reached from `MarkAsClosedButton` (notes only) or `ProposalStatusDialog` "Won!" (captures a client email "to invite the client to the portal"). It does **not** create a project.
- **Lost** via `markProposalLost` (`proposal-reminders.ts:276-325`): `proposal_stage='lost'`, writes `lost_reason`, clears reminder state, notifies `inquiry_lost`. *(Writes the missing `lost_reason` column — §5.1.)*
- **Conversion → project has TWO implementations:**
  - **(A) `convertInquiryToProjectFull`** (`inquiries.ts:861-1031`) — used by the (dead) modal path; **has rollback** (`delete project` on error, `:1027`) + idempotency. Copies deliverables with `name`+**`price`**, where `price = change_status==='counter_accepted' ? (counter_price ?? price) : price` (`:977`).
  - **(B) `completeInitiationAction`** (`initiationActions.ts:49-320`) — **the live path** (the `/initiate` wizard). **No rollback.** Copies deliverables as `title` (= name) with **no price column**; builds a requirements **tree**; fires `project_created`.
  - Both: create the project at `status:'deliverables_pending'`, set `dfy_partner_id = inquiry.submitted_by`, `source_inquiry_id`, copy prices/dates, filter out `removed`/`rejected` deliverables, mark the inquiry `status='converted'` + `proposal_stage='closed'`.
  - **Milestone math (identical, quoted):**
```
const priceDfy = projectData.price_dfy || 0
'100_upfront' → [{label:'Full Payment', amount: priceDfy}]
'50_50'       → [50% deposit, 50% final]            // priceDfy*0.5 each
'40_30_30'    → [40% deposit, 30% midpoint, 30% final]
'custom'      → custom_milestones.map(m => priceDfy * (m.percentage/100))
```
  All milestone amounts derive from `price_dfy` only (never the deliverable sum). Custom percentages are **not** validated server-side to sum to 100 (the wizard only shows a hint).

### 4.5 Templates / duplication / AI generation
- **Blueprint tier → line items** (`bulkCreateFromBlueprintTier`, `proposal-deliverables.ts:277-327`): each tier *feature* becomes one deliverable named after the feature, `change_status='added'`, **the whole `setup_price` is placed on the FIRST feature only** (rest `null`); **`monthly_price` is dropped.**
- **Custom deliverable**: `price=null` ("Pending Review"), `source='custom'`, status `added`.
- **AI "Extract from Proposal" / "Suggest Changes"** (`triggerParseDeliverablesAction` → `parseDeliverablesWithAI`, `deliverableActions.ts:75-252`): input = `proposal_content` text (throws if <10 chars); OpenRouter `anthropic/claude-haiku-4.5`, forced tool `extracted_deliverables`; output per line = `{name, description, price?, sourceText, confidence}`; persisted as `source='ai_parsed'`, `change_status='original'`, `ai_confidence`, `ai_source_text`; degrades to manual add on empty/error.
- **"Import from Proposal"** (My Version) — copies `proposal_content → dfy_version_content`. No generic "duplicate inquiry" exists.

---

## 5. Honest Assessment

### 5.1 BROKEN / BUGS (highest impact)
1. **The stale-proposal reminder system is non-functional as-committed (missing schema).** The code is complete and well-designed — `getStaleProposalsForDfy` (`proposal-reminders.ts:44`), `snoozeReminder`, `markProposalLost`, `escalateToAdmin`, `requestProposalUpdates`, and the mounted `StaleProposalsBanner` (`dashboard/dfy/page.tsx:123`) — **but every one reads/writes columns that no migration creates**: `reminder_snoozed_until`, `reminder_snooze_count`, `reminder_escalated_at`, `dfy_first_viewed_at`, `lost_reason`, `admin_update_requested_at` (repo-wide `grep` = zero definitions; the reminders migration is a 1-byte stub). As-committed these queries error at runtime ("column does not exist"), so the DFY follow-up loop — and `markLost` — cannot work unless the columns were added out-of-band in the live DB. **Rebuild: create the reminder columns explicitly; this is the single highest-impact gap.**
2. **The public `/p/[token]` view has no enabling RLS policy** (§2.4) — anonymous reads return nothing as-committed. **Rebuild: add an explicit public/token SELECT policy (mirror `invoices`), or serve the public read via the service-role client with a tight column whitelist.**
3. **The expiry cron is not scheduled and has a weak auth fallback.** No `vercel.json`/crons in repo; and `if (authHeader !== \`Bearer ${process.env.CRON_SECRET || ''}\`)` (`proposal-expiry/route.ts:13`) authenticates an empty token when `CRON_SECRET` is unset. **Rebuild: schedule it; fail-closed if the secret is missing.**
4. **No inquiry stage-transition guards** (§2.7) — `updateInquiryStage`/`updateStageAction`/`bulkUpdateStageAction` accept any stage. **Rebuild: add a server-side transition map like the deliverable one.**
5. **Two competing stale definitions** — cron `STALE_DAYS=14` vs in-app `REMINDER_DAYS=21`, on the same `sent` set; cron dedup is a fragile `message LIKE %companyName%` (collisions). **Rebuild: one definition; give `notifications` an `inquiry_id` FK and dedup on it.**
6. **Reopen writes an invalid legacy value** — `reopenInquiry` (`inquiries.ts:830`) writes `status:'pending'`, which is not in the `status` CHECK set (`new/processing/converted/rejected`). **Rebuild: drop the legacy `status` (see 5.3).**
7. **Final-approve guard is client-only** (`DeliverablesTab.tsx:101-110`) — the server action doesn't re-enforce "all lines resolved"; and `bulkApproveDeliverables` bypasses `assertValidTransition`. **Rebuild: enforce on the server.**

*(Verified NOT a bug: the share link is correct — `ShareLinkButton.tsx:29` builds `/p/${public_token}` and the page resolves `.eq('public_token', token)`; there is no id-vs-token mismatch in the proposal flow.)*

### 5.2 DEAD CODE (delete in rebuild)
- **Entire `features/inquiries/components/conversion/*`** + `convertToProjectAction`/`convertAndRedirectAction` (§3.8) — superseded by `InitiateWizard`.
- **`AdminProposalUpdatePanel.tsx`** + its only consumers `requestUpdatesAction`/`requestProposalUpdates` + the `admin_update_requested_at` column — no mounted UI.
- **`app/api/parse-deliverables/route.ts`** — no caller (the server action calls OpenRouter directly). *(Keep `generate-brief` — used by opportunities.)*
- **~20 unused exports**: in `proposal-reminders.ts` the unbuilt admin stale-dashboard queries (`getAllStaleProposals`, `getEscalatedProposals`, `getStaleProposalCount`, `bundleProposalsByDfy`, `getAllSentProposals`) and the unused `SECONDARY_REMINDER_DAYS`/`ESCALATION_DAYS` thresholds (escalation actually triggers off `MAX_SNOOZES`); the **per-deliverable comments feature** (`proposal_deliverable_comments` table + `getDeliverableComments` + `addDeliverableCommentAction`/`deleteDeliverableCommentAction`) — built but unwired; legacy `updateInquiryStatusAction` and `convertInquiryToProject` (2-arg); `getProposalDeliverable`/`getDeliverablesSummary`.
- **Debug `console.log` noise** in production server paths (`deliverableActions.ts:90,165,182,204,214,220,228`; `proposal-deliverables.ts:429,431,744,764,771,775`; `InquiryListView.tsx:51`).

### 5.3 AWKWARD-BUT-WORKS (fix, don't copy)
- **Dual status systems** — collapse `status` into `proposal_stage` (represent "converted" as a stage or via `converted_to_project_id IS NOT NULL`).
- **Three parallel Plate bodies** that can drift — model one canonical body + explicit branches if a private DFY copy is truly needed.
- **"Pending Review" overloads `null`** — add an explicit `price_status`.
- **`proposal_stage` hard enum churned 4× in 4 days** (4 permanent dead values) — finalize the vocabulary or use text+CHECK/lookup.
- **Deliverable hierarchy + blueprint many-to-many bolted on late** (`parent_id`; `inquiry_selections` vs derived `blueprint_id` dual-write) — design these in from the start.
- **`inquiry_comments` was built, sync'd to messages, then dropped** — don't build sync plumbing for a subsystem you'll replace.
- **Duplicate-project bug already hit prod** (`20260102000002` deletes dupes before adding the UNIQUE constraint) — enforce uniqueness from day one.
- **Hardcoded AI model** in three places — centralize in config; dedupe the copy-pasted prompt.

### 5.4 SOLID — KEEP
- **The deliverable negotiation FSM** (`VALID_TRANSITIONS` + `assertValidTransition`, enforced across update/review/accept/reject/revert) — a real guarded multi-round counter machine. Make the inquiry-stage system copy this.
- **Append-only history with race-safe retry** (`insertHistory`, unique-version constraint, `23505` retry) — correct optimistic concurrency + immutable audit.
- **The stale-proposal follow-up UX** (banner → `ProposalStatusDialog` quadrant → snooze-with-cap → auto-escalate) — coherent design; just give it the schema it needs (5.1).
- **Role-relabeled stages** (`sent`→READY, `closed`→WON via `viewAs`).
- **Hold-to-confirm** on all consequential actions.
- **Transactional conversion with manual rollback + idempotency** (`convertInquiryToProjectFull`) — though the *live* path (`completeInitiationAction`) lacks the rollback and should gain it.
- **Read-only Plate sanitization** to avoid plugin-mismatch crashes.

### 5.5 Tests
Effectively **zero behavioral coverage.** Only two **type-level** files exist (`features/inquiries/__tests__/types.test-d.ts`, `fieldMappings.test-d.ts`). Untested: the negotiation FSM, `insertHistory` race retry, snooze/escalation, conversion rollback, stage transitions, AI-parse degradation, pricing parse, cron auth. **Rebuild: prioritize tests for the negotiation FSM and the conversion cascade.**

---

## 6. Replication Checklist (smallest-viable first)

1. **Inquiry core + intake.** Create `inquiries` with `submission_type/deal_type/form_path`, `form_data JSONB`, `submitted_by`, `prospect_*`. Build the 6-path intake wizard (RHF + zod). One status field only: **`proposal_stage`** (text+CHECK or lookup) with the 10 values — skip the legacy `status` entirely.
2. **RLS + roles.** Enable RLS: admin/internal = all; dfy = own rows (SELECT/INSERT/UPDATE). Decide role checks now (RLS and/or app layer) rather than relying on RLS alone.
3. **Stage workflow with guards.** Implement `updateStage` behind a **server-side transition map**; persist `stage_history` + `stage_entered_at`; auto-advance `unopened→admin_reviewed` on first admin view. Add `StageBadge` with DFY relabeling.
4. **Proposal body + autosave.** One canonical rich-text body (plus an explicit private DFY copy only if needed). Operator editor with the 4 workflow buttons (Submit for Review → Approve → Submit to Partner / Undo Send), 1500 ms autosave, hold-to-confirm.
5. **Flat pricing.** `price_dfy` (client "Investment") + internal `price_hexona`/`price_dev` + `pricing_notes`, with role-gated editing and **server-side numeric validation**. USD; decide cents-vs-dollars explicitly.
6. **Public share view (fix the gap first).** Tokenized read-only `/p/[token]` with an **explicit public RLS policy or service-role read**; add **expiry + revoke** from day one. Client-side PDF export. (Optionally add a real accept/sign action — none exists today.)
7. **Deliverables + negotiation FSM.** `proposal_deliverables` (design hierarchy + blueprint linkage in from the start; model "pending review" price explicitly). Port the **per-line `change_status` FSM verbatim** (server-enforced, incl. bulk paths) and the inquiry-level `deliverables_status` workflow. **Enforce the "all lines resolved" final-approve guard on the server.** One canonical line-sum formula (decide the `counter_price` rule once).
8. **Append-only deliverable history + diff UI** (race-safe versioning; counter diffs; timeline).
9. **AI extraction** (config-driven model + a single shared prompt; graceful degrade to manual).
10. **Acceptance + conversion.** Mark Won/Lost; **one** convert-to-project implementation that is transactional (rollback) + idempotent, copies the right deliverable columns (incl. price w/ the counter-accepted rule), and generates milestones from the payment structure (validate custom % = 100 server-side).
11. **Reminder/follow-up (build the schema!).** Create the reminder/snooze/escalation columns, pick **one** stale threshold, give `notifications` an `inquiry_id` FK for clean dedup, then wire the DFY banner + dialog + the admin stale-dashboard (the queries already exist).
12. **Cron + notifications.** Schedule the expiry job with fail-closed auth. Wire the proposal notification set (created/ready/sent/won/lost/escalation).
13. **Tests** for the negotiation FSM and the conversion cascade before layering polish.
14. **Skip entirely:** the modal conversion components, the admin update panel as a separate stack, the parse-deliverables HTTP route, `inquiry_comments`, per-deliverable comments (unless actually wanted), and the dual blueprint linkage.

---

*Compiled from migrations, server actions, `lib/api`, route handlers, and React components, with two "missing-schema/policy" findings verified by direct repo-wide search. Anything described as "not in repo" may still exist in the live database out-of-band; treat those as the first things to confirm against the running system.*
